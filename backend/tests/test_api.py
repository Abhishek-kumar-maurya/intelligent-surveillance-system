import os
os.environ['DATABASE_URL']='sqlite:///./test_okdriver.db';os.environ['SECRET_KEY']='test-secret-key-please-use-32-bytes-long';os.environ['CORS_ORIGINS']='http://testserver'
from fastapi.testclient import TestClient
from sqlalchemy import select
from app.main import app
from app.db.session import Base,engine,SessionLocal
from app.models import User,Camera,WatchlistEntry,DetectionEvent,Alert
from app.services.auth import hash_password

def setup_module():
    Base.metadata.drop_all(engine);Base.metadata.create_all(engine)
    with SessionLocal() as db:
        db.add_all([User(email='admin@example.com',password_hash=hash_password('Admin@123'),role='admin'),User(email='operator@example.com',password_hash=hash_password('Operator@123'),role='operator'),Camera(camera_code='C001',name='Test Junction',department='Traffic',latitude=23.02,longitude=72.57,status='ONLINE',stream_reference='traffic-001'),WatchlistEntry(identifier='GJ01XX0001',entity_type='vehicle',category='blacklisted',status='ACTIVE',description='test')]);db.commit()

def teardown_module():
    Base.metadata.drop_all(engine)

def token(client,email,pw):return client.post('/api/v1/auth/login',json={'email':email,'password':pw}).json()['access_token']

def test_end_to_end_alert_and_dedupe():
    with TestClient(app) as c:
        h={'Authorization':f'Bearer {token(c,"admin@example.com","Admin@123")}' }
        assert c.get('/api/v1/cameras',headers=h).status_code==200
        event={'event_id':'evt-test-1','camera_id':1,'event_type':'ANPR','vehicle_number':'GJ01XX0001','entity_identifier':'GJ01XX0001','confidence':.96,'vehicle_type':'car','timestamp':'2026-09-27T00:00:00Z','raw_payload':{}}
        assert c.post('/api/v1/events/ingest',json=event).status_code==200
        assert c.post('/api/v1/events/ingest',json=event).status_code==200
        assert len(c.get('/api/v1/alerts',headers=h).json())==1
        assert len(c.get('/api/v1/events?identifier=GJ01XX0001',headers=h).json())==1
        assert len(c.get('/api/v1/entities/GJ01XX0001/movement',headers=h).json())==1

def test_operator_cannot_create_camera():
    with TestClient(app) as c:
        h={'Authorization':f'Bearer {token(c,"operator@example.com","Operator@123")}' }
        payload={'camera_code':'C999','name':'Forbidden','department':'Traffic','latitude':1,'longitude':1,'camera_type':'traffic','source_protocol':'RTSP','stream_reference':'x','zone':'x'}
        assert c.post('/api/v1/cameras',json=payload,headers=h).status_code==403
