from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Consents
    data_consent = Column(Boolean, default=False)
    
    sessions = relationship("ScreeningSession", back_populates="user")


class ScreeningSession(Base):
    __tablename__ = "screening_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    overall_risk_score = Column(Float, nullable=True) # Normalized 0.0 - 1.0 risk score
    notes = Column(Text, nullable=True)
    
    user = relationship("User", back_populates="sessions")
    results = relationship("ModalityResult", back_populates="session", cascade="all, delete-orphan")


class ModalityResult(Base):
    __tablename__ = "modality_results"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("screening_sessions.id"))
    modality_type = Column(String, index=True) # e.g., "keystroke", "mouse", "voice", "tremor", "handwriting"
    score = Column(Float, nullable=True) # The PD-likeness score for this modality
    uncertainty = Column(Float, nullable=True) # Model's uncertainty (confidence inverse)
    raw_data_path = Column(String, nullable=True) # Link to stored audio/video/json blobs
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("ScreeningSession", back_populates="results")
