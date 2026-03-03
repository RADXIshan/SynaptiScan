from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from ..db import models, schemas
from ..db.database import get_db
from .auth import get_current_user
from ..ml.models import evaluate_voice, evaluate_keystroke, evaluate_mouse, evaluate_tremor, evaluate_handwriting
from typing import Optional
import json
import uuid
import os

router = APIRouter(prefix="/ingestion", tags=["ingestion"])

UPLOAD_DIR = "/tmp/synaptiscan_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/sessions", response_model=schemas.ScreeningSessionRead)
def create_session(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_session = models.ScreeningSession(user_id=current_user.id)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@router.post("/voice")
async def upload_voice(
    session_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_session = db.query(models.ScreeningSession).filter(
        models.ScreeningSession.id == session_id,
        models.ScreeningSession.user_id == current_user.id
    ).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    file_path = f"{UPLOAD_DIR}/{uuid.uuid4()}_voice.webm"
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
        
    from ..ml.features import extract_voice_features
    features_list = extract_voice_features(file_path)
    
    # evaluate_voice accepts either a path or a 22-len array
    eval_input = features_list if (features_list and len(features_list) == 22) else file_path
    score, uncertainty = evaluate_voice(eval_input)
    
    result = models.ModalityResult(
        session_id=session_id,
        modality_type="voice",
        score=score,
        uncertainty=uncertainty,
        raw_data_path=file_path
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    
    return {"status": "success", "result_id": result.id, "score": score}

@router.post("/keystroke")
async def upload_keystroke(
    session_id: int = Form(...),
    payload: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_session = db.query(models.ScreeningSession).filter(
        models.ScreeningSession.id == session_id,
        models.ScreeningSession.user_id == current_user.id
    ).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    data = json.loads(payload)
    
    # Extract features if raw keystrokes are provided
    raw_strokes = data.get('keystrokes', [])
    if raw_strokes and isinstance(raw_strokes, list):
        from ..ml.features import extract_keystroke_features
        key_features = extract_keystroke_features(raw_strokes)
        data.update(key_features)
        
    score, uncertainty = evaluate_keystroke(data)
    
    result = models.ModalityResult(
        session_id=session_id,
        modality_type="keystroke",
        score=score,
        uncertainty=uncertainty,
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    
    return {"status": "success", "result_id": result.id, "score": score}

@router.post("/mouse")
async def upload_mouse(
    session_id: int = Form(...),
    payload: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_session = db.query(models.ScreeningSession).filter(
        models.ScreeningSession.id == session_id,
        models.ScreeningSession.user_id == current_user.id
    ).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")

    data = json.loads(payload)
    
    raw_trajectory = data.get('trajectory', [])
    if raw_trajectory and isinstance(raw_trajectory, list):
        from ..ml.features import extract_mouse_features
        mouse_features = extract_mouse_features(raw_trajectory)
        data.update(mouse_features)
        
    score, uncertainty = evaluate_mouse(data)

    result = models.ModalityResult(
        session_id=session_id,
        modality_type="mouse",
        score=score,
        uncertainty=uncertainty,
    )
    db.add(result)
    db.commit()
    db.refresh(result)

    return {"status": "success", "result_id": result.id, "score": score}

@router.post("/tremor")
async def upload_tremor(
    session_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_session = db.query(models.ScreeningSession).filter(
        models.ScreeningSession.id == session_id,
        models.ScreeningSession.user_id == current_user.id
    ).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")

    file_path = f"{UPLOAD_DIR}/{uuid.uuid4()}_tremor.webm"
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    from ..ml.features import extract_tremor_features
    features_list = extract_tremor_features(file_path)
    
    eval_input = features_list if (features_list and len(features_list) == 8) else file_path
    score, uncertainty = evaluate_tremor(eval_input)

    result = models.ModalityResult(
        session_id=session_id,
        modality_type="tremor",
        score=score,
        uncertainty=uncertainty,
        raw_data_path=file_path
    )
    db.add(result)
    db.commit()
    db.refresh(result)

    return {"status": "success", "result_id": result.id, "score": score}

@router.post("/handwriting")
async def upload_handwriting(
    session_id: int = Form(...),
    payload: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_session = db.query(models.ScreeningSession).filter(
        models.ScreeningSession.id == session_id,
        models.ScreeningSession.user_id == current_user.id
    ).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")

    data = json.loads(payload)
    
    # Extract features if raw strokes are provided
    strokes = data.get('strokes', [])
    if strokes and isinstance(strokes, list):
        from ..ml.features import extract_handwriting_features
        kinematic_features = extract_handwriting_features(strokes)
        # Merge derived features into data payload for the model
        data.update(kinematic_features)

    score, uncertainty = evaluate_handwriting(data)

    result = models.ModalityResult(
        session_id=session_id,
        modality_type="handwriting",
        score=score,
        uncertainty=uncertainty,
    )
    db.add(result)
    db.commit()
    db.refresh(result)

    return {"status": "success", "result_id": result.id, "score": score}
