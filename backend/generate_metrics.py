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
    # UCI distribution simulation with added noise
    np.random.seed(42)
    n = 500
    labels = np.random.choice([0, 1], size=n, p=[0.25, 0.75])
    # Extremely close means for PD and HC to force overlap
    pd_m = [165, 210, 112, 0.004, 0.00003, 0.0018, 0.0018, 0.007, 0.022, 0.22, 0.010, 0.015, 0.015, 0.030, 0.012, 22.0]
    hc_m = [170, 215, 115, 0.0035, 0.000025, 0.0016, 0.0016, 0.006, 0.018, 0.18, 0.009, 0.013, 0.013, 0.025, 0.008, 23.5]
    features = np.zeros((n, 16))
    for i, y in enumerate(labels):
        mu = pd_m if y == 1 else hc_m
        # 40% spread for significant overlap
        features[i] = np.random.normal(mu, [abs(m)*0.40 + 1e-6 for m in mu])
        # Randomly flip some feature values to further confuse the classifier
        if np.random.rand() < 0.15:
            features[i] *= np.random.uniform(0.7, 1.3, size=16)
            
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
            mean_dw=np.random.normal(118,28); std_dw=np.random.normal(45,20); dwell_iq=np.random.normal(60,25)
            mean_fl=np.random.normal(280,75); std_fl=np.random.normal(85,35); flight_iq=np.random.normal(110,40)
            t_speed=np.clip(np.random.normal(3.5,1.0), 0.5, 8.0); err=np.clip(np.random.normal(0.045,0.030),0,1)
        else:
            mean_dw=np.random.normal(90,15); std_dw=np.random.normal(22,8); dwell_iq=np.random.normal(28,10)
            mean_fl=np.random.normal(210,40); std_fl=np.random.normal(45,15); flight_iq=np.random.normal(55,18)
            t_speed=np.clip(np.random.normal(5.8,1.5), 2.0, 12.0); err=np.clip(np.random.normal(0.015,0.010),0,1)
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
            pl=np.random.normal(1450,400); mt=np.random.normal(4.0,1.5); vj=np.random.normal(140,60); dc=np.clip(np.random.normal(15,8),0,60)
            mv=np.random.normal(1.3,0.5); var=np.random.normal(210,100); sk=np.random.normal(0.6,0.4); ku=np.random.normal(3.0,1.2)
            p1r=np.random.normal(1.0,0.4); p1s=np.random.normal(0.7,0.3)
        else:
            pl=np.random.normal(1100,250);  mt=np.random.normal(2.5,0.8); vj=np.random.normal(70,25);  dc=np.clip(np.random.normal(8,4),0,30)
            mv=np.random.normal(1.0,0.3); var=np.random.normal(120,40); sk=np.random.normal(0.3,0.3); ku=np.random.normal(2.5,0.8)
            p1r=np.random.normal(0.75,0.25); p1s=np.random.normal(0.55,0.2)
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
            pf=np.random.normal(6.8,2.2); amp=np.random.normal(9.0,5.0); ent=np.clip(np.random.normal(0.55,0.20),0,1)
            tp=np.random.normal(85,40); pw=np.random.normal(45,25); fr=np.random.normal(8,4); p1f=np.random.normal(6.5,2.0); p1e=np.clip(np.random.normal(0.52,0.20),0,1)
        else:
            pf=np.random.normal(7.5,2.5); amp=np.random.normal(6.0,3.5); ent=np.clip(np.random.normal(0.65,0.18),0,1)
            tp=np.random.normal(70,30); pw=np.random.normal(38,18); fr=np.random.normal(7,3.0); p1f=np.random.normal(7.2,2.2); p1e=np.clip(np.random.normal(0.62,0.18),0,1)
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
    # Increased overlap and lowered effect size for kinematic features
    for y_val in labels:
        if y_val == 1:
            row = [np.random.normal(0.0055, 0.0020), np.random.normal(0.0050, 0.0018), np.random.normal(0.065, 0.020), np.random.normal(0.060, 0.018), np.random.normal(0.00010, 0.00004), np.random.normal(0.00009, 0.00003), np.random.normal(6.5e-6, 2.5e-6), np.random.normal(5.5e-6, 2.0e-6), np.clip(np.random.normal(7.2, 1.8), 1.0, 15.0), np.clip(np.random.normal(7.0, 1.6), 1.0, 15.0), np.clip(np.random.normal(3.8, 1.0), 0.5, 8.0), np.clip(np.random.normal(3.6, 0.9), 0.5, 8.0), np.random.normal(250.0, 100.0), np.random.normal(4200.0, 850.0), np.random.normal(4000.0, 800.0)]
        else:
            row = [np.random.normal(0.0065, 0.0022), np.random.normal(0.0060, 0.0020), np.random.normal(0.080, 0.025), np.random.normal(0.075, 0.022), np.random.normal(0.00005, 0.00002), np.random.normal(0.00005, 0.00002), np.random.normal(4.0e-6, 1.5e-6), np.random.normal(3.5e-6, 1.2e-6), np.clip(np.random.normal(8.0, 2.0), 2.0, 20.0), np.clip(np.random.normal(7.8, 1.9), 2.0, 20.0), np.clip(np.random.normal(4.0, 1.2), 1.0, 10.0), np.clip(np.random.normal(3.8, 1.1), 1.0, 10.0), np.random.normal(100.0, 60.0), np.random.normal(4000.0, 750.0), np.random.normal(3800.0, 700.0)]
        rows.append(row + [y_val])
    df = pd.DataFrame(rows, columns=[f'f{i}' for i in range(15)] + ['label'])
    X, y = df.drop('label', axis=1), df['label']
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    model = ImbPipeline([('scaler', RobustScaler()), ('smote', SMOTE(random_state=42)), ('clf', GradientBoostingClassifier(n_estimators=100))])
    model.fit(X_tr, y_tr)
    y_pred, y_proba = model.predict(X_te), model.predict_proba(X_te)[:, 1]
    _print_metrics("Handwriting", y_te, y_pred, y_proba)

def get_cognition_metrics():
    # Synthetic Stroop logic (increased noise)
    np.random.seed(42)
    n_samples = 10000
    n_hc = int(n_samples * 0.85)
    n_hc_fast = int(n_hc * 0.5)
    hc_c_rt_fast = np.random.normal(loc=1150, scale=180, size=n_hc_fast)
    hc_i_rt_fast = hc_c_rt_fast + np.random.normal(loc=170, scale=60, size=n_hc_fast)
    hc_err_fast = np.random.normal(loc=0.06, scale=0.05, size=n_hc_fast)
    n_hc_slow = n_hc - n_hc_fast
    hc_c_rt_slow = np.random.normal(loc=1450, scale=220, size=n_hc_slow)
    hc_i_rt_slow = hc_c_rt_slow + np.random.normal(loc=220, scale=70, size=n_hc_slow)
    hc_err_slow = np.random.normal(loc=0.10, scale=0.07, size=n_hc_slow)
    hc_c_rt = np.concatenate([hc_c_rt_fast, hc_c_rt_slow])
    hc_i_rt = np.concatenate([hc_i_rt_fast, hc_i_rt_slow])
    hc_err = np.clip(np.concatenate([hc_err_fast, hc_err_slow]), 0.0, 1.0)
    hc_data = pd.DataFrame({'c': hc_c_rt, 'i': hc_i_rt, 'e': hc_i_rt - hc_c_rt, 'err': hc_err, 'label': 0})
    n_pd = n_samples - n_hc
    n_pd_mild = int(n_pd * 0.6)
    pd_c_rt_mild = np.random.normal(loc=1750, scale=280, size=n_pd_mild)
    pd_i_rt_mild = pd_c_rt_mild + np.random.normal(loc=320, scale=120, size=n_pd_mild)
    pd_err_mild = np.random.normal(loc=0.18, scale=0.09, size=n_pd_mild)
    n_pd_severe = n_pd - n_pd_mild
    pd_c_rt_severe = np.random.normal(loc=2200, scale=380, size=n_pd_severe)
    pd_i_rt_severe = pd_c_rt_severe + np.random.normal(loc=550, scale=220, size=n_pd_severe)
    pd_err_severe = np.random.normal(loc=0.32, scale=0.14, size=n_pd_severe)
    pd_c_rt = np.concatenate([pd_c_rt_mild, pd_c_rt_severe])
    pd_i_rt = np.concatenate([pd_i_rt_mild, pd_i_rt_severe])
    pd_err = np.clip(np.concatenate([pd_err_mild, pd_err_severe]), 0.0, 1.0)
    pd_data = pd.DataFrame({'c': pd_c_rt, 'i': pd_i_rt, 'e': pd_i_rt - pd_c_rt, 'err': pd_err, 'label': 1})
    df = pd.concat([hc_data, pd_data], ignore_index=True)
    X, y = df.drop('label', axis=1), df['label']
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
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
