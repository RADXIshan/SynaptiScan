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

    Supported payload keys (8 features):
      mean_dwell_time, std_dwell_time, dwell_iqr      (ms)
      mean_flight_time, std_flight_time, flight_iqr   (ms)
      typing_speed                                    (chars/sec)
      error_rate                                      (0–1)

    Older payloads with only the original 5 keys are still accepted;
    the missing keys receive healthy defaults so the model doesn't over-score.
    """
    model = get_model('keystroke')
    if not model:
        return 0.5, 0.2

    default_cols = [
        'mean_dwell_time', 'std_dwell_time', 'dwell_iqr',
        'mean_flight_time', 'std_flight_time', 'flight_iqr',
        'typing_speed', 'error_rate',
    ]
    cols = _get_features('keystroke', default_cols)

    # Healthy defaults calibrated from web-typing norms.
    # dwell_iqr for a relaxed typist ~20ms; typing_speed ~6 chars/sec.
    defaults = {
        'mean_dwell_time':  80.0,
        'std_dwell_time':   15.0,
        'dwell_iqr':        20.0,
        'mean_flight_time': 185.0,
        'std_flight_time':  30.0,
        'flight_iqr':       38.0,
        'typing_speed':     6.5,
        'error_rate':       0.01,
    }
    row = {c: payload.get(c, defaults.get(c, 0.0)) for c in cols}
    X = pd.DataFrame([row], columns=cols)

    proba = model.predict_proba(X)[0]
    raw_pd = float(proba[1])

    # Bayes prior correction.
    # Tappy dataset prevalence: ~74% PD.  Real screening population: ~1–2%.
    # We correct to 5% as a conservative mid-point between clinical and general
    # screening, which avoids the model over-penalising normal healthy typing.
    p_screen = 0.05
    logit_offset = np.log(p_screen / (1 - p_screen)) - np.log(0.74 / 0.26)
    raw_logit = np.log(raw_pd / (1.0 - raw_pd + 1e-9) + 1e-9)
    corrected_logit = raw_logit + logit_offset
    prob = float(np.clip(1.0 / (1.0 + np.exp(-corrected_logit)), 0.0, 1.0))

    # Soft-clamp: due to calibration model probabilities can still saturate.
    # Squash into [0.05, 0.90] so no single ambiguous test is shown as 95%+ risk.
    prob = 0.05 + 0.85 * prob
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

    The model is trained with SMOTE (50/50 balanced classes) + isotonic calibration,
    so the raw model probability already reflects a 50% reference prevalence.
    ncv/nca values are expected in per-second rates (extract_handwriting_features
    normalises them by on-surface drawing time).
    """
    model = get_model('handwriting')
    if not model:
        return 0.5, 0.2

    default_cols = ['drawing_velocity', 'air_time', 'layout_deviation', 'pressure_variation']
    cols = _get_features('handwriting', default_cols)

    # Healthy baselines derived from the shubhamjha97 dataset after per-second normalisation.
    # ncv/nca are now per-second rates: HC raw 272 ncv / 3.132 s ≈ 87/sec.
    # PD raw 254 ncv / 1.826 s ≈ 139/sec (shorter drawing time → higher rate).
    defaults = {
        # Legacy 4-feature schema (unchanged)
        'drawing_velocity':       payload.get('drawing_velocity', 35.0),
        'air_time':               payload.get('air_time', 0.2),
        'layout_deviation':       payload.get('layout_deviation', 20.0),
        'pressure_variation':     payload.get('pressure_variation', 3.0),
        # Kinematic schema — per-second rates for ncv/nca
        'speed_st':               payload.get('speed_st',             0.007),
        'speed_dy':               payload.get('speed_dy',             0.006),
        'magnitude_vel_st':       payload.get('magnitude_vel_st',     0.090),
        'magnitude_vel_dy':       payload.get('magnitude_vel_dy',     0.085),
        'magnitude_acc_st':       payload.get('magnitude_acc_st',     0.00003),
        'magnitude_acc_dy':       payload.get('magnitude_acc_dy',     0.00003),
        'magnitude_jerk_st':      payload.get('magnitude_jerk_st',    0.000002),
        'magnitude_jerk_dy':      payload.get('magnitude_jerk_dy',    0.000002),
        # Per-second rates from real dataset HC means
        'ncv_st':                 payload.get('ncv_st',               87.0),
        'ncv_dy':                 payload.get('ncv_dy',               86.0),
        'nca_st':                 payload.get('nca_st',               37.7),
        'nca_dy':                 payload.get('nca_dy',               51.7),
        'in_air_stcp':            payload.get('in_air_stcp',          0.0),
        'on_surface_st':          payload.get('on_surface_st',        3132.0),
        'on_surface_dy':          payload.get('on_surface_dy',        2915.0),
    }
    row = {c: defaults.get(c, 0.0) for c in cols}
    X = pd.DataFrame([row], columns=cols)

    proba = model.predict_proba(X)[0]
    prob = float(proba[1])

    # No Bayes correction needed: SMOTE balanced training to 50/50 and
    # CalibratedClassifierCV (isotonic) produces well-calibrated probabilities.
    # Soft-clamp to [0.05, 0.90] to prevent extreme outputs for ambiguous inputs.
    prob = 0.05 + 0.85 * prob
    uncertainty = float(max(0.05, 1.0 - max(prob, 1.0 - prob)))
    return prob, uncertainty

def evaluate_cognition(payload: dict):
    """
    Cognition (Stroop) test analysis.
    
    Expected payload keys:
      congruent_rt_mean (ms)
      incongruent_rt_mean (ms)
      error_rate (0-1)
    """
    model = get_model('cognition')
    if not model:
        return 0.5, 0.2

    default_cols = ['congruent_rt_mean', 'incongruent_rt_mean', 'stroop_effect', 'error_rate']
    cols = _get_features('cognition', default_cols)

    # Calculate stroop effect if not provided
    c_rt = payload.get('congruent_rt_mean', 600.0)
    i_rt = payload.get('incongruent_rt_mean', c_rt + 150.0)
    s_eff = payload.get('stroop_effect', i_rt - c_rt)
    err = payload.get('error_rate', 0.03)

    row = {
        'congruent_rt_mean': c_rt,
        'incongruent_rt_mean': i_rt,
        'stroop_effect': s_eff,
        'error_rate': err
    }
    
    # Ensure correct column order
    row_ordered = {c: row.get(c, 0.0) for c in cols}
    X = pd.DataFrame([row_ordered], columns=cols)

    proba = model.predict_proba(X)[0]
    prob = float(proba[1])
    
    # Soft clamp
    prob = 0.05 + 0.85 * prob
    uncertainty = float(max(0.05, 1.0 - max(proba)))
    
    return prob, uncertainty
