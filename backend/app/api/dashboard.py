from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import models, schemas
from ..db.database import get_db
from .auth import get_current_user
from typing import List
from sqlalchemy import asc

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    latest_session = db.query(models.ScreeningSession).filter(
        models.ScreeningSession.user_id == current_user.id
    ).order_by(models.ScreeningSession.created_at.desc()).all()

    # Skip sessions that have no results (abandoned/empty sessions)
    latest_session = next(
        (s for s in latest_session if s.results),
        None
    )
    
    if not latest_session:
        return {"has_data": False}
        
    results = db.query(models.ModalityResult).filter(
        models.ModalityResult.session_id == latest_session.id
    ).all()
    
    if latest_session.overall_risk_score is None and results:
        scores = [r.score for r in results if r.score is not None]
        avg_score = sum(scores) / len(scores) if scores else 0.0
        latest_session.overall_risk_score = avg_score
        db.commit()
        
    # Get extended recent sessions for trend line
    recent_sessions = db.query(models.ScreeningSession).filter(
        models.ScreeningSession.user_id == current_user.id
    ).order_by(models.ScreeningSession.created_at.desc()).limit(20).all()
    
    # Calculate baseline (the very first session)
    first_session = db.query(models.ScreeningSession).filter(
        models.ScreeningSession.user_id == current_user.id
    ).order_by(models.ScreeningSession.created_at.asc()).first()
    
    baseline_score = first_session.overall_risk_score if first_session else None
    
    trend = [{"date": s.created_at, "score": s.overall_risk_score} for s in reversed(recent_sessions)]
    
    ALL_MODALITIES = ["keystroke", "mouse", "voice", "tremor", "handwriting"]
    results_map = {r.modality_type: r.score for r in results}
    modality_breakdown = [
        {"type": m, "score": results_map.get(m, None)}
        for m in ALL_MODALITIES
    ]

    return {
        "has_data": True,
        "latest_score": latest_session.overall_risk_score,
        "baseline_score": baseline_score,
        "modality_breakdown": modality_breakdown,
        "trend": trend
    }

@router.get("/journal", response_model=List[schemas.JournalEntryRead])
def get_journal_entries(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.JournalEntry).filter(
        models.JournalEntry.user_id == current_user.id
    ).order_by(models.JournalEntry.created_at.desc()).limit(50).all()

@router.post("/journal", response_model=schemas.JournalEntryRead)
def create_journal_entry(entry: schemas.JournalEntryCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_entry = models.JournalEntry(**entry.model_dump(), user_id=current_user.id)
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry
