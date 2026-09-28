from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from app.core.config import get_settings

url=get_settings().database_url
if url.startswith('sqlite+aiosqlite://'):
    url=url.replace('sqlite+aiosqlite://','sqlite://',1)
elif url.startswith('postgresql+asyncpg://'):
    url=url.replace('postgresql+asyncpg://','postgresql+psycopg://',1)
engine=create_engine(url, future=True, connect_args={'check_same_thread':False} if url.startswith('sqlite') else {})
SessionLocal=sessionmaker(engine, class_=Session, expire_on_commit=False)
class Base(DeclarativeBase): pass
def get_db():
    with SessionLocal() as session:
        yield session
