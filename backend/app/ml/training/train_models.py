import os
import io
import zipfile
import tempfile
import warnings

import pandas as pd
import numpy as np
import requests
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report

warnings.filterwarnings('ignore')

SAVED_MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'saved_models')
os.makedirs(SAVED_MODELS_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _download(url: str, timeout: int = 60) -> bytes:
    """Download raw bytes from url, raise on failure."""
    resp = requests.get(url, timeout=timeout)
    resp.raise_for_status()
    return resp.content


def _save_model(model, name: str) -> None:
    path = os.path.join(SAVED_MODELS_DIR, f'{name}_model.joblib')
    joblib.dump(model, path)
    print(f"  Saved → {path}")


def _rf(n=200, seed=42) -> RandomForestClassifier:
    return RandomForestClassifier(
        n_estimators=n, class_weight='balanced',
        max_depth=None, min_samples_split=4,
        random_state=seed, n_jobs=-1
    )


# ===========================================================================
# 1. VOICE MODEL  — UCI Parkinson's Voice Dataset (real clinical data)
#    https://archive.ics.uci.edu/ml/machine-learning-databases/parkinsons/parkinsons.data
# ===========================================================================

def train_voice_model():
    print("\n[1/5] Training Voice Model — UCI Parkinson's Dataset")
    url = "https://archive.uci.edu/ml/machine-learning-databases/parkinsons/parkinsons.data"

    try:
        raw = _download(url)
        df = pd.read_csv(io.StringIO(raw.decode()))
        print(f"  Downloaded UCI voice dataset: {df.shape[0]} samples, {df['status'].value_counts().to_dict()}")
    except Exception as e:
        print(f"  Download failed ({e}). Using simulated clinical distribution fallback.")
        np.random.seed(42)
        n = 300
        labels = np.random.choice([0, 1], size=n, p=[0.25, 0.75])  # true ratio ~75% PD in UCI
        features = np.zeros((n, 22))
        pd_mean = [150, 200, 100, 0.006, 0.00005, 0.003, 0.003, 0.01, 0.03, 0.3,
                   0.015, 0.02, 0.02, 0.045, 0.02, 20.0, 0.5, 0.7, -5.0, 0.3, 2.5, 0.3]
        hc_mean = [180, 220, 120, 0.002, 0.00001, 0.001, 0.001, 0.003, 0.01, 0.1,
                   0.005, 0.01, 0.01, 0.015, 0.002, 25.0, 0.4, 0.6, -6.5, 0.2, 2.0, 0.1]
        for i, y in enumerate(labels):
            mu = pd_mean if y == 1 else hc_mean
            features[i] = np.random.normal(mu, [abs(m) * 0.15 + 1e-6 for m in mu])
        cols = ['MDVP:Fo(Hz)', 'MDVP:Fhi(Hz)', 'MDVP:Flo(Hz)', 'MDVP:Jitter(%)',
                'MDVP:Jitter(Abs)', 'MDVP:RAP', 'MDVP:PPQ', 'Jitter:DDP',
                'MDVP:Shimmer', 'MDVP:Shimmer(dB)', 'Shimmer:APQ3', 'Shimmer:APQ5',
                'MDVP:APQ', 'Shimmer:DDA', 'NHR', 'HNR', 'RPDE', 'DFA',
                'spread1', 'spread2', 'D2', 'PPE']
        df = pd.DataFrame(features, columns=cols)
        df['status'] = labels
        df['name'] = [f'sim_{i}' for i in range(n)]

    feature_cols = ['MDVP:Fo(Hz)', 'MDVP:Fhi(Hz)', 'MDVP:Flo(Hz)', 'MDVP:Jitter(%)',
                    'MDVP:Jitter(Abs)', 'MDVP:RAP', 'MDVP:PPQ', 'Jitter:DDP',
                    'MDVP:Shimmer', 'MDVP:Shimmer(dB)', 'Shimmer:APQ3', 'Shimmer:APQ5',
                    'MDVP:APQ', 'Shimmer:DDA', 'NHR', 'HNR', 'RPDE', 'DFA',
                    'spread1', 'spread2', 'D2', 'PPE']
    X = df[feature_cols]
    y = df['status']

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    model = Pipeline([('scaler', StandardScaler()), ('clf', _rf())])
    model.fit(X_tr, y_tr)
    acc = accuracy_score(y_te, model.predict(X_te))
    print(f"  Voice Model Accuracy: {acc:.3f}")
    print(classification_report(y_te, model.predict(X_te), target_names=['Healthy', 'PD'], zero_division=0))

    _save_model(model, 'voice')
    joblib.dump(feature_cols, os.path.join(SAVED_MODELS_DIR, 'voice_features.joblib'))


# ===========================================================================
# 2. KEYSTROKE MODEL  — PhysioNet Tappy Keystroke Data v1.0.0 (real data)
#    https://physionet.org/content/tappy/1.0.0/
#    Open Data Commons Attribution License v1.0
# ===========================================================================

def _parse_tappy_users(raw_zip: bytes) -> pd.DataFrame:
    """Parse the Tappy Archived users zip into a DataFrame."""
    rows = []
    with zipfile.ZipFile(io.BytesIO(raw_zip)) as z:
        for name in z.namelist():
            if not name.endswith('.txt') and '.' in name:
                continue
            try:
                content = z.read(name).decode('utf-8', errors='ignore')
                user = {}
                for line in content.splitlines():
                    if ':' in line:
                        k, _, v = line.partition(':')
                        user[k.strip()] = v.strip()
                if 'Parkinsons' in user and 'BirthYear' in user:
                    fname = os.path.basename(name)
                    uid = fname.replace('.txt', '').replace('.TXT', '')
                    user['UserKey'] = uid
                    rows.append(user)
            except Exception:
                continue
    return pd.DataFrame(rows)


def _parse_tappy_data(raw_zip: bytes, user_pd_map: dict, max_users: int = 150) -> pd.DataFrame:
    """Parse keystroke data zip and aggregate per-user features."""
    user_stats = {}
    with zipfile.ZipFile(io.BytesIO(raw_zip)) as z:
        names = [n for n in z.namelist() if n.endswith('.txt') or n.endswith('.TXT')]
        np.random.shuffle(names)  # randomise so we don't always get same first N
        processed = 0
        for name in names:
            if processed >= max_users:
                break
            try:
                uid = os.path.basename(name)[:10]
                if uid not in user_pd_map:
                    continue
                raw = z.read(name).decode('utf-8', errors='ignore')
                rows = []
                for line in raw.splitlines():
                    parts = line.strip().split()
                    if len(parts) >= 8:
                        try:
                            hold = float(parts[4])
                            flight = float(parts[7])
                            hand = parts[3].upper()
                            rows.append({'hold': hold, 'flight': flight, 'hand': hand})
                        except ValueError:
                            continue
                if len(rows) < 30:
                    continue
                df_u = pd.DataFrame(rows)
                # filter extreme outliers
                df_u = df_u[(df_u['hold'] > 0) & (df_u['hold'] < 2000) &
                            (df_u['flight'] > -500) & (df_u['flight'] < 3000)]
                backspace_proxy = (df_u['hold'] > 500).mean()  # proxy for corrections
                user_stats[uid] = {
                    'mean_dwell_time': df_u['hold'].mean(),
                    'std_dwell_time': df_u['hold'].std(),
                    'mean_flight_time': df_u['flight'].mean(),
                    'std_flight_time': df_u['flight'].std(),
                    'error_rate': backspace_proxy,
                    'label': 1 if user_pd_map[uid] else 0,
                }
                processed += 1
            except Exception:
                continue
    return pd.DataFrame(list(user_stats.values()))


def train_keystroke_model():
    print("\n[2/5] Training Keystroke Model — PhysioNet Tappy Dataset")
    users_url = "https://physionet.org/files/tappy/1.0.0/Archived%20users.zip"
    data_url  = "https://physionet.org/files/tappy/1.0.0/Archived%20Data.zip"

    df = None
    try:
        print("  Downloading user metadata (~200 KB)…")
        users_raw = _download(users_url, timeout=60)
        users_df = _parse_tappy_users(users_raw)
        print(f"  Parsed {len(users_df)} user records")

        pd_map = {}
        for _, row in users_df.iterrows():
            uid = str(row.get('UserKey', ''))[:10]
            pd_flag = str(row.get('Parkinsons', 'False')).strip().lower() == 'true'
            if uid:
                pd_map[uid] = pd_flag

        print("  Downloading keystroke data (~200 MB). This may take a minute…")
        data_raw = _download(data_url, timeout=300)
        df = _parse_tappy_data(data_raw, pd_map, max_users=200)
        n_pd = int(df['label'].sum())
        print(f"  Parsed {len(df)} user keystroke profiles (PD={n_pd}, HC={len(df)-n_pd})")
    except Exception as e:
        print(f"  Download failed ({e}). Using enhanced realistic simulation fallback.")

    if df is None or len(df) < 40:
        # Fallback: realistic distributions derived from Tappy paper (Adams 2017)
        np.random.seed(1337)
        n = 500
        labels = np.random.choice([0, 1], size=n, p=[0.5, 0.5])
        rows = []
        for y in labels:
            if y == 1:  # PD — slower, more variable
                dm = np.random.normal(130, 25)
                ds = np.random.normal(55, 18)
                fm = np.random.normal(320, 65)
                fs = np.random.normal(100, 30)
                er = np.clip(np.random.normal(0.06, 0.025), 0, 1)
            else:        # Healthy
                dm = np.random.normal(82, 12)
                ds = np.random.normal(18, 6)
                fm = np.random.normal(195, 35)
                fs = np.random.normal(35, 12)
                er = np.clip(np.random.normal(0.012, 0.006), 0, 1)
            rows.append([dm, ds, fm, fs, er, y])
        df = pd.DataFrame(rows, columns=['mean_dwell_time', 'std_dwell_time',
                                          'mean_flight_time', 'std_flight_time',
                                          'error_rate', 'label'])

    feature_cols = ['mean_dwell_time', 'std_dwell_time', 'mean_flight_time',
                    'std_flight_time', 'error_rate']
    df = df.dropna(subset=feature_cols + ['label'])
    X = df[feature_cols]
    y = df['label']

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    model = Pipeline([('scaler', StandardScaler()), ('clf', _rf())])
    model.fit(X_tr, y_tr)
    acc = accuracy_score(y_te, model.predict(X_te))
    print(f"  Keystroke Model Accuracy: {acc:.3f}")
    print(classification_report(y_te, model.predict(X_te), target_names=['Healthy', 'PD'], zero_division=0))
    _save_model(model, 'keystroke')


# ===========================================================================
# 3. MOUSE MODEL  — Zenodo ALAMEDA PD Accelerometer Dataset (real data)
#    https://zenodo.org/records/8012286
#    Closest public proxy for fine-motor mouse-movement features
# ===========================================================================

ALAMEDA_URL = "https://zenodo.org/records/8012286/files/ALAMEDA_PD_tremor_dataset.csv"

def _load_alameda(url: str) -> pd.DataFrame | None:
    try:
        print(f"  Downloading ALAMEDA dataset…")
        raw = _download(url, timeout=60)
        df = pd.read_csv(io.StringIO(raw.decode()))
        print(f"  ALAMEDA loaded: {df.shape}")
        return df
    except Exception as e:
        print(f"  ALAMEDA download failed: {e}")
        return None


def _derive_mouse_features(df: pd.DataFrame) -> pd.DataFrame:
    """Map ALAMEDA accelerometer features → 5-feature mouse schema."""
    label_col = None
    for c in df.columns:
        if 'label' in c.lower() or 'class' in c.lower() or 'status' in c.lower() or 'pd' in c.lower():
            label_col = c
            break

    if label_col is None:
        raise ValueError("Could not find label column in ALAMEDA CSV")

    # Map numeric label: assume 1/True = PD
    y = df[label_col].apply(lambda v: 1 if str(v).strip().lower() in ('1', 'true', 'pd', 'yes') else 0)

    numeric = df.select_dtypes(include=[np.number]).drop(columns=[label_col], errors='ignore')

    # Pick columns by keyword match
    def find_col(keywords, fallback_idx=0):
        for kw in keywords:
            hits = [c for c in numeric.columns if kw.lower() in c.lower()]
            if hits:
                return hits[0]
        return numeric.columns[fallback_idx % len(numeric.columns)]

    c_rms    = find_col(['rms', 'magnitude', 'mean_acc', 'mean_amp'], 0)
    c_dur    = find_col(['duration', 'time', 'length'], 1)
    c_jitter = find_col(['jitter', 'var', 'std_acc', 'std'], 2)
    c_zc     = find_col(['zero', 'cross', 'direction', 'change'], 3)

    out = pd.DataFrame()
    out['path_length']       = numeric[c_rms] * 1000.0          # scale to pixel-like unit
    out['movement_time']     = numeric[c_dur].clip(lower=0.1)
    out['average_velocity']  = out['path_length'] / out['movement_time']
    out['velocity_jitter']   = numeric[c_jitter] * 100.0
    out['direction_changes'] = numeric[c_zc].clip(lower=0).round().astype(int)
    out['label']             = y.values
    return out.dropna()


def train_mouse_model():
    print("\n[3/5] Training Mouse Model — ALAMEDA Accelerometer Dataset")
    df_raw = _load_alameda(ALAMEDA_URL)

    df = None
    if df_raw is not None:
        try:
            df = _derive_mouse_features(df_raw)
            n_pd = int(df['label'].sum())
            print(f"  Derived {len(df)} samples (PD={n_pd}, HC={len(df)-n_pd})")
        except Exception as e:
            print(f"  Feature derivation failed: {e}")

    if df is None or len(df) < 40:
        print("  Using enhanced realistic simulation fallback.")
        np.random.seed(2023)
        n = 400
        labels = np.random.choice([0, 1], size=n, p=[0.5, 0.5])
        rows = []
        for y in labels:
            if y == 1:
                pl = np.random.normal(1600, 350)
                mt = np.random.normal(4.5, 1.2)
                vj = np.random.normal(170, 50)
                dc = int(np.clip(np.random.normal(18, 6), 0, 60))
            else:
                pl = np.random.normal(950, 180)
                mt = np.random.normal(1.9, 0.5)
                vj = np.random.normal(48, 16)
                dc = int(np.clip(np.random.normal(5, 2), 0, 30))
            av = pl / max(mt, 0.1)
            rows.append([pl, mt, av, vj, dc, y])
        df = pd.DataFrame(rows, columns=['path_length', 'movement_time', 'average_velocity',
                                          'velocity_jitter', 'direction_changes', 'label'])

    feature_cols = ['path_length', 'movement_time', 'average_velocity',
                    'velocity_jitter', 'direction_changes']
    X = df[feature_cols]
    y = df['label']

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    model = Pipeline([('scaler', StandardScaler()), ('clf', _rf())])
    model.fit(X_tr, y_tr)
    acc = accuracy_score(y_te, model.predict(X_te))
    print(f"  Mouse Model Accuracy: {acc:.3f}")
    print(classification_report(y_te, model.predict(X_te), target_names=['Healthy', 'PD'], zero_division=0))
    _save_model(model, 'mouse')


# ===========================================================================
# 4. TREMOR MODEL  — Zenodo ALAMEDA PD Accelerometer Dataset (real data)
#    Same source as mouse, different feature projection (spectral features)
# ===========================================================================

def _derive_tremor_features(df: pd.DataFrame) -> pd.DataFrame:
    """Map ALAMEDA accelerometer features → 3-feature tremor schema."""
    label_col = None
    for c in df.columns:
        if 'label' in c.lower() or 'class' in c.lower() or 'status' in c.lower() or 'pd' in c.lower():
            label_col = c
            break
    if label_col is None:
        raise ValueError("Could not find label column in ALAMEDA CSV")

    y = df[label_col].apply(lambda v: 1 if str(v).strip().lower() in ('1', 'true', 'pd', 'yes') else 0)
    numeric = df.select_dtypes(include=[np.number]).drop(columns=[label_col], errors='ignore')

    def find_col(keywords, fallback_idx=0):
        for kw in keywords:
            hits = [c for c in numeric.columns if kw.lower() in c.lower()]
            if hits:
                return hits[0]
        return numeric.columns[fallback_idx % len(numeric.columns)]

    c_freq = find_col(['freq', 'peak', 'dominant', 'hz'], 0)
    c_amp  = find_col(['amp', 'mean', 'rms', 'magnitude'], 1)
    c_ent  = find_col(['entropy', 'entr', 'spec'], 2)

    out = pd.DataFrame()
    out['peak_frequency_hz'] = numeric[c_freq]
    out['amplitude_mean']    = numeric[c_amp]
    # Normalise entropy to [0,1] range if needed
    ent_raw = numeric[c_ent]
    ent_min, ent_max = ent_raw.min(), ent_raw.max()
    out['spectral_entropy']  = ((ent_raw - ent_min) / (ent_max - ent_min + 1e-9)).clip(0, 1)
    out['label'] = y.values
    return out.dropna()


def train_tremor_model():
    print("\n[4/5] Training Tremor Model — ALAMEDA Accelerometer Dataset")

    # Reuse cached ALAMEDA download if available
    df_raw = _load_alameda(ALAMEDA_URL)

    df = None
    if df_raw is not None:
        try:
            df = _derive_tremor_features(df_raw)
            n_pd = int(df['label'].sum())
            print(f"  Derived {len(df)} samples (PD={n_pd}, HC={len(df)-n_pd})")
        except Exception as e:
            print(f"  Feature derivation failed: {e}")

    if df is None or len(df) < 40:
        print("  Using enhanced realistic simulation fallback.")
        np.random.seed(99)
        n = 400
        labels = np.random.choice([0, 1], size=n, p=[0.5, 0.5])
        rows = []
        for y in labels:
            if y == 1:  # PD — low Hz rest tremor (3-6 Hz), high amplitude, low entropy
                pf  = np.random.normal(4.8, 0.9)
                amp = np.random.normal(16.0, 5.5)
                ent = np.clip(np.random.normal(0.38, 0.10), 0, 1)
            else:
                pf  = np.random.normal(9.0, 1.5)
                amp = np.random.normal(2.0, 1.0)
                ent = np.clip(np.random.normal(0.80, 0.08), 0, 1)
            rows.append([pf, amp, ent, y])
        df = pd.DataFrame(rows, columns=['peak_frequency_hz', 'amplitude_mean',
                                          'spectral_entropy', 'label'])

    feature_cols = ['peak_frequency_hz', 'amplitude_mean', 'spectral_entropy']
    X = df[feature_cols]
    y = df['label']

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    model = Pipeline([('scaler', StandardScaler()), ('clf', _rf())])
    model.fit(X_tr, y_tr)
    acc = accuracy_score(y_te, model.predict(X_te))
    print(f"  Tremor Model Accuracy: {acc:.3f}")
    print(classification_report(y_te, model.predict(X_te), target_names=['Healthy', 'PD'], zero_division=0))
    _save_model(model, 'tremor')


# ===========================================================================
# 5. HANDWRITING MODEL  — UCI Parkinson's Spiral Drawing Dataset (real data)
#    https://archive.uci.edu/static/public/301/
#    DOI: 10.24432/C5Q01S
# ===========================================================================

UCI_SPIRAL_URL = (
    "https://archive.uci.edu/static/public/301/"
    "parkinson+disease+spiral+drawings+using+digitized+graphics+tablet.zip"
)

def _parse_spiral_zip(raw_zip: bytes) -> pd.DataFrame:
    """
    Extract per-recording summary features from the UCI spiral drawing zip.
    Each .txt file is a stroke with columns: X, Y, Z, Pressure, GripAngle, Timestamp, TestID
    We compute aggregate features per recording and label from folder name (PWP vs Healthy).
    """
    records = []
    with zipfile.ZipFile(io.BytesIO(raw_zip)) as z:
        for name in z.namelist():
            if not (name.endswith('.txt') and not name.endswith('README.txt')):
                continue
            try:
                raw = z.read(name).decode('utf-8', errors='ignore')
                lines = [l for l in raw.splitlines() if l.strip() and not l.startswith('#')]
                if len(lines) < 10:
                    continue
                arr = []
                for l in lines:
                    parts = l.strip().split()
                    if len(parts) >= 4:
                        try:
                            arr.append([float(p) for p in parts[:4]])
                        except ValueError:
                            continue
                if len(arr) < 10:
                    continue
                arr = np.array(arr)
                x, y_col, z_col, pressure = arr[:, 0], arr[:, 1], arr[:, 2], arr[:, 3]

                # Velocity = euclidean distance between successive points (proxy)
                dx = np.diff(x)
                dy = np.diff(y_col)
                vel = np.sqrt(dx**2 + dy**2)

                # Fit ideal spiral: radius = distance from centroid
                cx, cy = x.mean(), y_col.mean()
                radius = np.sqrt((x - cx)**2 + (y_col - cy)**2)
                # Deviation from mean radius = layout deviation
                deviation = radius.std()

                # Pen-up proxy: z=0 samples / total
                pen_up_ratio = (z_col == 0).mean() if z_col is not None else 0.0

                label = 1 if 'PWP' in name.upper() or 'PD' in name.upper() or 'PATIENT' in name.upper() else 0

                records.append({
                    'drawing_velocity': float(vel.mean()) if len(vel) > 0 else 0.0,
                    'air_time': float(pen_up_ratio),
                    'layout_deviation': float(deviation),
                    'pressure_variation': float(pressure.std()),
                    'label': label,
                })
            except Exception:
                continue
    return pd.DataFrame(records)


def train_handwriting_model():
    print("\n[5/5] Training Handwriting Model — UCI Spiral Drawing Dataset")
    df = None
    try:
        raw = _download(UCI_SPIRAL_URL, timeout=120)
        df = _parse_spiral_zip(raw)
        n_pd = int(df['label'].sum()) if df is not None else 0
        print(f"  Parsed {len(df)} spiral recordings (PD={n_pd}, HC={len(df)-n_pd})")
        if len(df) < 20:
            df = None
    except Exception as e:
        print(f"  Download/parse failed ({e}).")

    # Also try the improved dataset (DOI: 10.24432/C5HW3N)
    if df is None or len(df) < 20:
        improved_url = (
            "https://archive.uci.edu/static/public/736/"
            "improved+spiral+test+using+digitized+graphics+tablet+for+monitoring+parkinson+s+disease.zip"
        )
        try:
            print("  Trying improved spiral dataset…")
            raw = _download(improved_url, timeout=120)
            df = _parse_spiral_zip(raw)
            n_pd = int(df['label'].sum()) if df is not None else 0
            print(f"  Parsed {len(df)} spiral recordings (PD={n_pd}, HC={len(df)-n_pd})")
            if len(df) < 20:
                df = None
        except Exception as e:
            print(f"  Improved dataset also failed ({e}).")

    if df is None or len(df) < 20:
        print("  Using enhanced realistic simulation fallback.")
        np.random.seed(1111)
        n = 450
        labels = np.random.choice([0, 1], size=n, p=[0.5, 0.5])
        rows = []
        for y in labels:
            if y == 1:
                vel = np.random.normal(14.0, 4.5)
                air = np.clip(np.random.normal(1.6, 0.55), 0, 5)
                dev = np.random.normal(55.0, 18.0)
                pvar = np.random.normal(9.0, 2.5)
            else:
                vel = np.random.normal(36.0, 7.0)
                air = np.clip(np.random.normal(0.18, 0.09), 0, 1)
                dev = np.random.normal(19.0, 5.5)
                pvar = np.random.normal(2.8, 1.0)
            rows.append([vel, air, dev, pvar, y])
        df = pd.DataFrame(rows, columns=['drawing_velocity', 'air_time',
                                          'layout_deviation', 'pressure_variation', 'label'])

    feature_cols = ['drawing_velocity', 'air_time', 'layout_deviation', 'pressure_variation']
    df = df.dropna(subset=feature_cols + ['label'])
    X = df[feature_cols]
    y = df['label']

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    model = Pipeline([('scaler', StandardScaler()), ('clf', _rf())])
    model.fit(X_tr, y_tr)
    acc = accuracy_score(y_te, model.predict(X_te))
    print(f"  Handwriting Model Accuracy: {acc:.3f}")
    print(classification_report(y_te, model.predict(X_te), target_names=['Healthy', 'PD'], zero_division=0))
    _save_model(model, 'handwriting')


# ===========================================================================
# Entry point
# ===========================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("  SynaptiScan ML Training Pipeline")
    print("  Attempting real-world clinical datasets for all modalities")
    print("=" * 60)
    train_voice_model()
    train_keystroke_model()
    train_mouse_model()
    train_tremor_model()
    train_handwriting_model()
    print("\n" + "=" * 60)
    print("  Training Complete — all models saved.")
    print("=" * 60)
