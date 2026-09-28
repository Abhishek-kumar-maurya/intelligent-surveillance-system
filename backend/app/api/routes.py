from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select, func
from app.db.session import get_db
from app.models import User, Camera, WatchlistEntry, DetectionEvent, Alert, AuditLog
from app.schemas import *
from app.services.auth import create_access_token, get_current_user, verify_password, require_roles, decode_token
from app.services.events import process_detection, event_to_dict, alert_to_dict
from app.services.realtime import manager
from app.core.config import get_settings

router=APIRouter(); settings=get_settings()

async def publish_detection_stream(event):
    try:
        from redis.asyncio import Redis
        r=Redis.from_url(settings.redis_url, decode_responses=True)
        await r.xadd('detection.events', {'event_id':event.event_id,'camera_id':str(event.camera_id),'entity_identifier':event.entity_identifier or ''}, maxlen=10000, approximate=True)
        await r.aclose()
    except Exception:
        pass

@router.post('/auth/login',response_model=TokenResponse)
def login(payload:LoginRequest,db=Depends(get_db)):
    user=db.scalar(select(User).where(User.email==payload.email.lower().strip()))
    if not user or not verify_password(payload.password,user.password_hash):raise HTTPException(401,'Invalid email or password')
    return TokenResponse(access_token=create_access_token(user))
@router.get('/auth/me',response_model=UserOut)
def me(user=Depends(get_current_user)):return user

@router.get('/cameras',response_model=list[CameraOut])
def cameras(q:Optional[str]=None,status:Optional[str]=None,db=Depends(get_db),user=Depends(get_current_user)):
    stmt=select(Camera).order_by(Camera.id)
    if q:stmt=stmt.where((Camera.name.ilike(f'%{q}%'))|(Camera.camera_code.ilike(f'%{q}%')))
    if status:stmt=stmt.where(Camera.status==status.upper())
    return list(db.scalars(stmt).all())
@router.post('/cameras',response_model=CameraOut,status_code=201)
def create_camera(payload:CameraCreate,db=Depends(get_db),user=Depends(require_roles('admin'))):
    if db.scalar(select(Camera).where(Camera.camera_code==payload.camera_code)):raise HTTPException(409,'Camera code already exists')
    camera=Camera(**payload.model_dump(),status='OFFLINE');db.add(camera);db.add(AuditLog(actor_id=user.id,action='camera.created',resource_type='camera',resource_id=payload.camera_code,after_state=payload.model_dump()));db.commit();db.refresh(camera);return camera
@router.patch('/cameras/{camera_id}/status',response_model=CameraOut)
async def camera_status(camera_id:int,status:str,db=Depends(get_db),user=Depends(require_roles('admin'))):
    if status.upper() not in {'ONLINE','OFFLINE','DEGRADED'}:raise HTTPException(400,'Invalid status')
    camera=db.get(Camera,camera_id)
    if not camera:raise HTTPException(404,'Camera not found')
    camera.status=status.upper();camera.last_heartbeat=datetime.now(timezone.utc);db.commit();db.refresh(camera);await manager.broadcast({'type':'camera.status.changed','data':{'id':camera.id,'status':camera.status}});return camera
@router.post('/cameras/{camera_id}/heartbeat',response_model=CameraOut)
def heartbeat(camera_id:int,db=Depends(get_db)):
    camera=db.get(Camera,camera_id)
    if not camera:raise HTTPException(404,'Camera not found')
    camera.last_heartbeat=datetime.now(timezone.utc);camera.status='ONLINE';db.commit();db.refresh(camera);return camera
@router.get('/stats/cameras',response_model=CameraStats)
def camera_stats(db=Depends(get_db),user=Depends(get_current_user)):
    total=db.scalar(select(func.count(Camera.id))) or 0
    return CameraStats(total=total,online=db.scalar(select(func.count(Camera.id)).where(Camera.status=='ONLINE')) or 0,degraded=db.scalar(select(func.count(Camera.id)).where(Camera.status=='DEGRADED')) or 0,offline=db.scalar(select(func.count(Camera.id)).where(Camera.status=='OFFLINE')) or 0)

@router.get('/watchlist',response_model=list[WatchlistOut])
def watchlist(db=Depends(get_db),user=Depends(get_current_user)):return list(db.scalars(select(WatchlistEntry).order_by(WatchlistEntry.id.desc())).all())
@router.post('/watchlist',response_model=WatchlistOut,status_code=201)
def create_watchlist(payload:WatchlistCreate,db=Depends(get_db),user=Depends(require_roles('admin'))):
    if db.scalar(select(WatchlistEntry).where(WatchlistEntry.identifier==payload.identifier,WatchlistEntry.entity_type==payload.entity_type)):raise HTTPException(409,'Watchlist identifier already exists')
    entry=WatchlistEntry(**payload.model_dump());db.add(entry);db.commit();db.refresh(entry);return entry

def _alert_to_out(alert: Alert, db) -> AlertOut:
    event = db.get(DetectionEvent, alert.detection_event_id) if alert.detection_event_id else None
    camera = db.get(Camera, event.camera_id) if event and event.camera_id else None
    return AlertOut(
        id=alert.id,
        detection_event_id=alert.detection_event_id,
        watchlist_entry_id=alert.watchlist_entry_id,
        severity=alert.severity,
        status=alert.status,
        message=alert.message,
        created_at=alert.created_at,
        acknowledged_at=alert.acknowledged_at,
        resolved_at=alert.resolved_at,
        camera_code=camera.camera_code if camera else None,
        camera_name=camera.name if camera else None,
        vehicle_number=event.vehicle_number or event.entity_identifier if event else None,
        latitude=event.latitude if event else None,
        longitude=event.longitude if event else None,
        confidence=event.confidence if event else None,
    )

@router.post('/events/ingest', response_model=EventOut)
async def ingest_event(payload: DetectionIn, db=Depends(get_db)):
    try:
        event, alerts, duplicate = process_detection(db, payload)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    camera = db.get(Camera, event.camera_id)
    if not duplicate:
        await publish_detection_stream(event)
        for alert in alerts:
            await manager.broadcast({'type': 'alert.created', 'data': alert_to_dict(alert, event, camera)})
        await manager.broadcast({'type': 'detection.created', 'data': event_to_dict(event)})
    return EventOut(
        id=event.id,
        event_id=event.event_id,
        camera_id=event.camera_id,
        camera_code=camera.camera_code if camera else None,
        camera_name=camera.name if camera else None,
        event_type=event.event_type,
        vehicle_number=event.vehicle_number,
        entity_identifier=event.entity_identifier,
        confidence=event.confidence,
        latitude=event.latitude,
        longitude=event.longitude,
        timestamp=event.timestamp,
    )

@router.get('/events', response_model=list[EventOut])
def events(identifier: Optional[str] = None, limit: int = Query(50, ge=1, le=200), db=Depends(get_db), user=Depends(get_current_user)):
    stmt = (
        select(DetectionEvent, Camera)
        .outerjoin(Camera, DetectionEvent.camera_id == Camera.id)
        .order_by(DetectionEvent.timestamp.desc())
        .limit(limit)
    )
    if identifier:
        clean_id = identifier.strip().upper()
        stmt = stmt.where(
            (func.upper(DetectionEvent.entity_identifier) == clean_id) |
            (func.upper(DetectionEvent.vehicle_number) == clean_id)
        )
    rows = db.execute(stmt).all()
    results = []
    for event, camera in rows:
        results.append(EventOut(
            id=event.id,
            event_id=event.event_id,
            camera_id=event.camera_id,
            camera_code=camera.camera_code if camera else None,
            camera_name=camera.name if camera else None,
            event_type=event.event_type,
            vehicle_number=event.vehicle_number,
            entity_identifier=event.entity_identifier,
            confidence=event.confidence,
            latitude=event.latitude,
            longitude=event.longitude,
            timestamp=event.timestamp,
        ))
    return results

@router.get('/alerts', response_model=list[AlertOut])
def alerts(status: Optional[str] = None, db=Depends(get_db), user=Depends(get_current_user)):
    stmt = (
        select(Alert, DetectionEvent, Camera)
        .outerjoin(DetectionEvent, Alert.detection_event_id == DetectionEvent.id)
        .outerjoin(Camera, DetectionEvent.camera_id == Camera.id)
        .order_by(Alert.created_at.desc())
        .limit(100)
    )
    if status:
        stmt = stmt.where(Alert.status == status.upper())
    rows = db.execute(stmt).all()
    results = []
    for alert, event, camera in rows:
        results.append(AlertOut(
            id=alert.id,
            detection_event_id=alert.detection_event_id,
            watchlist_entry_id=alert.watchlist_entry_id,
            severity=alert.severity,
            status=alert.status,
            message=alert.message,
            created_at=alert.created_at,
            acknowledged_at=alert.acknowledged_at,
            resolved_at=alert.resolved_at,
            camera_code=camera.camera_code if camera else None,
            camera_name=camera.name if camera else None,
            vehicle_number=event.vehicle_number or event.entity_identifier if event else None,
            latitude=event.latitude if event else None,
            longitude=event.longitude if event else None,
            confidence=event.confidence if event else None,
        ))
    return results

@router.patch('/alerts/{alert_id}/acknowledge', response_model=AlertOut)
async def acknowledge(alert_id: int, db=Depends(get_db), user=Depends(get_current_user)):
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(404, 'Alert not found')
    alert.status = 'ACKNOWLEDGED'
    alert.acknowledged_at = datetime.now(timezone.utc)
    alert.acknowledged_by = user.id
    db.commit()
    db.refresh(alert)
    await manager.broadcast({'type': 'alert.updated', 'data': {'id': alert.id, 'status': alert.status}})
    return _alert_to_out(alert, db)

@router.patch('/alerts/{alert_id}/resolve', response_model=AlertOut)
async def resolve(alert_id: int, db=Depends(get_db), user=Depends(get_current_user)):
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(404, 'Alert not found')
    alert.status = 'RESOLVED'
    alert.resolved_at = datetime.now(timezone.utc)
    alert.resolved_by = user.id
    db.commit()
    db.refresh(alert)
    await manager.broadcast({'type': 'alert.updated', 'data': {'id': alert.id, 'status': alert.status}})
    return _alert_to_out(alert, db)

@router.get('/entities/{identifier}/movement', response_model=list[MovementPoint])
def movement(identifier: str, db=Depends(get_db), user=Depends(get_current_user)):
    clean_id = identifier.strip().upper()
    rows = db.execute(
        select(DetectionEvent, Camera)
        .join(Camera, Camera.id == DetectionEvent.camera_id)
        .where(
            (func.upper(DetectionEvent.entity_identifier) == clean_id) |
            (func.upper(DetectionEvent.vehicle_number) == clean_id)
        )
        .order_by(DetectionEvent.timestamp)
    ).all()
    return [
        MovementPoint(
            camera_id=c.id,
            camera_code=c.camera_code,
            camera_name=c.name,
            latitude=e.latitude,
            longitude=e.longitude,
            timestamp=e.timestamp,
            confidence=e.confidence
        )
        for e, c in rows
    ]

@router.get('/health')
def health():
    return {'status': 'ok', 'service': 'okdriver-api'}

@router.websocket('/ws/operations')
async def operations_ws(websocket:WebSocket,token:Optional[str]=None):
    if not token:await websocket.close(code=1008);return
    try:user_id=int(decode_token(token)['sub'])
    except Exception:await websocket.close(code=1008);return
    await manager.connect(user_id,websocket)
    try:
        while True:await websocket.receive_text()
    except WebSocketDisconnect:await manager.disconnect(user_id,websocket)
