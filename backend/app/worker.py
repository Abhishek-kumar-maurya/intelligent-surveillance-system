"""Redis Streams worker skeleton. The prototype's HTTP ingest path performs correlation synchronously;
this worker is the scale-out seam for production event processing."""
import asyncio, json, os
from redis.asyncio import Redis

STREAM='detection.events'
GROUP='event-processors'
CONSUMER=os.getenv('WORKER_NAME','worker-1')

async def main():
    r=Redis.from_url(os.getenv('REDIS_URL','redis://localhost:6379/0'),decode_responses=True)
    try:
        try: await r.xgroup_create(STREAM,GROUP,id='0',mkstream=True)
        except Exception: pass
        while True:
            rows=await r.xreadgroup(GROUP,CONSUMER,{STREAM:'>'},count=10,block=1000)
            for _,messages in rows:
                for msg_id,data in messages:
                    # Production extension point: persist/correlate here, then ACK.
                    await r.xack(STREAM,GROUP,msg_id)
    finally: await r.aclose()

if __name__=='__main__': asyncio.run(main())
