from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import models, schemas
from ..db.database import get_db
from .auth import get_current_user
from typing import List

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
        
    recent_sessions = db.query(models.ScreeningSession).filter(
        models.ScreeningSession.user_id == current_user.id
    ).order_by(models.ScreeningSession.created_at.desc()).limit(5).all()
    
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
        "modality_breakdown": modality_breakdown,
        "trend": trend
    }
