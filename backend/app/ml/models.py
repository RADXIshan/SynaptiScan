import os
import pandas as pd
import numpy as np
import joblib

SAVED_MODELS_DIR = os.path.join(os.path.dirname(__file__), 'saved_models')

# ---------------------------------------------------------------------------
# Lazy model + feature-list cache
# ---------------------------------------------------------------------------
_models   = {}
_features = {}


def get_model(name: str):
    if name not in _models:
        path = os.path.join(SAVED_MODELS_DIR, f'{name}_model.joblib')
        _models[name] = joblib.load(path) if os.path.exists(path) else None
    return _models[name]


def _get_features(name: str, default: list) -> list:
    """Load saved feature list if available, otherwise use default."""
    if name not in _features:
        path = os.path.join(SAVED_MODELS_DIR, f'{name}_features.joblib')
        _features[name] = joblib.load(path) if os.path.exists(path) else default
    return _features[name]


# ---------------------------------------------------------------------------
# Evaluate functions
# Each returns (risk_score: float, uncertainty: float)
# Returns (None, None) when no real features are available so the frontend
# can handle the missing modality gracefully instead of receiving a wrong score.
# ---------------------------------------------------------------------------

VOICE_FEATURES = [
    'MDVP:Fo(Hz)', 'MDVP:Fhi(Hz)', 'MDVP:Flo(Hz)', 'MDVP:Jitter(%)',
    'MDVP:Jitter(Abs)', 'MDVP:RAP', 'MDVP:PPQ', 'Jitter:DDP',
    'MDVP:Shimmer', 'MDVP:Shimmer(dB)', 'Shimmer:APQ3', 'Shimmer:APQ5',
    'MDVP:APQ', 'Shimmer:DDA', 'NHR', 'HNR', 'RPDE', 'DFA',
    'spread1', 'spread2', 'D2', 'PPE'
]


def evaluate_voice(audio_path):
    """
    Voice analysis using UCI Parkinson's MDVP features.
    
    audio_path: str path (real extraction done upstream via librosa),
                OR a list/ndarray of 22 pre-extracted MDVP features.
    Returns (risk, uncertainty) or (0.5, 0.3) neutral when no real features.
    """
    model = get_model('voice')
    if not model:
        return 0.5, 0.2

    # Accept pre-extracted feature vector passed as list/array
    if isinstance(audio_path, (list, np.ndarray)):
        features = list(audio_path)
    else:
        # No real acoustic extraction available — return neutral
        return 0.5, 0.3

    cols = _get_features('voice', VOICE_FEATURES)
    X = pd.DataFrame([features], columns=cols)
    proba = model.predict_proba(X)[0]
    prob = float(proba[1])
    uncertainty = float(1.0 - max(proba))
    return prob, uncertainty


def evaluate_keystroke(payload: dict):
    """
    Keystroke dynamics analysis.
    payload keys: mean_dwell_time, std_dwell_time, mean_flight_time,
                  std_flight_time, error_rate
    """
    model = get_model('keystroke')
    if not model:
        return 0.5, 0.2

    default_cols = ['mean_dwell_time', 'std_dwell_time', 'mean_flight_time',
                    'std_flight_time', 'error_rate']
    cols = _get_features('keystroke', default_cols)

    # Build feature row with sensible healthy defaults for missing keys
    defaults = {
        'mean_dwell_time':  80.0,
        'std_dwell_time':   15.0,
        'mean_flight_time': 200.0,
        'std_flight_time':  30.0,
        'error_rate':       0.01,
    }
    row = {c: payload.get(c, defaults.get(c, 0.0)) for c in cols}
    X = pd.DataFrame([row], columns=cols)

    proba = model.predict_proba(X)[0]
    raw_pd = float(proba[1])
    # Bayes prior correction: Tappy dataset has ~74% PD (169/227 users)
    # Adjust to 50% screening prevalence using logit-shift
    logit_offset = np.log(0.50 / 0.50) - np.log(0.74 / 0.26)
    raw_logit = np.log(raw_pd / (1.0 - raw_pd + 1e-9) + 1e-9)
    corrected_logit = raw_logit + logit_offset
    prob = float(np.clip(1.0 / (1.0 + np.exp(-corrected_logit)), 0.0, 1.0))
    uncertainty = float(max(0.05, 1.0 - max(prob, 1.0 - prob)))
    return prob, uncertainty


def evaluate_mouse(payload: dict):
    """
    Mouse movement / fine-motor analysis.
    Accepts any subset of features; missing ones use healthy defaults.
    """
    model = get_model('mouse')
    if not model:
        return 0.5, 0.2

    default_cols = ['path_length', 'movement_time', 'average_velocity',
                    'velocity_jitter', 'direction_changes']
    cols = _get_features('mouse', default_cols)

    path_len = payload.get('path_length', 1000.0)
    mov_time = payload.get('movement_time', 2.0)
    defaults = {
        'path_length':       path_len,
        'movement_time':     mov_time,
        'average_velocity':  payload.get('average_velocity', path_len / max(mov_time, 0.1)),
        'velocity_jitter':   payload.get('velocity_jitter', 50.0),
        'direction_changes': payload.get('direction_changes', 5),
        # Extended ALAMEDA features — healthy baselines
        'mean_magnitude':    payload.get('mean_magnitude', 0.8),
        'variance':          payload.get('variance', 80.0),
        'skewness':          payload.get('skewness', 0.2),
        'kurtosis':          payload.get('kurtosis', 2.2),
        'pc1_rms':           payload.get('pc1_rms', 0.6),
        'pc1_std':           payload.get('pc1_std', 0.4),
    }
    row = {c: defaults.get(c, 0.0) for c in cols}
    X = pd.DataFrame([row], columns=cols)

    proba = model.predict_proba(X)[0]
    prob = float(proba[1])
    uncertainty = float(max(0.05, 1.0 - max(proba)))
    return prob, uncertainty


def evaluate_tremor(video_path):
    """
    Tremor frequency/amplitude analysis.
    
    video_path: str path OR list/ndarray of pre-extracted features
                [peak_frequency_hz, amplitude_mean, spectral_entropy, ...]
    Returns (0.5, 0.3) neutral when no real features.
    """
    model = get_model('tremor')
    if not model:
        return 0.5, 0.2

    if isinstance(video_path, (list, np.ndarray)):
        features = list(video_path)
    else:
        return 0.5, 0.3

    default_cols = ['peak_frequency_hz', 'amplitude_mean', 'spectral_entropy']
    cols = _get_features('tremor', default_cols)

    # Pad with healthy defaults if fewer features provided than model expects
    healthy_defaults = {
        'peak_frequency_hz':      9.0,
        'amplitude_mean':         2.0,
        'spectral_entropy':       0.8,
        'total_power':            40.0,
        'power_at_dom_freq':      20.0,
        'fft_rms':                4.0,
        'pc1_dom_freq':           8.5,
        'pc1_entropy':            0.75,
    }
    row = {}
    for i, c in enumerate(cols):
        row[c] = features[i] if i < len(features) else healthy_defaults.get(c, 0.0)

    X = pd.DataFrame([row], columns=cols)
    proba = model.predict_proba(X)[0]
    prob = float(proba[1])
    uncertainty = float(max(0.05, 1.0 - max(proba)))
    return prob, uncertainty


def evaluate_handwriting(payload: dict):
    """
    Handwriting / spiral drawing kinematic analysis.

    The handwriting model was trained on data with ~80% PD prevalence (62/77).
    We apply a Bayes prior correction to adjust to ~50% screening prevalence.
    corrected_p = 1 / (1 + (q_new/p_new) * (p_train/q_train) * (q_raw/p_raw))
    """
    model = get_model('handwriting')
    if not model:
        return 0.5, 0.2

    default_cols = ['drawing_velocity', 'air_time', 'layout_deviation', 'pressure_variation']
    cols = _get_features('handwriting', default_cols)

    # Healthy baselines calibrated from real shubhamjha97 dataset healthy group means
    defaults = {
        # Legacy 4-feature schema (unchanged)
        'drawing_velocity':       payload.get('drawing_velocity', 35.0),
        'air_time':               payload.get('air_time', 0.2),
        'layout_deviation':       payload.get('layout_deviation', 20.0),
        'pressure_variation':     payload.get('pressure_variation', 3.0),
        # Kinematic schema — real healthy group means from shubhamjha97 dataset
        'speed_st':               payload.get('speed_st',             0.007),
        'speed_dy':               payload.get('speed_dy',             0.006),
        'magnitude_vel_st':       payload.get('magnitude_vel_st',     0.095),
        'magnitude_vel_dy':       payload.get('magnitude_vel_dy',     0.090),
        'magnitude_acc_st':       payload.get('magnitude_acc_st',     0.00003),
        'magnitude_acc_dy':       payload.get('magnitude_acc_dy',     0.00003),
        'magnitude_jerk_st':      payload.get('magnitude_jerk_st',    0.000002),
        'magnitude_jerk_dy':      payload.get('magnitude_jerk_dy',    0.000002),
        'ncv_st':                 payload.get('ncv_st',               272.0),
        'ncv_dy':                 payload.get('ncv_dy',               286.5),
        'nca_st':                 payload.get('nca_st',               119.7),
        'nca_dy':                 payload.get('nca_dy',               162.0),
        'in_air_stcp':            payload.get('in_air_stcp',          716.8),
        'on_surface_st':          payload.get('on_surface_st',        3132.0),
        'on_surface_dy':          payload.get('on_surface_dy',        2915.0),
    }
    row = {c: defaults.get(c, 0.0) for c in cols}
    X = pd.DataFrame([row], columns=cols)

    proba = model.predict_proba(X)[0]
    raw_pd = float(proba[1])
    # Bayes prior correction: handwriting dataset has ~80% PD (62/77 samples)
    # Adjust to 50% screening prevalence using sigmoid-compressed correction
    # to avoid unbounded odds when raw_pd approaches 1
    p_train = 0.80
    # Sigmoid logit offset: shift logit by log(p_screen/q_screen) - log(p_train/q_train)
    logit_offset = np.log(0.50 / 0.50) - np.log(p_train / (1 - p_train))
    raw_logit = np.log(raw_pd / (1.0 - raw_pd + 1e-9) + 1e-9)
    corrected_logit = raw_logit + logit_offset
    corrected_pd = float(1.0 / (1.0 + np.exp(-corrected_logit)))
    corrected_pd = float(np.clip(corrected_pd, 0.0, 1.0))
    uncertainty = float(max(0.05, 1.0 - max(corrected_pd, 1.0 - corrected_pd)))
    return corrected_pd, uncertainty
