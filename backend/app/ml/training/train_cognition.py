import os
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import classification_report, roc_auc_score
from imblearn.over_sampling import SMOTE
import joblib

def generate_synthetic_stroop_data(n_samples=100000):
    """
    Generates high-fidelity synthetic Stroop test data mimicking clinical distributions.
    Uses non-linear distributions (Gaussian mixtures) to create overlapping and edge cases
    between healthy controls and those with cognitive impairment / executive dysfunction.
    
    Features:
    - congruent_rt_mean: Reaction time for matching words/colors (ms)
    - incongruent_rt_mean: Reaction time for mismatching words/colors (ms)
    - stroop_effect: Incongruent RT - Congruent RT
    - error_rate: Percentage of incorrect responses (0-1)
    
    Target:
    - label: 0 (Healthy Control), 1 (PD / Cognitive Impairment)
    """
    np.random.seed(42)
    
    # Healthy Controls (label = 0) ~85% of population
    n_hc = int(n_samples * 0.85)

    # Sub-population 1: Young/Fast healthy (50% of healthy)
    n_hc_fast = int(n_hc * 0.5)
    hc_c_rt_fast = np.random.normal(loc=1100, scale=150, size=n_hc_fast)
    hc_i_rt_fast = hc_c_rt_fast + np.random.normal(loc=150, scale=50, size=n_hc_fast)
    hc_err_fast = np.random.exponential(scale=0.02, size=n_hc_fast)

    # Sub-population 2: Older/Slower healthy (50% of healthy)
    n_hc_slow = n_hc - n_hc_fast
    hc_c_rt_slow = np.random.normal(loc=1400, scale=200, size=n_hc_slow)
    hc_i_rt_slow = hc_c_rt_slow + np.random.normal(loc=200, scale=60, size=n_hc_slow)
    hc_err_slow = np.random.exponential(scale=0.04, size=n_hc_slow)

    hc_c_rt = np.concatenate([hc_c_rt_fast, hc_c_rt_slow])
    hc_i_rt = np.concatenate([hc_i_rt_fast, hc_i_rt_slow])
    hc_err = np.clip(np.concatenate([hc_err_fast, hc_err_slow]), 0.0, 1.0)

    hc_data = pd.DataFrame({
        'congruent_rt_mean': hc_c_rt,
        'incongruent_rt_mean': hc_i_rt,
        'stroop_effect': hc_i_rt - hc_c_rt,
        'error_rate': hc_err,
        'label': 0
    })
    
    # PD / Impaired (label = 1) ~15% of population
    n_pd = n_samples - n_hc
    
    # Sub-population 1: Mild impairment (60% of impaired) - highly overlapping with slow healthies
    n_pd_mild = int(n_pd * 0.6)
    pd_c_rt_mild = np.random.normal(loc=1800, scale=250, size=n_pd_mild)
    pd_i_rt_mild = pd_c_rt_mild + np.random.normal(loc=350, scale=100, size=n_pd_mild)
    pd_err_mild = np.random.normal(loc=0.08, scale=0.04, size=n_pd_mild)

    # Sub-population 2: Severe impairment (40% of impaired)
    n_pd_severe = n_pd - n_pd_mild
    pd_c_rt_severe = np.random.normal(loc=2400, scale=350, size=n_pd_severe)
    pd_i_rt_severe = pd_c_rt_severe + np.random.normal(loc=600, scale=200, size=n_pd_severe)
    pd_err_severe = np.random.normal(loc=0.18, scale=0.09, size=n_pd_severe)

    pd_c_rt = np.concatenate([pd_c_rt_mild, pd_c_rt_severe])
    pd_i_rt = np.concatenate([pd_i_rt_mild, pd_i_rt_severe])
    pd_err = np.clip(np.concatenate([pd_err_mild, pd_err_severe]), 0.0, 1.0)
    
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
    
    # Add non-linear noise
    df['congruent_rt_mean'] += np.random.laplace(0, 15, size=n_samples)
    df['incongruent_rt_mean'] += np.random.laplace(0, 25, size=n_samples)
    
    # Bound constraints
    df.loc[df['congruent_rt_mean'] < 200, 'congruent_rt_mean'] = 200
    df.loc[df['incongruent_rt_mean'] < 250, 'incongruent_rt_mean'] = 250
    
    # Recalculate true Stroop effect after noise
    df['stroop_effect'] = df['incongruent_rt_mean'] - df['congruent_rt_mean']
    
    return df

def train():
    print("Generating high-fidelity synthetic Stroop cognitive dataset (100,000 samples)...")
    df = generate_synthetic_stroop_data(100000)
    
    features = ['congruent_rt_mean', 'incongruent_rt_mean', 'stroop_effect', 'error_rate']
    X = df[features]
    y = df['label']
    
    print(f"Dataset shape: {df.shape}")
    print(f"Class distribution:\n{y.value_counts()}")
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print("Applying SMOTE to balance classes for training...")
    smote = SMOTE(random_state=42)
    X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
    print(f"Resampled training distribution:\n{y_train_res.value_counts()}")
    
    # Setup XGBoost and Hyperparameter Grid
    print("Beginning XGBoost Hyperparameter Tuning...")
    xgb_base = xgb.XGBClassifier(
        objective='binary:logistic',
        eval_metric='auc',
        random_state=42,
        n_jobs=-1
    )

    param_grid = {
        'max_depth': [4, 6],
        'learning_rate': [0.05, 0.1],
        'n_estimators': [100, 200],
        'subsample': [0.8, 1.0],
    }

    grid_search = GridSearchCV(
        estimator=xgb_base,
        param_grid=param_grid,
        scoring='roc_auc',
        cv=3,
        n_jobs=-1,
        verbose=1
    )

    grid_search.fit(X_train_res, y_train_res)
    best_xgb = grid_search.best_estimator_
    print(f"Best XGBoost Params: {grid_search.best_params_}")
    
    # Calibrate probabilities (Isotonic for well-calibrated risk scores)
    print("Training isotonic probability calibrator on best XGBoost model...")
    calibrated_xgb = CalibratedClassifierCV(best_xgb, method='isotonic', cv=5)
    calibrated_xgb.fit(X_train_res, y_train_res)
    
    # Evaluate
    y_pred = calibrated_xgb.predict(X_test)
    y_proba = calibrated_xgb.predict_proba(X_test)[:, 1]
    
    print("\nEvaluation on Test Set:")
    print(classification_report(y_test, y_pred))
    print(f"ROC-AUC: {roc_auc_score(y_test, y_proba):.4f}")
    
    # Ensure saved_models dir exists
    models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'saved_models')
    os.makedirs(models_dir, exist_ok=True)
    
    # Save model and features
    model_path = os.path.join(models_dir, 'cognition_model.joblib')
    features_path = os.path.join(models_dir, 'cognition_features.joblib')
    
    joblib.dump(calibrated_xgb, model_path)
    joblib.dump(features, features_path)
    
    print(f"\nSaved best model to {model_path}")
    print(f"Saved features list to {features_path}")

if __name__ == '__main__':
    train()
