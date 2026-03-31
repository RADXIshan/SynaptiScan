import os
import sys

# Add backend dir to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.ml.models import evaluate_voice
import pandas as pd

df = pd.read_csv('https://raw.githubusercontent.com/Mr-Imperium/Parkinson-Disease-Pred/main/parkinsons.data')

from app.ml.training.train_models import VOICE_FEATURES

# Healthy cases: status == 0
healthy_df = df[df['status'] == 0][VOICE_FEATURES]
pd_df = df[df['status'] == 1][VOICE_FEATURES]

print("Evaluating 5 Healthy cases:")
for i in range(5):
    features = healthy_df.iloc[i].tolist()
    print(evaluate_voice(features))

print("\nEvaluating 5 PD cases:")
for i in range(5):
    features = pd_df.iloc[i].tolist()
    print(evaluate_voice(features))
