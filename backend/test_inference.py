import sys
import os

# Add the app directory to the path so we can import from ml.models
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'app')))

from ml.models import evaluate_voice, evaluate_keystroke, evaluate_mouse, evaluate_tremor, evaluate_handwriting
from ml.fusion import calculate_global_risk

class MockResult:
    def __init__(self, score, uncertainty):
        self.score = score
        self.uncertainty = uncertainty

def run_tests():
    print("Testing ML inference with empty (default) payloads...")
    
    # 1. Voice
    voice_prob, voice_unc = evaluate_voice("dummy_path.wav")
    print(f"Voice Fallback -> Risk: {voice_prob:.4f}, Uncertainty: {voice_unc:.4f}")
    
    # 2. Keystroke
    key_prob, key_unc = evaluate_keystroke({})
    print(f"Keystroke Fallback -> Risk: {key_prob:.4f}, Uncertainty: {key_unc:.4f}")
    
    # 3. Mouse
    mouse_prob, mouse_unc = evaluate_mouse({})
    print(f"Mouse Fallback -> Risk: {mouse_prob:.4f}, Uncertainty: {mouse_unc:.4f}")
    
    # 4. Tremor
    tremor_prob, tremor_unc = evaluate_tremor("dummy_video.mp4")
    print(f"Tremor Fallback -> Risk: {tremor_prob:.4f}, Uncertainty: {tremor_unc:.4f}")
    
    # 5. Handwriting
    hw_prob, hw_unc = evaluate_handwriting({})
    print(f"Handwriting Fallback -> Risk: {hw_prob:.4f}, Uncertainty: {hw_unc:.4f}")
    
    # Global fusion
    results = [
        MockResult(voice_prob, voice_unc),
        MockResult(key_prob, key_unc),
        MockResult(mouse_prob, mouse_unc),
        MockResult(tremor_prob, tremor_unc),
        MockResult(hw_prob, hw_unc)
    ]
    
    global_risk = calculate_global_risk(results)
    print(f"\nGlobal Fused Risk: {global_risk:.4f}")
    
    if global_risk > 0.4:
         print("FAIL: Global risk too high for a healthy default.")
         sys.exit(1)
    
    print("PASS: Global risk predicts healthy for defaults.")
    sys.exit(0)

if __name__ == "__main__":
    run_tests()
