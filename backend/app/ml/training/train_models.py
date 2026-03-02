import os
import pandas as pd
import numpy as np
import requests
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import io

SAVED_MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'saved_models')
os.makedirs(SAVED_MODELS_DIR, exist_ok=True)

def train_voice_model():
    print("Training Voice Model using UCI Parkinson's Dataset...")
    url = "https://archive.ics.uci.edu/ml/machine-learning-databases/parkinsons/parkinsons.data"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        df = pd.read_csv(io.StringIO(response.text))
        print("Successfully downloaded UCI Voice Dataset.")
    except Exception as e:
        print(f"Failed to download dataset. Using fallback simulated data mimicking the actual distributions. Error: {e}")
        np.random.seed(42)
        n_samples = 300  # Increased for better balanced testing
        labels = np.random.choice([0, 1], size=n_samples, p=[0.5, 0.5])
        features = np.zeros((n_samples, 22))
        for i, y in enumerate(labels):
            if y == 1: # PD
                features[i] = np.random.normal(loc=[150, 200, 100, 0.006, 0.00005, 0.003, 0.003, 0.01, 0.03, 0.3, 0.015, 0.02, 0.02, 0.045, 0.02, 20.0, 0.5, 0.7, -5.0, 0.3, 2.5, 0.3], scale=0.1)
            else:      # Healthy
                features[i] = np.random.normal(loc=[180, 220, 120, 0.002, 0.00001, 0.001, 0.001, 0.003, 0.01, 0.1, 0.005, 0.01, 0.01, 0.015, 0.002, 25.0, 0.4, 0.6, -6.5, 0.2, 2.0, 0.1], scale=0.1)
        columns = ['MDVP:Fo(Hz)', 'MDVP:Fhi(Hz)', 'MDVP:Flo(Hz)', 'MDVP:Jitter(%)', 'MDVP:Jitter(Abs)', 'MDVP:RAP', 'MDVP:PPQ', 'Jitter:DDP', 'MDVP:Shimmer', 'MDVP:Shimmer(dB)', 'Shimmer:APQ3', 'Shimmer:APQ5', 'MDVP:APQ', 'Shimmer:DDA', 'NHR', 'HNR', 'RPDE', 'DFA', 'spread1', 'spread2', 'D2', 'PPE']
        df = pd.DataFrame(features, columns=columns)
        df['status'] = labels
        df['name'] = [f'id_{i}' for i in range(n_samples)]

    X = df.drop(['name', 'status'], axis=1)
    y = df['status']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    print(f"Voice Model Accuracy: {accuracy_score(y_test, y_pred):.2f}")
    
    model_path = os.path.join(SAVED_MODELS_DIR, 'voice_model.joblib')
    joblib.dump(model, model_path)
    joblib.dump(list(X.columns), os.path.join(SAVED_MODELS_DIR, 'voice_features.joblib'))
    print(f"Voice Model saved to {model_path}\n")

def train_keystroke_model():
    print("Training Keystroke Model with simulated realistic distributions...")
    np.random.seed(1337)
    n_samples = 500
    labels = np.random.choice([0, 1], size=n_samples, p=[0.5, 0.5])
    
    X = []
    for y in labels:
        if y == 1:
            dwell_mean = np.random.normal(120, 20)
            dwell_std = np.random.normal(40, 10)
            flight_mean = np.random.normal(300, 50)
            flight_std = np.random.normal(80, 20)
            error_rate = np.random.normal(0.05, 0.02)
        else:
            dwell_mean = np.random.normal(80, 10)
            dwell_std = np.random.normal(15, 5)
            flight_mean = np.random.normal(200, 30)
            flight_std = np.random.normal(30, 10)
            error_rate = np.random.normal(0.01, 0.005)
        X.append([dwell_mean, dwell_std, flight_mean, flight_std, max(0, error_rate)])
        
    X = pd.DataFrame(X, columns=['mean_dwell_time', 'std_dwell_time', 'mean_flight_time', 'std_flight_time', 'error_rate'])
    y = pd.Series(labels)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    print(f"Keystroke Model Accuracy: {accuracy_score(y_test, y_pred):.2f}")
    
    model_path = os.path.join(SAVED_MODELS_DIR, 'keystroke_model.joblib')
    joblib.dump(model, model_path)
    print(f"Keystroke Model saved to {model_path}\n")

def train_mouse_model():
    print("Training Mouse Movement Model...")
    np.random.seed(2023)
    n_samples = 400
    labels = np.random.choice([0, 1], size=n_samples, p=[0.5, 0.5])
    
    X = []
    for y in labels:
        if y == 1:
            path_len = np.random.normal(1500, 300)
            mov_time = np.random.normal(4.0, 1.0)
            vel_jitter = np.random.normal(150, 40)
            dir_changes = np.random.normal(15, 5)
        else:
            path_len = np.random.normal(1000, 150)
            mov_time = np.random.normal(2.0, 0.5)
            vel_jitter = np.random.normal(50, 15)
            dir_changes = np.random.normal(5, 2)
            
        avg_vel = path_len / mov_time
        X.append([path_len, mov_time, avg_vel, vel_jitter, int(max(0, dir_changes))])
        
    X = pd.DataFrame(X, columns=['path_length', 'movement_time', 'average_velocity', 'velocity_jitter', 'direction_changes'])
    y = pd.Series(labels)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    print(f"Mouse Model Accuracy: {accuracy_score(y_test, y_pred):.2f}")
    
    model_path = os.path.join(SAVED_MODELS_DIR, 'mouse_model.joblib')
    joblib.dump(model, model_path)
    print(f"Mouse Model saved to {model_path}\n")

def train_tremor_model():
    print("Training Tremor Movement Model...")
    np.random.seed(99)
    n_samples = 300
    labels = np.random.choice([0, 1], size=n_samples, p=[0.5, 0.5])
    
    X = []
    for y in labels:
        if y == 1:
            peak_freq = np.random.normal(5.0, 0.8)
            amplitude = np.random.normal(15.0, 5.0)
            entropy = np.random.normal(0.4, 0.1)
        else:
            peak_freq = np.random.normal(9.0, 1.5)
            amplitude = np.random.normal(2.0, 1.0)
            entropy = np.random.normal(0.8, 0.1)
            
        X.append([peak_freq, amplitude, max(0, entropy)])
        
    X = pd.DataFrame(X, columns=['peak_frequency_hz', 'amplitude_mean', 'spectral_entropy'])
    y = pd.Series(labels)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    print(f"Tremor Model Accuracy: {accuracy_score(y_test, y_pred):.2f}")
    
    model_path = os.path.join(SAVED_MODELS_DIR, 'tremor_model.joblib')
    joblib.dump(model, model_path)
    print(f"Tremor Model saved to {model_path}\n")

def train_handwriting_model():
    print("Training Handwriting Model...")
    np.random.seed(1111)
    n_samples = 450
    labels = np.random.choice([0, 1], size=n_samples, p=[0.5, 0.5])
    
    X = []
    for y in labels:
        if y == 1:
            velocity = np.random.normal(15.0, 4.0)
            air_time = np.random.normal(1.5, 0.5)
            deviation = np.random.normal(50.0, 15.0)
            pressure_var = np.random.normal(8.0, 2.0)
        else:
            velocity = np.random.normal(35.0, 6.0)
            air_time = np.random.normal(0.2, 0.1)
            deviation = np.random.normal(20.0, 5.0)
            pressure_var = np.random.normal(3.0, 1.0)
            
        X.append([velocity, max(0, air_time), deviation, pressure_var])
        
    X = pd.DataFrame(X, columns=['drawing_velocity', 'air_time', 'layout_deviation', 'pressure_variation'])
    y = pd.Series(labels)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    print(f"Handwriting Model Accuracy: {accuracy_score(y_test, y_pred):.2f}")
    
    model_path = os.path.join(SAVED_MODELS_DIR, 'handwriting_model.joblib')
    joblib.dump(model, model_path)
    print(f"Handwriting Model saved to {model_path}\n")

if __name__ == "__main__":
    print("--- Starting ML Training Pipeline ---")
    train_voice_model()
    train_keystroke_model()
    train_mouse_model()
    train_tremor_model()
    train_handwriting_model()
    print("--- Training Complete ---")
