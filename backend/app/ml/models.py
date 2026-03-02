import os
import joblib
import numpy as np
import hashlib
import pandas as pd

SAVED_MODELS_DIR = os.path.join(os.path.dirname(__file__), 'saved_models')

# Load Models (Lazy loading pattern for memory efficiency)
_models = {}

def get_model(name: str):
    if name not in _models:
        model_path = os.path.join(SAVED_MODELS_DIR, f"{name}_model.joblib")
        if os.path.exists(model_path):
            _models[name] = joblib.load(model_path)
        else:
            return None
    return _models[name]

def _deterministic_hash(seed_str: str, num_features: int, mean: float, std: float) -> list:
    """Generate deterministic pseudorandom features based on file path/string"""
    h = int(hashlib.md5(seed_str.encode('utf-8')).hexdigest(), 16)
    np.random.seed(h % (2**32 - 1))
    return np.random.normal(mean, std, num_features).tolist()

def evaluate_voice(audio_path: str):
    """Voice Analysis using deterministic feature extraction and RF Model"""
    model = get_model('voice')
    if not model:
        return 0.5, 0.2
        
    # No real acoustic features available from this path — return neutral score
    # Real feature extraction requires librosa on the actual audio file (done in the API route)
    if audio_path is None or audio_path.startswith('dummy'):
        return 0.5, 0.3

    # If a feature dict/list was passed via audio_path kwarg workaround, handle it
    features = audio_path if isinstance(audio_path, (list, np.ndarray)) else None
    if features is None:
        return 0.5, 0.3

    feature_names = ['MDVP:Fo(Hz)', 'MDVP:Fhi(Hz)', 'MDVP:Flo(Hz)', 'MDVP:Jitter(%)',
                     'MDVP:Jitter(Abs)', 'MDVP:RAP', 'MDVP:PPQ', 'Jitter:DDP',
                     'MDVP:Shimmer', 'MDVP:Shimmer(dB)', 'Shimmer:APQ3', 'Shimmer:APQ5',
                     'MDVP:APQ', 'Shimmer:DDA', 'NHR', 'HNR', 'RPDE', 'DFA',
                     'spread1', 'spread2', 'D2', 'PPE']
    X_input = pd.DataFrame([features], columns=feature_names)

    prob = model.predict_proba(X_input)[0][1]
    uncertainty = 1.0 - max(model.predict_proba(X_input)[0])
    return float(prob), float(uncertainty)

def evaluate_keystroke(payload: dict):
    """Keystroke Analysis"""
    model = get_model('keystroke')
    if not model:
        return 0.5, 0.2
    # Fallback to completely healthy baseline distribution if no specifics given
    dwell_mean = payload.get('mean_dwell_time', 80.0)
    dwell_std = payload.get('std_dwell_time', 15.0)
    flight_mean = payload.get('mean_flight_time', 200.0)
    flight_std = payload.get('std_flight_time', 30.0)
    error_rate = payload.get('error_rate', 0.01)
    
    features = pd.DataFrame([[dwell_mean, dwell_std, flight_mean, flight_std, error_rate]],
                            columns=['mean_dwell_time', 'std_dwell_time',
                                     'mean_flight_time', 'std_flight_time', 'error_rate'])
    
    prob = model.predict_proba(features)[0][1]
    uncertainty = 1.0 - max(model.predict_proba(features)[0])
    return float(prob), float(max(0.05, uncertainty))

def evaluate_mouse(payload: dict):
    """Mouse Analysis"""
    model = get_model('mouse')
    if not model:
        return 0.5, 0.2
    # Fallback to healthy baseline values
    path_len = payload.get('path_length', 1000.0)
    mov_time = payload.get('movement_time', 2.0)
    avg_vel = payload.get('average_velocity', path_len / mov_time)
    vel_jitter = payload.get('velocity_jitter', 50.0)
    dir_changes = payload.get('direction_changes', 5)
    
    features = pd.DataFrame([[path_len, mov_time, avg_vel, vel_jitter, dir_changes]],
                            columns=['path_length', 'movement_time', 'average_velocity',
                                     'velocity_jitter', 'direction_changes'])
    
    prob = model.predict_proba(features)[0][1]
    uncertainty = 1.0 - max(model.predict_proba(features)[0])
    return float(prob), float(max(0.05, uncertainty))

def evaluate_tremor(video_path: str):
    """Tremor Tracking sequence model"""
    model = get_model('tremor')
    if not model:
        return 0.5, 0.2
    # No real video tracking features available — return neutral score
    # Real feature extraction requires optical flow analysis on the actual video
    if video_path is None or video_path.startswith('dummy'):
        return 0.5, 0.3

    # Accept pre-extracted features passed as a list [peak_freq, amplitude, entropy]
    features = video_path if isinstance(video_path, (list, np.ndarray)) else None
    if features is None:
        return 0.5, 0.3

    features = pd.DataFrame([features],
                            columns=['peak_frequency_hz', 'amplitude_mean', 'spectral_entropy'])
    prob = model.predict_proba(features)[0][1]
    uncertainty = 1.0 - max(model.predict_proba(features)[0])
    return float(prob), float(max(0.05, uncertainty))

def evaluate_handwriting(payload: dict):
    """Handwriting/Spiral test analysis"""
    model = get_model('handwriting')
    if not model:
        return 0.5, 0.2
    # Fallback to healthy baseline values
    velocity = payload.get('drawing_velocity', 35.0)
    air_time = payload.get('air_time', 0.2)
    deviation = payload.get('layout_deviation', 20.0)
    pressure_var = payload.get('pressure_variation', 3.0)
    
    features = pd.DataFrame([[velocity, air_time, deviation, pressure_var]],
                            columns=['drawing_velocity', 'air_time',
                                     'layout_deviation', 'pressure_variation'])
    
    prob = model.predict_proba(features)[0][1]
    uncertainty = 1.0 - max(model.predict_proba(features)[0])
    return float(prob), float(max(0.05, uncertainty))


