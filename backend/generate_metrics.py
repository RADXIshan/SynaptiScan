import os
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import RobustScaler
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline
import xgboost as xgb

# Import specific training functions (we'll just copy the simulation logic into a clean script)

def _print_metrics(name, y_te, y_pred, y_proba=None):
    acc = accuracy_score(y_te, y_pred)
    auc = roc_auc_score(y_te, y_proba) if y_proba is not None else 0.0
    report = classification_report(y_te, y_pred, target_names=['Healthy', 'PD'], output_dict=True, zero_division=0)
    
    print(f"--- {name} ---")
    print(f"Accuracy: {acc:.3f}")
    print(f"ROC-AUC: {auc:.3f}")
    print(f"Healthy F1: {report['Healthy']['f1-score']:.3f}")
    print(f"PD F1: {report['PD']['f1-score']:.3f}")
    print(f"Precision: {report['PD']['precision']:.3f}")
    print(f"Recall: {report['PD']['recall']:.3f}")
    print("-" * 20)

def _build_ensemble(seed=42):
    from xgboost import XGBClassifier
    rf  = RandomForestClassifier(n_estimators=100, random_state=seed, n_jobs=-1)
    gbm = GradientBoostingClassifier(n_estimators=100, random_state=seed)
    xgb_clf = XGBClassifier(n_estimators=100, eval_metric='logloss', random_state=seed)
    from sklearn.svm import SVC
    svm = SVC(kernel='rbf', probability=True, random_state=seed)
    return VotingClassifier(estimators=[('rf', rf), ('gbm', gbm), ('xgb', xgb_clf), ('svm', svm)], voting='soft')

def get_voice_metrics():
    # UCI distribution simulation
    np.random.seed(42)
    n = 500
    labels = np.random.choice([0, 1], size=n, p=[0.25, 0.75])
    pd_m = [150, 200, 100, 0.006, 0.00005, 0.003, 0.003, 0.01, 0.03, 0.3, 0.015, 0.02, 0.02, 0.045, 0.02, 20.0]
    hc_m = [180, 220, 120, 0.002, 0.00001, 0.001, 0.001, 0.003, 0.01, 0.1, 0.005, 0.01, 0.01, 0.015, 0.002, 25.0]
    features = np.zeros((n, 16))
    for i, y in enumerate(labels):
        mu = pd_m if y == 1 else hc_m
        features[i] = np.random.normal(mu, [abs(m)*0.15 + 1e-6 for m in mu])
    X, y = features, labels
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    model = ImbPipeline([('scaler', RobustScaler()), ('smote', SMOTE(random_state=42)), ('clf', _build_ensemble())])
    model.fit(X_tr, y_tr)
    y_pred, y_proba = model.predict(X_te), model.predict_proba(X_te)[:, 1]
    _print_metrics("Voice", y_te, y_pred, y_proba)

def get_keystroke_metrics():
    np.random.seed(1337)
    n = 800
    labels = np.random.choice([0, 1], size=n, p=[0.5, 0.5])
    rows = []
    for y in labels:
        if y == 1:
            mean_dw=np.random.normal(130,25); std_dw=np.random.normal(55,18); dwell_iq=np.random.normal(72,20)
            mean_fl=np.random.normal(320,65); std_fl=np.random.normal(100,30); flight_iq=np.random.normal(130,35)
            t_speed=np.clip(np.random.normal(2.8,0.8), 0.5, 6.0); err=np.clip(np.random.normal(0.06,0.025),0,1)
        else:
            mean_dw=np.random.normal(78,12); std_dw=np.random.normal(16,5); dwell_iq=np.random.normal(20,6)
            mean_fl=np.random.normal(185,32); std_fl=np.random.normal(30,10); flight_iq=np.random.normal(38,12)
            t_speed=np.clip(np.random.normal(6.5,1.2), 2.0, 12.0); err=np.clip(np.random.normal(0.010,0.005),0,1)
        rows.append([mean_dw, std_dw, dwell_iq, mean_fl, std_fl, flight_iq, t_speed, err, y])
    df = pd.DataFrame(rows, columns=['m_dw','s_dw','dw_iq','m_fl','s_fl','fl_iq','speed','err','label'])
    X, y = df.drop('label', axis=1), df['label']
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    model = ImbPipeline([('scaler', RobustScaler()), ('smote', SMOTE(random_state=42)), ('clf', _build_ensemble())])
    model.fit(X_tr, y_tr)
    y_pred, y_proba = model.predict(X_te), model.predict_proba(X_te)[:, 1]
    _print_metrics("Keystroke", y_te, y_pred, y_proba)

def get_mouse_metrics():
    np.random.seed(2023)
    n = 500
    labels = np.random.choice([0, 1], size=n, p=[0.5, 0.5])
    rows = []
    for y in labels:
        if y == 1:
            pl=np.random.normal(1600,350); mt=np.random.normal(4.5,1.2); vj=np.random.normal(170,50); dc=np.clip(np.random.normal(18,6),0,60)
            mv=np.random.normal(1.5,0.4); var=np.random.normal(250,80); sk=np.random.normal(0.8,0.3); ku=np.random.normal(3.5,1.0)
            p1r=np.random.normal(1.2,0.3); p1s=np.random.normal(0.9,0.2)
        else:
            pl=np.random.normal(950,180);  mt=np.random.normal(1.9,0.5); vj=np.random.normal(48,16);  dc=np.clip(np.random.normal(5,2),0,30)
            mv=np.random.normal(0.8,0.2); var=np.random.normal(80,25); sk=np.random.normal(0.2,0.2); ku=np.random.normal(2.2,0.6)
            p1r=np.random.normal(0.6,0.15); p1s=np.random.normal(0.4,0.1)
        av = pl / max(mt, 0.1)
        rows.append([pl,mt,vj,dc,mv,var,sk,ku,p1r,p1s,av,y])
    df = pd.DataFrame(rows, columns=['pl','mt','vj','dc','mv','v','s','k','p1r','p1s','av','label'])
    X, y = df.drop('label', axis=1), df['label']
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    model = ImbPipeline([('scaler', RobustScaler()), ('smote', SMOTE(random_state=42)), ('clf', _build_ensemble())])
    model.fit(X_tr, y_tr)
    y_pred, y_proba = model.predict(X_te), model.predict_proba(X_te)[:, 1]
    _print_metrics("Mouse", y_te, y_pred, y_proba)

def get_tremor_metrics():
    np.random.seed(99)
    n = 500
    labels = np.random.choice([0, 1], size=n, p=[0.5, 0.5])
    rows = []
    for y in labels:
        if y == 1:
            pf=np.random.normal(4.8,0.9); amp=np.random.normal(16.0,5.5); ent=np.clip(np.random.normal(0.38,0.10),0,1)
            tp=np.random.normal(150,40); pw=np.random.normal(80,25); fr=np.random.normal(12,4); p1f=np.random.normal(4.5,1.0); p1e=np.clip(np.random.normal(0.4,0.1),0,1)
        else:
            pf=np.random.normal(9.0,1.5); amp=np.random.normal(2.0,1.0); ent=np.clip(np.random.normal(0.80,0.08),0,1)
            tp=np.random.normal(40,15); pw=np.random.normal(20,8); fr=np.random.normal(4,1.5); p1f=np.random.normal(8.5,1.5); p1e=np.clip(np.random.normal(0.75,0.08),0,1)
        rows.append([pf,amp,ent,tp,pw,fr,p1f,p1e,y])
    df = pd.DataFrame(rows, columns=['pf','a','e','tp','pw','fr','p1f','p1e','label'])
    X, y = df.drop('label', axis=1), df['label']
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    model = ImbPipeline([('scaler', RobustScaler()), ('smote', SMOTE(random_state=42)), ('clf', _build_ensemble())])
    model.fit(X_tr, y_tr)
    y_pred, y_proba = model.predict(X_te), model.predict_proba(X_te)[:, 1]
    _print_metrics("Tremor", y_te, y_pred, y_proba)

def get_handwriting_metrics():
    np.random.seed(1111)
    n = 600
    labels = np.random.choice([0, 1], size=n, p=[0.5, 0.5])
    rows = []
    for y_val in labels:
        if y_val == 1:
            row = [np.random.normal(0.0045, 0.0015), np.random.normal(0.0040, 0.0013), np.random.normal(0.052, 0.015), np.random.normal(0.048, 0.013), np.random.normal(0.00012, 0.00005), np.random.normal(0.00011, 0.00004), np.random.normal(8.5e-6, 3e-6), np.random.normal(7.5e-6, 2.5e-6), np.clip(np.random.normal(6.5, 1.5), 1.0, 15.0), np.clip(np.random.normal(6.2, 1.4), 1.0, 15.0), np.clip(np.random.normal(3.2, 0.8), 0.5, 8.0), np.clip(np.random.normal(3.0, 0.7), 0.5, 8.0), np.random.normal(350.0, 120.0), np.random.normal(4500.0, 900.0), np.random.normal(4200.0, 850.0)]
        else:
            row = [np.random.normal(0.0070, 0.0020), np.random.normal(0.0065, 0.0018), np.random.normal(0.090, 0.020), np.random.normal(0.085, 0.018), np.random.normal(0.00003, 0.00001), np.random.normal(0.00003, 0.00001), np.random.normal(2.0e-6, 6e-7), np.random.normal(1.8e-6, 5e-7), np.clip(np.random.normal(8.7, 1.8), 2.0, 20.0), np.clip(np.random.normal(8.5, 1.7), 2.0, 20.0), np.clip(np.random.normal(4.2, 1.0), 1.0, 10.0), np.clip(np.random.normal(4.0, 0.9), 1.0, 10.0), np.random.normal(50.0, 40.0), np.random.normal(3800.0, 700.0), np.random.normal(3600.0, 650.0)]
        rows.append(row + [y_val])
    df = pd.DataFrame(rows, columns=[f'f{i}' for i in range(15)] + ['label'])
    X, y = df.drop('label', axis=1), df['label']
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    model = ImbPipeline([('scaler', RobustScaler()), ('smote', SMOTE(random_state=42)), ('clf', GradientBoostingClassifier(n_estimators=100))])
    model.fit(X_tr, y_tr)
    y_pred, y_proba = model.predict(X_te), model.predict_proba(X_te)[:, 1]
    _print_metrics("Handwriting", y_te, y_pred, y_proba)

def get_cognition_metrics():
    # Synthetic Stroop logic (similar to train_cognition.py)
    np.random.seed(42)
    n_samples = 20000 # reduced for quick metrics
    n_hc = int(n_samples * 0.85)
    n_hc_fast = int(n_hc * 0.5)
    hc_c_rt_fast = np.random.normal(loc=1100, scale=150, size=n_hc_fast)
    hc_i_rt_fast = hc_c_rt_fast + np.random.normal(loc=150, scale=50, size=n_hc_fast)
    hc_err_fast = np.random.normal(loc=0.05, scale=0.04, size=n_hc_fast)
    n_hc_slow = n_hc - n_hc_fast
    hc_c_rt_slow = np.random.normal(loc=1400, scale=200, size=n_hc_slow)
    hc_i_rt_slow = hc_c_rt_slow + np.random.normal(loc=200, scale=60, size=n_hc_slow)
    hc_err_slow = np.random.normal(loc=0.08, scale=0.05, size=n_hc_slow)
    hc_c_rt = np.concatenate([hc_c_rt_fast, hc_c_rt_slow])
    hc_i_rt = np.concatenate([hc_i_rt_fast, hc_i_rt_slow])
    hc_err = np.clip(np.concatenate([hc_err_fast, hc_err_slow]), 0.0, 1.0)
    hc_data = pd.DataFrame({'c': hc_c_rt, 'i': hc_i_rt, 'e': hc_i_rt - hc_c_rt, 'err': hc_err, 'label': 0})
    n_pd = n_samples - n_hc
    n_pd_mild = int(n_pd * 0.6)
    pd_c_rt_mild = np.random.normal(loc=1800, scale=250, size=n_pd_mild)
    pd_i_rt_mild = pd_c_rt_mild + np.random.normal(loc=350, scale=100, size=n_pd_mild)
    pd_err_mild = np.random.normal(loc=0.20, scale=0.08, size=n_pd_mild)
    n_pd_severe = n_pd - n_pd_mild
    pd_c_rt_severe = np.random.normal(loc=2400, scale=350, size=n_pd_severe)
    pd_i_rt_severe = pd_c_rt_severe + np.random.normal(loc=600, scale=200, size=n_pd_severe)
    pd_err_severe = np.random.normal(loc=0.35, scale=0.12, size=n_pd_severe)
    pd_c_rt = np.concatenate([pd_c_rt_mild, pd_c_rt_severe])
    pd_i_rt = np.concatenate([pd_i_rt_mild, pd_i_rt_severe])
    pd_err = np.clip(np.concatenate([pd_err_mild, pd_err_severe]), 0.0, 1.0)
    pd_data = pd.DataFrame({'c': pd_c_rt, 'i': pd_i_rt, 'e': pd_i_rt - pd_c_rt, 'err': pd_err, 'label': 1})
    df = pd.concat([hc_data, pd_data], ignore_index=True)
    X, y = df.drop('label', axis=1), df['label']
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    # Balanced with SMOTE
    smote = SMOTE(random_state=42)
    X_tr_res, y_tr_res = smote.fit_resample(X_tr, y_tr)
    model = xgb.XGBClassifier(n_estimators=100, random_state=42)
    model.fit(X_tr_res, y_tr_res)
    y_pred, y_proba = model.predict(X_te), model.predict_proba(X_te)[:, 1]
    _print_metrics("Cognition", y_te, y_pred, y_proba)

if __name__ == "__main__":
    get_voice_metrics()
    get_keystroke_metrics()
    get_mouse_metrics()
    get_tremor_metrics()
    get_handwriting_metrics()
    get_cognition_metrics()
