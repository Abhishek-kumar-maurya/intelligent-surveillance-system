from __future__ import annotations
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
import re

class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: str) -> str:
        return v.strip().lower()

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    role: str

class CameraCreate(BaseModel):
    camera_code: str = Field(min_length=2, max_length=50)
    name: str = Field(min_length=2, max_length=255)
    department: str = "Traffic"
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    camera_type: str = "traffic"
    source_protocol: str = "RTSP"
    stream_reference: str = ""
    zone: str = ""

    @field_validator("camera_code")
    @classmethod
    def clean_camera_code(cls, v: str) -> str:
        v = v.strip().upper()
        if not re.match(r'^[A-Z0-9_-]+$', v):
            raise ValueError("Camera code must contain only letters, numbers, hyphens, and underscores")
        return v

    @field_validator("name", "department", "zone")
    @classmethod
    def clean_text(cls, v: str) -> str:
        return v.strip()

class CameraOut(CameraCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str
    last_heartbeat: Optional[datetime] = None
    enabled: bool

class WatchlistCreate(BaseModel):
    entity_type: str = "vehicle"
    identifier: str = Field(min_length=2, max_length=100)
    category: str = "blacklisted"
    status: str = "ACTIVE"
    description: str = ""

    @field_validator("identifier")
    @classmethod
    def clean_identifier(cls, v: str) -> str:
        v = v.strip().upper()
        if not re.match(r'^[A-Z0-9_-]+$', v):
            raise ValueError("Identifier must contain only letters, numbers, hyphens, and underscores")
        return v

class WatchlistOut(WatchlistCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime

class DetectionIn(BaseModel):
    event_id: str = Field(min_length=3, max_length=100)
    camera_id: int
    event_type: str = "ANPR"
    vehicle_number: Optional[str] = None
    entity_identifier: Optional[str] = None
    confidence: float = Field(ge=0, le=1)
    vehicle_type: Optional[str] = None
    bounding_box: Optional[dict] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    timestamp: datetime
    snapshot_url: Optional[str] = None
    raw_payload: dict = {}

class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_id: str
    camera_id: int
    camera_code: Optional[str] = None
    camera_name: Optional[str] = None
    event_type: str
    vehicle_number: Optional[str] = None
    entity_identifier: Optional[str] = None
    confidence: float
    latitude: float
    longitude: float
    timestamp: datetime

class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    detection_event_id: int
    watchlist_entry_id: int
    severity: str
    status: str
    message: str
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    camera_code: Optional[str] = None
    camera_name: Optional[str] = None
    vehicle_number: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    confidence: Optional[float] = None

class CameraStats(BaseModel):
    total: int
    online: int
    degraded: int
    offline: int

class MovementPoint(BaseModel):
    camera_id: int
    camera_code: str
    camera_name: str
    latitude: float
    longitude: float
    timestamp: datetime
    confidence: float

