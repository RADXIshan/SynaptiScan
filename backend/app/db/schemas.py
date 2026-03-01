from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# --- USER SCHEMAS ---
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    data_consent: bool = True

class UserRead(UserBase):
    id: int
    is_active: bool
    data_consent: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None


# --- SCREENING & MODALITY SCHEMAS ---
class ModalityResultBase(BaseModel):
    modality_type: str
    score: Optional[float] = None
    uncertainty: Optional[float] = None
    raw_data_path: Optional[str] = None

class ModalityResultCreate(ModalityResultBase):
    pass

class ModalityResultRead(ModalityResultBase):
    id: int
    session_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class ScreeningSessionBase(BaseModel):
    overall_risk_score: Optional[float] = None
    notes: Optional[str] = None

class ScreeningSessionCreate(ScreeningSessionBase):
    pass

class ScreeningSessionRead(ScreeningSessionBase):
    id: int
    user_id: int
    created_at: datetime
    results: List[ModalityResultRead] = []
    
    class Config:
        from_attributes = True
