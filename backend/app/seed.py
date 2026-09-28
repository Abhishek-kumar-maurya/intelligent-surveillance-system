from datetime import datetime,timezone,timedelta
from sqlalchemy import select
from app.db.session import Base,engine,SessionLocal
from app.models import User,Camera,WatchlistEntry,DetectionEvent
from app.services.auth import hash_password

def seed():
    # ⚠️  DEV / DEMO ONLY — these accounts and passwords are for local development
    # and hiring demos only. They must NEVER be used in a production environment.
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if not db.scalar(select(User).where(User.email=='admin@example.com')):db.add_all([User(email='admin@example.com',password_hash=hash_password('Admin@123'),role='admin'),User(email='operator@example.com',password_hash=hash_password('Operator@123'),role='operator')])
        cameras=[('C001','Ahmedabad Junction',23.0225,72.5714,'traffic-001'),('C002','RTO Checkpoint',23.0300,72.5800,'traffic-002'),('C003','SG Highway',23.0750,72.5250,'traffic-003')]
        for code,name,lat,lon,stream in cameras:
            if not db.scalar(select(Camera).where(Camera.camera_code==code)):db.add(Camera(camera_code=code,name=name,department='Traffic',latitude=lat,longitude=lon,camera_type='traffic',source_protocol='RTSP',stream_reference=stream,status='ONLINE',zone='Ahmedabad'))
        if not db.scalar(select(WatchlistEntry).where(WatchlistEntry.identifier=='GJ01XX0001')):db.add(WatchlistEntry(entity_type='vehicle',identifier='GJ01XX0001',category='blacklisted',status='ACTIVE',description='Synthetic hiring-demo record'))
        db.commit();cams={c.camera_code:c for c in db.scalars(select(Camera)).all()}
        if not db.scalar(select(DetectionEvent).where(DetectionEvent.entity_identifier=='GJ01XX0001')):
            now=datetime.now(timezone.utc)
            for idx,(code,minutes) in enumerate([('C001',40),('C002',20),('C003',5)],1):
                c=cams[code];db.add(DetectionEvent(event_id=f'seed-{idx}',camera_id=c.id,event_type='ANPR',vehicle_number='GJ01XX0001',entity_identifier='GJ01XX0001',confidence=.94+idx/100,vehicle_type='car',bounding_box={'x':.2,'y':.3,'width':.2,'height':.1},latitude=c.latitude,longitude=c.longitude,timestamp=now-timedelta(minutes=minutes),raw_payload={'source':'seed'}))
            db.commit()
        from app.models import Alert
        if not db.scalar(select(Alert).limit(1)):
            ev = db.scalar(select(DetectionEvent).where(DetectionEvent.entity_identifier=='GJ01XX0001').order_by(DetectionEvent.id.desc()))
            wl = db.scalar(select(WatchlistEntry).where(WatchlistEntry.identifier=='GJ01XX0001'))
            if ev and wl:
                cam = cams.get('C003')
                db.add(Alert(
                    detection_event_id=ev.id,
                    watchlist_entry_id=wl.id,
                    severity='CRITICAL',
                    status='OPEN',
                    message=f'Watchlist match: GJ01XX0001 detected at {cam.camera_code if cam else "C003"}'
                ))
                db.commit()
if __name__=='__main__':seed()

