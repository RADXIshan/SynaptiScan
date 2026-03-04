import os
import io
import zipfile
import warnings

import pandas as pd
import numpy as np
import requests
import joblib
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score
from sklearn.svm import SVC
from imblearn.over_sampling import SMOTE, ADASYN
from imblearn.pipeline import Pipeline as ImbPipeline

warnings.filterwarnings('ignore')

SAVED_MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'saved_models')
os.makedirs(SAVED_MODELS_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _download(url: str, timeout: int = 60) -> bytes:
    headers = {'User-Agent': 'Mozilla/5.0 (compatible; SynaptiScan/1.0)'}
    resp = requests.get(url, timeout=timeout, headers=headers)
    resp.raise_for_status()
    return resp.content


def _save_model(model, name: str) -> None:
    path = os.path.join(SAVED_MODELS_DIR, f'{name}_model.joblib')
    joblib.dump(model, path)
    print(f"  ✓ Saved → {path}")


def _print_metrics(y_te, y_pred, y_proba=None):
    acc = accuracy_score(y_te, y_pred)
    print(f"  Accuracy: {acc:.3f}")
    if y_proba is not None:
        try:
            auc = roc_auc_score(y_te, y_proba)
            print(f"  ROC-AUC: {auc:.3f}")
        except Exception:
            pass
    print(classification_report(y_te, y_pred, target_names=['Healthy', 'PD'], zero_division=0))


def _build_ensemble(seed=42) -> VotingClassifier:
    """Soft-voting ensemble: RF + GBM + SVM. Better than any single model."""
    rf  = RandomForestClassifier(n_estimators=300, class_weight='balanced',
                                  max_depth=None, min_samples_split=3,
                                  random_state=seed, n_jobs=-1)
    gbm = GradientBoostingClassifier(n_estimators=200, learning_rate=0.05,
                                      max_depth=4, subsample=0.8,
                                      random_state=seed)
    svm = SVC(kernel='rbf', C=10, gamma='scale', probability=True,
              class_weight='balanced', random_state=seed)
    return VotingClassifier(estimators=[('rf', rf), ('gbm', gbm), ('svm', svm)],
                            voting='soft')


def _calibrated_ensemble(seed=42) -> CalibratedClassifierCV:
    """Ensemble wrapped with isotonic calibration for well-calibrated probabilities.

    CalibratedClassifierCV with method='isotonic' uses cross-validation to fit
    a monotone mapping from raw scores to accurate probabilities.  This prevents
    the model from outputting near-0 or near-1 scores for ambiguous web inputs.
    """
    base = _build_ensemble(seed)
    return CalibratedClassifierCV(base, method='isotonic', cv=3)


def _smote_pipeline(estimator) -> ImbPipeline:
    """SMOTE oversampling + RobustScaler + estimator."""
    return ImbPipeline([
        ('scaler', RobustScaler()),
        ('smote',  SMOTE(random_state=42, k_neighbors=3)),
        ('clf',    estimator),
    ])


# ===========================================================================
# 1. VOICE MODEL — GitHub mirror of UCI Parkinson's Dataset (real data)
#    Primary: github.com/Mr-Imperium/Parkinson-Disease-Pred
#    195 recordings, 22 MDVP voice features, 'status' label
# ===========================================================================

VOICE_URLS = [
    'https://raw.githubusercontent.com/Mr-Imperium/Parkinson-Disease-Pred/main/parkinsons.data',
    'https://raw.githubusercontent.com/muhammedmazen/parkinsons-disease-prediction/main/parkinsons.data',
    'https://raw.githubusercontent.com/dsacatempa/ParkinsonsDisease/main/parkinsons.data',
    # Fallback: live UCI
    'https://archive.ics.uci.edu/ml/machine-learning-databases/parkinsons/parkinsons.data',
]

VOICE_FEATURES = [
    'MDVP:Fo(Hz)', 'MDVP:Fhi(Hz)', 'MDVP:Flo(Hz)', 'MDVP:Jitter(%)',
    'MDVP:Jitter(Abs)', 'MDVP:RAP', 'MDVP:PPQ', 'Jitter:DDP',
    'MDVP:Shimmer', 'MDVP:Shimmer(dB)', 'Shimmer:APQ3', 'Shimmer:APQ5',
    'MDVP:APQ', 'Shimmer:DDA', 'NHR', 'HNR', 'RPDE', 'DFA',
    'spread1', 'spread2', 'D2', 'PPE'
]


def train_voice_model():
    print("\n[1/5] Training Voice Model — UCI Parkinson's Dataset (GitHub mirror)")
    df = None
    for url in VOICE_URLS:
        try:
            raw = _download(url, timeout=20)
            candidate = pd.read_csv(io.StringIO(raw.decode()))
            if 'status' in candidate.columns and len(candidate) > 100:
                df = candidate
                print(f"  ✓ Downloaded: {url}  shape={df.shape}")
                break
            else:
                print(f"  ✗ Wrong format: {url}")
        except Exception as e:
            print(f"  ✗ {url[:70]}… → {str(e)[:60]}")

    if df is None:
        print("  All downloads failed. Using simulated clinical distribution fallback.")
        np.random.seed(42)
        n = 500
        labels = np.random.choice([0, 1], size=n, p=[0.25, 0.75])
        pd_m = [150, 200, 100, 0.006, 0.00005, 0.003, 0.003, 0.01, 0.03, 0.3,
                0.015, 0.02, 0.02, 0.045, 0.02, 20.0, 0.5, 0.7, -5.0, 0.3, 2.5, 0.3]
        hc_m = [180, 220, 120, 0.002, 0.00001, 0.001, 0.001, 0.003, 0.01, 0.1,
                0.005, 0.01, 0.01, 0.015, 0.002, 25.0, 0.4, 0.6, -6.5, 0.2, 2.0, 0.1]
        features = np.zeros((n, 22))
        for i, y in enumerate(labels):
            mu = pd_m if y == 1 else hc_m
            features[i] = np.random.normal(mu, [abs(m)*0.15 + 1e-6 for m in mu])
        df = pd.DataFrame(features, columns=VOICE_FEATURES)
        df['status'] = labels
        df['name'] = [f'sim_{i}' for i in range(n)]

    X = df[VOICE_FEATURES]
    y = df['status']
    print(f"  Class balance: {dict(y.value_counts())}")

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

    # SMOTE + ensemble
    model = _smote_pipeline(_build_ensemble())
    model.fit(X_tr, y_tr)
    y_pred = model.predict(X_te)
    y_proba = model.predict_proba(X_te)[:, 1]
    _print_metrics(y_te, y_pred, y_proba)

    _save_model(model, 'voice')
    joblib.dump(VOICE_FEATURES, os.path.join(SAVED_MODELS_DIR, 'voice_features.joblib'))


# ===========================================================================
# 2. KEYSTROKE MODEL — PhysioNet Tappy Dataset (real data, 227 participants)
#    https://physionet.org/content/tappy/1.0.0/
# ===========================================================================

def _parse_tappy_users(raw_zip: bytes) -> dict:
    """Returns {uid: is_pd_bool}."""
    pd_map = {}
    with zipfile.ZipFile(io.BytesIO(raw_zip)) as z:
        for name in z.namelist():
            if not name.lower().endswith('.txt'):
                continue
            try:
                content = z.read(name).decode('utf-8', errors='ignore')
                user = {}
                for line in content.splitlines():
                    if ':' in line:
                        k, _, v = line.partition(':')
                        user[k.strip()] = v.strip()
                if 'Parkinsons' in user:
                    basename = os.path.basename(name)
                    uid = basename.replace('User_', '').replace('.txt', '').replace('.TXT', '')
                    pd_map[uid] = user['Parkinsons'].strip().lower() == 'true'
            except Exception:
                continue
    return pd_map


def _parse_tappy_data(raw_zip: bytes, user_pd_map: dict, max_users: int = 220) -> pd.DataFrame:
    """Aggregate per-user keystroke stats."""
    user_stats = {}
    with zipfile.ZipFile(io.BytesIO(raw_zip)) as z:
        names = [n for n in z.namelist() if n.lower().endswith('.txt')]
        processed = 0
        for name in names:
            if processed >= max_users:
                break
            try:
                basename = os.path.basename(name)
                uid = basename[:10]
                if uid not in user_pd_map:
                    continue
                raw = z.read(name).decode('utf-8', errors='ignore')
                rows = []
                for line in raw.splitlines():
                    parts = line.strip().split()
                    if len(parts) >= 8:
                        try:
                            hold   = float(parts[4])
                            flight = float(parts[7])
                            rows.append({'hold': hold, 'flight': flight})
                        except ValueError:
                            continue
                if len(rows) < 50:
                    continue
                df_u = pd.DataFrame(rows)
                df_u = df_u[(df_u['hold'] > 0) & (df_u['hold'] < 2000) &
                            (df_u['flight'] > -500) & (df_u['flight'] < 3000)]
                if len(df_u) < 30:
                    continue
                backspace_proxy = (df_u['hold'] > 500).mean()
                if uid not in user_stats:
                    user_stats[uid] = {
                        'mean_dwell_time':  df_u['hold'].mean(),
                        'std_dwell_time':   df_u['hold'].std(),
                        'mean_flight_time': df_u['flight'].mean(),
                        'std_flight_time':  df_u['flight'].std(),
                        'error_rate':       backspace_proxy,
                        'label': 1 if user_pd_map[uid] else 0,
                    }
                    processed += 1
            except Exception:
                continue
    return pd.DataFrame(list(user_stats.values()))


def train_keystroke_model():
    print("\n[2/5] Training Keystroke Model — PhysioNet Tappy Dataset")
    users_url = "https://physionet.org/files/tappy/1.0.0/Archived-users.zip"
    data_url  = "https://physionet.org/files/tappy/1.0.0/Archived-Data.zip"

    df = None
    try:
        print("  Downloading user metadata…")
        users_raw = _download(users_url, timeout=60)
        pd_map = _parse_tappy_users(users_raw)
        n_pd = sum(pd_map.values())
        print(f"  Parsed {len(pd_map)} users (PD={n_pd}, HC={len(pd_map)-n_pd})")

        print("  Downloading keystroke data (~200 MB)… this may take a minute.")
        data_raw = _download(data_url, timeout=400)
        df = _parse_tappy_data(data_raw, pd_map)
        n_pd = int(df['label'].sum())
        print(f"  Parsed {len(df)} user profiles (PD={n_pd}, HC={len(df)-n_pd})")

        # Derive additional features from Tappy data
        if df is not None and len(df) >= 40:
            # dwell IQR proxy: use std as proportional estimate (Tappy lacks per-key granularity)
            df['dwell_iqr']   = df['std_dwell_time'] * 1.35  # IQR ≈ 1.35σ for Gaussian
            df['flight_iqr']  = df['std_flight_time'] * 1.35
            # Typing speed approximation: ~4 chars/flight-time-second average
            df['typing_speed'] = np.clip(4.0 / (df['mean_flight_time'].clip(lower=50) / 1000.0), 0.5, 15.0)
    except Exception as e:
        print(f"  Download failed ({e}). Using realistic simulation fallback.")

    if df is None or len(df) < 40:
        # Simulation calibrated from published Tappy + web-typing literature.
        # Key source: Arroyo-Gallego et al. 2017 (Tappy HC vs PD statistics).
        # Web typists tend to be faster and more consistent than Tappy cohort.
        np.random.seed(1337)
        n = 800
        labels = np.random.choice([0, 1], size=n, p=[0.5, 0.5])
        rows = []
        for y in labels:
            if y == 1:  # PD: slower, more variable, more errors
                mean_dw  = np.random.normal(130, 25)
                std_dw   = np.random.normal(55, 18)
                dwell_iq = np.random.normal(72, 20)  # wider IQR
                mean_fl  = np.random.normal(320, 65)
                std_fl   = np.random.normal(100, 30)
                flight_iq = np.random.normal(130, 35)
                t_speed  = np.clip(np.random.normal(2.8, 0.8), 0.5, 6.0)  # chars/sec
                err      = np.clip(np.random.normal(0.06, 0.025), 0, 1)
            else:  # HC: faster, tighter variability, few errors
                mean_dw  = np.random.normal(78, 12)
                std_dw   = np.random.normal(16, 5)
                dwell_iq = np.random.normal(20, 6)   # tight IQR
                mean_fl  = np.random.normal(185, 32)
                std_fl   = np.random.normal(30, 10)
                flight_iq = np.random.normal(38, 12)
                t_speed  = np.clip(np.random.normal(6.5, 1.2), 2.0, 12.0)  # chars/sec
                err      = np.clip(np.random.normal(0.010, 0.005), 0, 1)
            rows.append([mean_dw, std_dw, dwell_iq, mean_fl, std_fl, flight_iq, t_speed, err, y])
        df = pd.DataFrame(rows, columns=[
            'mean_dwell_time', 'std_dwell_time', 'dwell_iqr',
            'mean_flight_time', 'std_flight_time', 'flight_iqr',
            'typing_speed', 'error_rate', 'label'
        ])

    feature_cols = ['mean_dwell_time', 'std_dwell_time', 'dwell_iqr',
                    'mean_flight_time', 'std_flight_time', 'flight_iqr',
                    'typing_speed', 'error_rate']
    df = df.dropna(subset=feature_cols + ['label'])
    X, y = df[feature_cols], df['label']
    print(f"  Class balance: {dict(y.value_counts())}")

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    model = _smote_pipeline(_calibrated_ensemble())
    model.fit(X_tr, y_tr)
    y_pred  = model.predict(X_te)
    y_proba = model.predict_proba(X_te)[:, 1]
    _print_metrics(y_te, y_pred, y_proba)

    # Sanity check: HC group mean should be well below 0.5
    hc_proba = model.predict_proba(X[y == 0])[:, 1].mean()
    pd_proba = model.predict_proba(X[y == 1])[:, 1].mean()
    print(f"  HC group avg PD prob: {hc_proba:.3f}  PD group avg PD prob: {pd_proba:.3f}")

    joblib.dump(feature_cols, os.path.join(SAVED_MODELS_DIR, 'keystroke_features.joblib'))
    _save_model(model, 'keystroke')


# ===========================================================================
# 3. MOUSE MODEL — Zenodo ALAMEDA Accelerometer Dataset (real data)
#    4151 wrist-sensor samples, Rest_tremor label
#    Uses significantly more ALAMEDA features than v1 for better accuracy
# ===========================================================================

ALAMEDA_URL = "https://zenodo.org/records/10782573/files/ALAMEDA_PD_tremor_dataset.csv"

# Use 10 ALAMEDA features mapped to mouse-schema (richer than original 5)
MOUSE_ALAMEDA_FEATURES = [
    'Magnitude_rms',       # → path_length proxy
    'Magnitude_dfa',       # → movement_time proxy
    'Magnitude_std_dev',   # → velocity_jitter proxy
    'Magnitude_ssc_rt',    # → direction_changes proxy
    'Magnitude_mean',      # mean acceleration
    'Magnitude_var',       # variance
    'Magnitude_skewness',  # signal asymmetry
    'Magnitude_kurtosis',  # peakedness
    'PC1_rms',             # principal component RMS
    'PC1_std_dev',         # PC1 variability
]

def _load_alameda() -> pd.DataFrame | None:
    try:
        print("  Downloading ALAMEDA dataset…")
        raw = _download(ALAMEDA_URL, timeout=90)
        df = pd.read_csv(io.StringIO(raw.decode()))
        print(f"  ALAMEDA loaded: {df.shape}")
        return df
    except Exception as e:
        print(f"  ALAMEDA download failed: {e}")
        return None


def train_mouse_model():
    print("\n[3/5] Training Mouse Model — ALAMEDA Accelerometer Dataset")
    df_raw = _load_alameda()
    df = None

    if df_raw is not None and 'Rest_tremor' in df_raw.columns:
        y = df_raw['Rest_tremor'].astype(int)
        # Use all available ALAMEDA features that exist
        avail = [c for c in MOUSE_ALAMEDA_FEATURES if c in df_raw.columns]
        out = df_raw[avail].copy()

        # Rename to match model schema (keep first 5 for compatibility via prefix)
        rename = {
            'Magnitude_rms':      'path_length',
            'Magnitude_dfa':      'movement_time',
            'Magnitude_std_dev':  'velocity_jitter',
            'Magnitude_ssc_rt':   'direction_changes',
            'Magnitude_mean':     'mean_magnitude',
            'Magnitude_var':      'variance',
            'Magnitude_skewness': 'skewness',
            'Magnitude_kurtosis': 'kurtosis',
            'PC1_rms':            'pc1_rms',
            'PC1_std_dev':        'pc1_std',
        }
        out = out.rename(columns={k: v for k, v in rename.items() if k in out.columns})
        out['average_velocity'] = out['path_length'] / out['movement_time'].clip(lower=0.01)
        out['label'] = y.values
        df = out.dropna()
        n_pd = int(df['label'].sum())
        print(f"  Derived {len(df)} samples (PD={n_pd}, HC={len(df)-n_pd})")
    else:
        print("  Using realistic simulation fallback.")

    if df is None or len(df) < 40:
        np.random.seed(2023)
        n = 500
        labels = np.random.choice([0, 1], size=n, p=[0.5, 0.5])
        rows = []
        for y in labels:
            if y == 1:
                pl=np.random.normal(1600,350); mt=np.random.normal(4.5,1.2)
                vj=np.random.normal(170,50); dc=np.clip(np.random.normal(18,6),0,60)
                mv=np.random.normal(1.5,0.4); var=np.random.normal(250,80)
                sk=np.random.normal(0.8,0.3); ku=np.random.normal(3.5,1.0)
                p1r=np.random.normal(1.2,0.3); p1s=np.random.normal(0.9,0.2)
            else:
                pl=np.random.normal(950,180);  mt=np.random.normal(1.9,0.5)
                vj=np.random.normal(48,16);  dc=np.clip(np.random.normal(5,2),0,30)
                mv=np.random.normal(0.8,0.2); var=np.random.normal(80,25)
                sk=np.random.normal(0.2,0.2); ku=np.random.normal(2.2,0.6)
                p1r=np.random.normal(0.6,0.15); p1s=np.random.normal(0.4,0.1)
            av = pl / max(mt, 0.1)
            rows.append([pl,mt,vj,dc,mv,var,sk,ku,p1r,p1s,av,y])
        df = pd.DataFrame(rows, columns=['path_length','movement_time','velocity_jitter',
                                          'direction_changes','mean_magnitude','variance',
                                          'skewness','kurtosis','pc1_rms','pc1_std',
                                          'average_velocity','label'])

    feature_cols = [c for c in df.columns if c != 'label']
    X, y = df[feature_cols], df['label']
    print(f"  Class balance: {dict(y.value_counts())}")
    print(f"  Features ({len(feature_cols)}): {feature_cols}")

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    model = _smote_pipeline(_build_ensemble())
    model.fit(X_tr, y_tr)
    y_pred  = model.predict(X_te)
    y_proba = model.predict_proba(X_te)[:, 1]
    _print_metrics(y_te, y_pred, y_proba)

    # Save the feature list used so models.py can create the right DataFrame
    joblib.dump(feature_cols, os.path.join(SAVED_MODELS_DIR, 'mouse_features.joblib'))
    _save_model(model, 'mouse')


# ===========================================================================
# 4. TREMOR MODEL — Zenodo ALAMEDA (real spectral features)
#    Uses 8 spectral ALAMEDA features for richer tremor characterisation
# ===========================================================================

TREMOR_ALAMEDA_FEATURES = [
    'Magnitude_fft_dom_freq',      # dominant frequency (peak_frequency_hz)
    'Magnitude_rms',               # amplitude proxy
    'Magnitude_fft_entropy',       # spectral entropy
    'Magnitude_fft_tot_power',     # total spectral power
    'Magnitude_fft_pw_ar_dom_freq',# power at dominant frequency
    'Magnitude_fft_rms',           # FFT RMS
    'PC1_fft_dom_freq',            # PC1 dominant frequency
    'PC1_fft_entropy',             # PC1 spectral entropy
]

def train_tremor_model():
    print("\n[4/5] Training Tremor Model — ALAMEDA Accelerometer Dataset")
    df_raw = _load_alameda()
    df = None

    if df_raw is not None and 'Rest_tremor' in df_raw.columns:
        y = df_raw['Rest_tremor'].astype(int)
        avail = [c for c in TREMOR_ALAMEDA_FEATURES if c in df_raw.columns]
        out = df_raw[avail].copy()

        rename = {
            'Magnitude_fft_dom_freq':       'peak_frequency_hz',
            'Magnitude_rms':                'amplitude_mean',
            'Magnitude_fft_entropy':        'spectral_entropy_raw',
            'Magnitude_fft_tot_power':      'total_power',
            'Magnitude_fft_pw_ar_dom_freq': 'power_at_dom_freq',
            'Magnitude_fft_rms':            'fft_rms',
            'PC1_fft_dom_freq':             'pc1_dom_freq',
            'PC1_fft_entropy':              'pc1_entropy',
        }
        out = out.rename(columns={k: v for k, v in rename.items() if k in out.columns})
        ent = out.get('spectral_entropy_raw', pd.Series(dtype=float))
        if len(ent):
            out['spectral_entropy'] = ((ent - ent.min()) / (ent.max() - ent.min() + 1e-9)).clip(0, 1)
            out.drop(columns=['spectral_entropy_raw'], inplace=True, errors='ignore')
        out['label'] = y.values
        df = out.dropna()
        n_pd = int(df['label'].sum())
        print(f"  Derived {len(df)} samples (PD={n_pd}, HC={len(df)-n_pd})")
    else:
        print("  Using realistic simulation fallback.")

    if df is None or len(df) < 40:
        np.random.seed(99)
        n = 500
        labels = np.random.choice([0, 1], size=n, p=[0.5, 0.5])
        rows = []
        for y in labels:
            if y == 1:
                pf=np.random.normal(4.8,0.9); amp=np.random.normal(16.0,5.5)
                ent=np.clip(np.random.normal(0.38,0.10),0,1)
                tp=np.random.normal(150,40); pw=np.random.normal(80,25)
                fr=np.random.normal(12,4); p1f=np.random.normal(4.5,1.0)
                p1e=np.clip(np.random.normal(0.4,0.1),0,1)
            else:
                pf=np.random.normal(9.0,1.5); amp=np.random.normal(2.0,1.0)
                ent=np.clip(np.random.normal(0.80,0.08),0,1)
                tp=np.random.normal(40,15); pw=np.random.normal(20,8)
                fr=np.random.normal(4,1.5); p1f=np.random.normal(8.5,1.5)
                p1e=np.clip(np.random.normal(0.75,0.08),0,1)
            rows.append([pf,amp,ent,tp,pw,fr,p1f,p1e,y])
        df = pd.DataFrame(rows, columns=['peak_frequency_hz','amplitude_mean','spectral_entropy',
                                          'total_power','power_at_dom_freq','fft_rms',
                                          'pc1_dom_freq','pc1_entropy','label'])

    feature_cols = [c for c in df.columns if c != 'label']
    X, y = df[feature_cols], df['label']
    print(f"  Class balance: {dict(y.value_counts())}")

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    model = _smote_pipeline(_build_ensemble())
    model.fit(X_tr, y_tr)
    y_pred  = model.predict(X_te)
    y_proba = model.predict_proba(X_te)[:, 1]
    _print_metrics(y_te, y_pred, y_proba)

    joblib.dump(feature_cols, os.path.join(SAVED_MODELS_DIR, 'tremor_features.joblib'))
    _save_model(model, 'tremor')


# ===========================================================================
# 5. HANDWRITING MODEL — Real kinematic features (github.com/shubhamjha97)
#    77 spiral/meander recordings, 30 kinematic features, 'target' label
#    Augmented with SMOTE due to small dataset size
# ===========================================================================

HANDWRITING_URL = "https://raw.githubusercontent.com/shubhamjha97/parkinson-detection/master/data.csv"

HANDWRITING_FEATURES = [
    'speed_st', 'speed_dy',
    'magnitude_vel_st', 'magnitude_vel_dy',
    'magnitude_acc_st', 'magnitude_acc_dy',
    'magnitude_jerk_st', 'magnitude_jerk_dy',
    'ncv_st', 'ncv_dy',
    'nca_st', 'nca_dy',
    'in_air_stcp', 'on_surface_st', 'on_surface_dy',
]

def train_handwriting_model():
    print("\n[5/5] Training Handwriting Model — Spiral Kinematic Features Dataset")
    df = None
    try:
        raw = _download(HANDWRITING_URL, timeout=30)
        candidate = pd.read_csv(io.StringIO(raw.decode()))
        if 'target' in candidate.columns and len(candidate) > 20:
            df = candidate
            print(f"  ✓ Downloaded: {HANDWRITING_URL}  shape={df.shape}")
        else:
            print(f"  ✗ Wrong format (cols={list(candidate.columns[:5])})")
    except Exception as e:
        print(f"  Download failed: {e}")

    if df is not None and 'target' in df.columns:
        avail = [c for c in HANDWRITING_FEATURES if c in df.columns]
        if len(avail) < 4:
            avail = [c for c in df.select_dtypes(include=[np.number]).columns if c != 'target']
        # Normalise ncv/nca to per-second rates so training distribution matches
        # what extract_handwriting_features now produces (browser data is ~60 Hz,
        # the raw dataset was recorded at ~100–200 Hz stylus).
        X_raw = df[avail].fillna(df[avail].median())
        y = df['target'].astype(int)
        for col in ['ncv_st', 'ncv_dy', 'nca_st', 'nca_dy']:
            if col in X_raw.columns:
                # on_surface_st/dy are in ms in the raw dataset
                ref_col = 'on_surface_st' if 'st' in col else 'on_surface_dy'
                if ref_col in X_raw.columns:
                    on_sec = X_raw[ref_col].clip(lower=100) / 1000.0
                    X_raw = X_raw.copy()
                    X_raw[col] = X_raw[col] / on_sec
        X = X_raw
        feature_cols = avail
        print(f"  Using {len(avail)} kinematic features (ncv/nca normalised to per-sec)")
    else:
        # ---------------------------------------------------------------------------
        # Simulation calibrated to match browser-extracted per-second ncv/nca rates.
        # HC: steady spirals ≈ 8–10 direction changes/sec; PD: ≈ 5–7 (less smooth).
        # Speed and velocity values use the same SCALE=0.00002 as features.py.
        # ---------------------------------------------------------------------------
        print("  Using realistic simulation fallback.")
        np.random.seed(1111)
        n = 600
        labels = np.random.choice([0, 1], size=n, p=[0.5, 0.5])
        rows = []
        for y_val in labels:
            if y_val == 1:  # PD: slower, more halting, lower per-sec NCV/NCA
                row = [
                    np.random.normal(0.0045, 0.0015),   # speed_st (higher = tremor/hesitation)
                    np.random.normal(0.0040, 0.0013),   # speed_dy
                    np.random.normal(0.052,  0.015),    # magnitude_vel_st
                    np.random.normal(0.048,  0.013),    # magnitude_vel_dy
                    np.random.normal(0.00012, 0.00005), # magnitude_acc_st
                    np.random.normal(0.00011, 0.00004), # magnitude_acc_dy
                    np.random.normal(8.5e-6,  3e-6),   # magnitude_jerk_st
                    np.random.normal(7.5e-6,  2.5e-6), # magnitude_jerk_dy
                    np.clip(np.random.normal(6.5,  1.5), 1.0, 15.0),  # ncv_st /sec
                    np.clip(np.random.normal(6.2,  1.4), 1.0, 15.0),  # ncv_dy /sec
                    np.clip(np.random.normal(3.2,  0.8), 0.5,  8.0),  # nca_st /sec
                    np.clip(np.random.normal(3.0,  0.7), 0.5,  8.0),  # nca_dy /sec
                    np.random.normal(350.0, 120.0),    # in_air_stcp (ms)
                    np.random.normal(4500.0, 900.0),   # on_surface_st (ms)
                    np.random.normal(4200.0, 850.0),   # on_surface_dy (ms)
                ]
            else:  # HC: smooth, consistent, higher per-sec NCV/NCA
                row = [
                    np.random.normal(0.0070, 0.0020),   # speed_st
                    np.random.normal(0.0065, 0.0018),   # speed_dy
                    np.random.normal(0.090,  0.020),    # magnitude_vel_st
                    np.random.normal(0.085,  0.018),    # magnitude_vel_dy
                    np.random.normal(0.00003, 0.00001), # magnitude_acc_st
                    np.random.normal(0.00003, 0.00001), # magnitude_acc_dy
                    np.random.normal(2.0e-6,  6e-7),   # magnitude_jerk_st
                    np.random.normal(1.8e-6,  5e-7),   # magnitude_jerk_dy
                    np.clip(np.random.normal(8.7,  1.8), 2.0, 20.0),  # ncv_st /sec
                    np.clip(np.random.normal(8.5,  1.7), 2.0, 20.0),  # ncv_dy /sec
                    np.clip(np.random.normal(4.2,  1.0), 1.0, 10.0),  # nca_st /sec
                    np.clip(np.random.normal(4.0,  0.9), 1.0, 10.0),  # nca_dy /sec
                    np.random.normal(50.0,   40.0),    # in_air_stcp (ms) — minimal air time
                    np.random.normal(3800.0, 700.0),   # on_surface_st (ms)
                    np.random.normal(3600.0, 650.0),   # on_surface_dy (ms)
                ]
            rows.append(row + [y_val])
        feature_cols = HANDWRITING_FEATURES
        df_sim = pd.DataFrame(rows, columns=feature_cols + ['label'])
        X, y = df_sim[feature_cols], df_sim['label']

    print(f"  Class balance: {dict(pd.Series(y).value_counts())}")
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

    # Calibrated GBM: prevents overconfident probabilities on out-of-distribution web data
    smote_k = max(1, int(pd.Series(y_tr).value_counts().min()) - 1)
    base_gbm = GradientBoostingClassifier(n_estimators=300, learning_rate=0.03,
                                           max_depth=3, random_state=42)
    calibrated_gbm = CalibratedClassifierCV(base_gbm, method='isotonic', cv=3)
    model = ImbPipeline([
        ('scaler', RobustScaler()),
        ('smote',  SMOTE(random_state=42, k_neighbors=smote_k)),
        ('clf',    calibrated_gbm),
    ])
    model.fit(X_tr, y_tr)
    y_pred  = model.predict(X_te)
    y_proba = model.predict_proba(X_te)[:, 1]
    _print_metrics(y_te, y_pred, y_proba)

    # Sanity-check: healthy group mean should predict below 0.3
    hc_proba = model.predict_proba(X[pd.Series(y) == 0])[:, 1].mean()
    pd_proba = model.predict_proba(X[pd.Series(y) == 1])[:, 1].mean()
    print(f"  HC group avg PD prob: {hc_proba:.3f}  PD group avg PD prob: {pd_proba:.3f}")

    joblib.dump(feature_cols, os.path.join(SAVED_MODELS_DIR, 'handwriting_features.joblib'))
    _save_model(model, 'handwriting')


# ===========================================================================
# Entry point
# ===========================================================================

if __name__ == "__main__":
    print("=" * 65)
    print("  SynaptiScan ML Training Pipeline v2")
    print("  Real-world datasets + SMOTE + Ensemble (RF+GBM+SVM)")
    print("=" * 65)
    train_voice_model()
    train_keystroke_model()
    train_mouse_model()
    train_tremor_model()
    train_handwriting_model()
    print("\n" + "=" * 65)
    print("  Training Complete — all models saved.")
    print("=" * 65)
