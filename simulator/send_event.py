import json, os, uuid
from datetime import datetime, timezone
from urllib.request import Request, urlopen

api=os.getenv('OKDRIVER_API','http://localhost:8000/api/v1/events/ingest')
payload={
  'event_id':f'demo-{uuid.uuid4()}',
  'camera_id':1,
  'event_type':'ANPR',
  'vehicle_number':'GJ01XX0001',
  'entity_identifier':'GJ01XX0001',
  'confidence':0.96,
  'vehicle_type':'car',
  'bounding_box':{'x':0.42,'y':0.28,'width':0.16,'height':0.08},
  'timestamp':datetime.now(timezone.utc).isoformat(),
  'raw_payload':{'source':'okdriver-demo-simulator','model':'deterministic-anpr'}
}
req=Request(api,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'},method='POST')
with urlopen(req,timeout=10) as response: print(response.read().decode())
