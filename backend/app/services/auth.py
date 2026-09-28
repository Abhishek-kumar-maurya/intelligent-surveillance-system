from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from sqlalchemy import select
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.config import get_settings
from app.db.session import get_db
from app.models import User
settings=get_settings(); bearer=HTTPBearer(auto_error=False); ph=PasswordHasher()

def hash_password(password:str)->str:return ph.hash(password)
def verify_password(password:str,stored:str)->bool:
    try:return ph.verify(stored,password)
    except (VerifyMismatchError,ValueError):return False
def create_access_token(user:User)->str:
    exp=datetime.now(timezone.utc)+timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({'sub':str(user.id),'role':user.role,'exp':exp},settings.secret_key,algorithm='HS256')
def decode_token(token:str)->dict:return jwt.decode(token,settings.secret_key,algorithms=['HS256'])
def get_current_user(credentials:Optional[HTTPAuthorizationCredentials]=Depends(bearer),db=Depends(get_db)):
    if not credentials:raise HTTPException(401,'Authentication required')
    try:user_id=int(decode_token(credentials.credentials)['sub'])
    except Exception:raise HTTPException(401,'Invalid or expired token')
    user=db.get(User,user_id)
    if not user or not user.is_active:raise HTTPException(401,'Inactive or missing user')
    return user
def require_roles(*roles:str):
    def checker(user=Depends(get_current_user)):
        if user.role not in roles:raise HTTPException(403,'Insufficient permissions')
        return user
    return checker
