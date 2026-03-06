import os
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from imblearn.over_sampling import SMOTE
import joblib

def generate_synthetic_stroop_data(n_samples=2000):
    """
    Generates synthetic Stroop test data mimicking clinical distributions.
    
    Features:
    - congruent_rt_mean: Reaction time for matching words/colors (ms)
    - incongruent_rt_mean: Reaction time for mismatching words/colors (ms)
    - stroop_effect: Incongruent RT - Congruent RT
    - error_rate: Percentage of incorrect responses (0-1)
    
    Target:
    - label: 0 (Healthy Control), 1 (PD / Cognitive Impairment)
    """
    np.random.seed(42)
    
    # Healthy Controls (label = 0)
    # Typically faster RTs, smaller Stroop effect, low errors
    n_hc = int(n_samples * 0.8) # 80% healthy in population
    hc_c_rt = np.random.normal(loc=600, scale=100, size=n_hc)
    hc_i_rt = hc_c_rt + np.random.normal(loc=150, scale=50, size=n_hc) # Stroop effect ~150ms
    hc_err = np.clip(np.random.normal(loc=0.03, scale=0.02, size=n_hc), 0, 1)
    
    hc_data = pd.DataFrame({
        'congruent_rt_mean': hc_c_rt,
        'incongruent_rt_mean': hc_i_rt,
        'stroop_effect': hc_i_rt - hc_c_rt,
        'error_rate': hc_err,
        'label': 0
    })
    
    # PD / Impaired (label = 1)
    # Slower overall RTs, significantly larger Stroop effect (executive dysfunction), higher errors
    n_pd = n_samples - n_hc
    pd_c_rt = np.random.normal(loc=850, scale=150, size=n_pd)
    pd_i_rt = pd_c_rt + np.random.normal(loc=350, scale=120, size=n_pd) # Stroop effect ~350ms
    pd_err = np.clip(np.random.normal(loc=0.12, scale=0.08, size=n_pd), 0, 1)
    
    pd_data = pd.DataFrame({
        'congruent_rt_mean': pd_c_rt,
        'incongruent_rt_mean': pd_i_rt,
        'stroop_effect': pd_i_rt - pd_c_rt,
        'error_rate': pd_err,
        'label': 1
    })
    
    # Combine and shuffle
    df = pd.concat([hc_data, pd_data], ignore_index=True)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Add some noise to make it realistic
    df['congruent_rt_mean'] += np.random.normal(0, 20, size=n_samples)
    df['incongruent_rt_mean'] += np.random.normal(0, 30, size=n_samples)
    df.loc[df['congruent_rt_mean'] < 200, 'congruent_rt_mean'] = 200 # Set minimum RT
    df.loc[df['incongruent_rt_mean'] < 250, 'incongruent_rt_mean'] = 250
    df['stroop_effect'] = df['incongruent_rt_mean'] - df['congruent_rt_mean']
    
    return df

def train():
    print("Generating synthetic Stroop cognitive dataset...")
    df = generate_synthetic_stroop_data(2000)
    
    features = ['congruent_rt_mean', 'incongruent_rt_mean', 'stroop_effect', 'error_rate']
    X = df[features]
    y = df['label']
    
    print(f"Dataset shape: {df.shape}")
    print(f"Class distribution:\n{y.value_counts()}")
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Balance training data with SMOTE
    print("Applying SMOTE to balance classes for training...")
    smote = SMOTE(random_state=42)
    X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
    print(f"Resampled training distribution:\n{y_train_res.value_counts()}")
    
    # Train robust Random Forest
    rf = RandomForestClassifier(n_estimators=100, max_depth=5, min_samples_split=10, random_state=42, n_jobs=-1)
    
    # Calibrate probabilities (Isotonic since we have enough data and want well-calibrated risk scores)
    calibrated_rf = CalibratedClassifierCV(rf, method='isotonic', cv=5)
    
    print("Training calibrated model...")
    calibrated_rf.fit(X_train_res, y_train_res)
    
    # Evaluate
    y_pred = calibrated_rf.predict(X_test)
    y_proba = calibrated_rf.predict_proba(X_test)[:, 1]
    
    print("\nEvaluation on Test Set:")
    print(classification_report(y_test, y_pred))
    print(f"ROC-AUC: {roc_auc_score(y_test, y_proba):.4f}")
    
    # Ensure saved_models dir exists
    models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'saved_models')
    os.makedirs(models_dir, exist_ok=True)
    
    # Save model and features
    model_path = os.path.join(models_dir, 'cognition_model.joblib')
    features_path = os.path.join(models_dir, 'cognition_features.joblib')
    
    joblib.dump(calibrated_rf, model_path)
    joblib.dump(features, features_path)
    
    print(f"\nSaved model to {model_path}")
    print(f"Saved features list to {features_path}")

if __name__ == '__main__':
    train()
