from sqlalchemy import select
from app.models import Camera, DetectionEvent, WatchlistEntry, Alert

def process_detection(db,payload):
    existing=db.scalar(select(DetectionEvent).where(DetectionEvent.event_id==payload.event_id))
    if existing:return existing,[],True
    camera=db.get(Camera,payload.camera_id)
    if not camera or not camera.enabled:raise ValueError('Camera does not exist or is disabled')
    identifier=payload.entity_identifier or payload.vehicle_number
    event=DetectionEvent(event_id=payload.event_id,camera_id=camera.id,event_type=payload.event_type,vehicle_number=payload.vehicle_number,entity_identifier=identifier,confidence=payload.confidence,vehicle_type=payload.vehicle_type,bounding_box=payload.bounding_box,latitude=payload.latitude if payload.latitude is not None else camera.latitude,longitude=payload.longitude if payload.longitude is not None else camera.longitude,snapshot_url=payload.snapshot_url,raw_payload=payload.raw_payload,timestamp=payload.timestamp)
    db.add(event); db.flush(); alerts=[]
    if identifier:
        match=db.scalar(select(WatchlistEntry).where(WatchlistEntry.identifier==identifier,WatchlistEntry.status=='ACTIVE'))
        if match:
            duplicate=db.scalar(select(Alert).where(Alert.detection_event_id==event.id,Alert.watchlist_entry_id==match.id))
            if not duplicate:
                alert=Alert(detection_event_id=event.id,watchlist_entry_id=match.id,severity='CRITICAL' if match.category in {'stolen','wanted'} else 'HIGH',status='OPEN',message=f'Watchlist match: {identifier} detected at {camera.camera_code}')
                db.add(alert); db.flush(); alerts.append(alert)
    db.commit(); db.refresh(event)
    return event,alerts,False

def event_to_dict(event):return {'id':event.id,'event_id':event.event_id,'camera_id':event.camera_id,'event_type':event.event_type,'vehicle_number':event.vehicle_number,'entity_identifier':event.entity_identifier,'confidence':event.confidence,'latitude':event.latitude,'longitude':event.longitude,'timestamp':event.timestamp.isoformat()}
def alert_to_dict(alert,event,camera):return {'id':alert.id,'detection_event_id':alert.detection_event_id,'watchlist_entry_id':alert.watchlist_entry_id,'severity':alert.severity,'status':alert.status,'message':alert.message,'created_at':alert.created_at.isoformat(),'camera_code':camera.camera_code,'camera_name':camera.name,'vehicle_number':event.vehicle_number or event.entity_identifier,'latitude':event.latitude,'longitude':event.longitude,'confidence':event.confidence}
