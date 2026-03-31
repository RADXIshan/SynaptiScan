import os
import sys

# Add backend dir to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.ml.models import evaluate_voice
from app.ml.features import extract_voice_features
import numpy as np

hc_m = [
    180.0, 220.0, 120.0, 0.004, 0.00003, 0.002, 0.002, 0.006,
    0.02, 0.2, 0.01, 0.01, 0.015, 0.03, 0.01, 22.0
]
pd_m = [
    150.0, 200.0, 100.0, 0.006, 0.00005, 0.003, 0.003, 0.01,
    0.03, 0.3, 0.015, 0.02, 0.02, 0.045, 0.02, 20.0
]

print("Evaluating hc_m fallback:", evaluate_voice(hc_m))
print("Evaluating pd_m fallback:", evaluate_voice(pd_m))

# Let's create a perfect sine wave and evaluate it
import wave
import struct

def synthesize_audio(filename, freq=180, duration=3.0, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        for i in range(num_samples):
            value = int(32767.0 * np.sin(2.0 * np.pi * freq * i / sample_rate))
            data = struct.pack('<h', value)
            wav_file.writeframesraw(data)

os.makedirs("/tmp", exist_ok=True)
dummy_audio = "/tmp/dummy_test_voice.wav"
synthesize_audio(dummy_audio)

print("Extracting features from perfect sine wave...")
extracted = extract_voice_features(dummy_audio)
print("Extracted features:", extracted)
if extracted and len(extracted) == 16:
    print("Evaluating extracted sine wave:", evaluate_voice(extracted))
else:
    print("Extraction failed or gave wrong length.")
