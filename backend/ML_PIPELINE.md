# SynaptiScan ML Pipeline — Technical Deep Dive

This document provides a comprehensive technical and scientific breakdown of the SynaptiScan machine learning suite. It covers feature engineering, dataset origins, mathematical corrections, and training protocols.

---

## 1. System Overview & Philosophy

SynaptiScan is designed to bridge the gap between **clinical datasets** (often high-quality but small and imbalanced) and **web-based screening** (noisy sensor data, low-fidelity environments). 

The pipeline is split into three distinct layers:
1.  **Hardware-Agnostic Extraction**: Converting browser-level noise into physiological proxies (Hz, ms, kinematics).
2.  **Calibrated Inference**: Using ensemble models with isotonic calibration to ensure risk scores are actual probabilities.
3.  **Bayesian Prior Correction**: Adjusting clinical models to general screening populations.

---

## 2. Feature Engineering & Extraction

### 2.1 Acoustic Voice Analysis (MDVP)
We use the **Multi-Dimensional Voice Program (MDVP)** schema, a standard in clinical voice pathology.

| Feature Category | Description | Significance in Parkinson's |
| :--- | :--- | :--- |
| **Fundamental Frequency (Fo)** | The base pitch of the voice. | PD patients often show a restricted pitch range (monotone). |
| **Jitter (Frequency Perturbation)** | Short-term variability in pitch periods. | Reflects lack of motor control over vocal fold tension. |
| **Shimmer (Amplitude Perturbation)** | Short-term variability in volume/amplitude. | Indicates instability in the glottal cycle. |
| **NHR / HNR** | Noise-to-Harmonic / Harmonic-to-Noise Ratio. | PD voices often contain breathiness or "hoarseness" (increased noise). |

**Preprocessing**: Audio is converted to WAV using FFmpeg. Extraction is performed via `parselmouth` (Python wrapper for **Praat**), measuring pitch at 75–600Hz as per clinical standards.

### 2.2 Keystroke Dynamics (Arroyo-Gallego Schema)
Based on the **Arroyo-Gallego et al. (2017)** research on the Tappy dataset.

- **Dwell Time**: Time key is held (`up - down`). PD patients often show elongated and highly variable dwell times.
- **Flight Time**: Inter-key interval. PD patients show slower, halting flight times.
- **Dwell/Flight IQR**: The Inter-Quartile Range (IQR) captures the *variability* which is often more diagnostic than the mean in early stages.
- **Typing Speed**: Normalized characters per second, adjusted for backspaces.

### 2.3 Mouse Trajectory & Accelerometer Proxies
Since we lack a physical wrist accelerometer, we derive proxies from 2D mouse coordinates using 60Hz browser polling.

- **Kinematic**: Path length, velocity jitter (acceleration bursts), and direction changes (zero-crossing rate of velocity).
- **ALAMEDA Proxies**: We map velocity to "G-force" proxies (`A_SCALE = 0.001`).
  - **Skewness/Kurtosis**: Captures the "peakedness" of movement bursts, differentiating smooth HC (Healthy Control) movements from jerky PD movements.
  - **PC1 RMS**: Principal Component Analysis (PCA) used to find the dominant axis of movement instability.

### 2.4 Vision-Based Tremor (MediaPipe + FFT)
- **Tracking**: MediaPipe HandLandmarker tracks Landmark 0 (Wrist) in real-time.
- **Signal Processing**: 
  1.  **Displacement Vector**: `sqrt(dx² + dy²)` isolated from the wrist landmarker.
  2.  **Detrending**: Slow drifting (arm movement) is removed via linear detrending.
  3.  **Spectral Analysis**: Fast Fourier Transform (FFT) generates the power spectrum.
  4.  **Physiological Bandpass**: Power is isolated strictly within **3Hz - 12Hz**, the band where Parkinsonian rest tremor and postural tremor typically reside.
- **Features**: Spectral Entropy (randomness of tremor) and Peak Frequency (Hz).

### 2.5 Handwriting & Kinematics (shubhamjha97 Schema)
Drawings are analyzed using kinematic features derived from the shubhamjha97 dataset.

- **NCV (Number of Changes in Velocity)**: Sign changes in the first derivative of velocity.
- **NCA (Number of Changes in Acceleration)**: Sign changes in the second derivative of velocity.
- **Normalization**: To ensure device agnosticism (Mouse @ 60Hz vs. Stylus @ 100Hz), NCV and NCA are converted to **Per-Second Rates**.
- **Scaling (`0.00002`)**: A heuristic constant derived from mapping screen-space pixels/sec to the physical millimeter/sec units found in high-accuracy clinical tablet datasets.

---

## 3. Mathematical Corrections (Bayes & Prior)

### 3.1 The Problem: Clinical Prevalance
Public datasets (UCI, Tappy) are "clinical" — they usually have ~75% PD labels. If used directly, a model will predict ~75% risk for any ambiguous input. This is inappropriate for general screening where prevalence is ~1–2%.

### 3.2 The Solution: Logit-Offset Correction
In `models.py`, we apply a Bayesian correction to shift the model's "prior" belief.

**The Math**:
Given a dataset with prevalence $P_{data}$ and a target population with prevalence $P_{target}$:
$$ \text{logit}_{corrected} = \text{logit}_{raw} + \ln\left(\frac{P_{target}}{1 - P_{target}}\right) - \ln\left(\frac{P_{data}}{1 - P_{data}}\right) $$

**Values used in SynaptiScan**:
- $P_{target}$ = 0.05 (A conservative 5% screening baseline).
- $P_{data}$ = 0.75 (Average clinical dataset imbalance).

---

## 4. Model Training & Optimization

### 4.1 Class Balancing (SMOTE)
Almost all models use **SMOTE (Synthetic Minority Over-sampling Technique)**. Instead of just duplicating healthy samples, SMOTE creates synthetic "bridges" between existing minority samples in high-dimensional feature space, preventing the model from overfitting to specific noise patterns.

### 4.2 Robust Scaling
We use `RobustScaler()` instead of `StandardScaler()` for sensor data.
- **StandardScaler**: Sensitive to outliers (extreme mouse jerks or background noise). 
- **RobustScaler**: Centers and scales based on the median and Inter-Quartile Range (IQR), making it resilient to the extreme 1% of noisy sensor data.

### 4.3 Model Ensembles
The primary models are **Soft-Voting Ensembles** (RF + GBM + XGB + SVM).
- **Random Forest**: Captures broad feature correlations.
- **Gradient Boosting (GBM/XGB)**: Focuses on hard-to-classify edge cases.
- **SVM**: Finds optimal linear/non-linear separation boundaries.

---

## 5. Technology Stack & Dependency Reference

The SynaptiScan ML pipeline relies on a curated stack of high-performance libraries for feature extraction, signal processing, and model lifecycle management.

### 5.1 Core Machine Learning
| Library | Purpose | Key Usage |
| :--- | :--- | :--- |
| **scikit-learn** | General ML Framework | Preprocessing (`RobustScaler`), Pipelines, Ensemble Voting, SVM, Random Forest, and Metrics. |
| **XGBoost** | Gradient Boosting | Primary engine for the **Cognition** model and sub-component of general ensembles. |
| **imbalanced-learn** | Class Balancing | Implementation of **SMOTE** and **ADASYN** for synthetic over-sampling of minority classes. |

### 5.2 Feature Extraction & Signal Processing
| Library | Purpose | Key Usage |
| :--- | :--- | :--- |
| **MediaPipe** | Computer Vision | HandLandmarker for real-time **Wrist (Landmark 0)** tracking in Tremor analysis. |
| **Praat (parselmouth)** | Audio Analysis | Extraction of **MDVP** acoustic features (Jitter, Shimmer, NHR, HNR) from voice recordings. |
| **OpenCV (cv2)** | Video Handling | Frame-by-frame processing of tremor videos before MediaPipe analysis. |
| **SciPy** | Signal Processing | Detrending, FFT, and spectral entropy calculations for tremor and kinematics. |
| **imageio-ffmpeg** | Media Conversion | System-independent FFmpeg wrapper used to convert browser `.webm` audio to `.wav`. |

### 5.3 Data Infrastructure & Serialization
| Library | Purpose | Key Usage |
| :--- | :--- | :--- |
| **Joblib** | Model Serialization | Efficient storage and lazy-loading of `.joblib` model and feature artifacts. |
| **Pandas / NumPy** | Data Manipulation | High-performance dataframe operations and numerical vectorization (FFT, derivatives). |
| **Requests** | Data Acquisition | Automated downloading of public datasets (UCI, PhysioNet, Zenodo) during training. |

---

## 6. Execution Guide

### Prerequisites
- **Python 3.9+**
- **FFmpeg**: System-level installation required for Voice/Video processing.
- **MediaPipe**: For hand tracking.

### Training the Models
To retrain the diagnostic suite, navigate to the `backend` directory and run:

```bash
# Train the 5 primary sensor models
python app/ml/training/train_models.py

# Train the cognition/Stroop model
python app/ml/training/train_cognition.py
```

### Verification
Each training script outputs a `classification_report` and `ROC-AUC` score. Features are automatically saved to `saved_models/` as `.joblib` files, which are then lazily loaded by the inference engine in `models.py`.

---

## 6. Scientific References
- **Arroyo-Gallego et al. (2017)**: *Detection of Motor Impairment in Parkinson's Disease via Mobile Touchscreen.*
- **UCI Machine Learning Repository**: *Parkinson's Disease Data Set (Little et al., 2007).*
- **Zenodo ALAMEDA**: *PD Tremor Dataset (10782573).*
- **shubhamjha97**: *Parkinson Detection Kinematic Drawing Features.*
