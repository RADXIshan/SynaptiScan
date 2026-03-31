# SynaptiScan ML Pipeline — Technical Breakdown

This document provides a comprehensive technical and scientific breakdown of the SynaptiScan machine learning suite. It is structured to detail explicitly how features are extracted from the frontend, calculated in the backend, modelled, and trained.

---

## 1. System Overview & Philosophy

SynaptiScan bridges the gap between **clinical datasets** (often high-quality but small and imbalanced) and **web-based screening** (noisy sensor data, low-fidelity environments). 

The pipeline handles data natively through a strict three-layer progression:
1.  **Frontend Preprocessing**: Recording raw input events natively in the browser natively (audio blobs, x-y coordinates, keydown events).
2.  **Backend Calculation**: Signal processing, numerical derivation, and proxy-mapping hardware events into standardized clinical features.
3.  **Model Inference & Training**: Using calibrated ensemble pipelines fortified against class imbalance and scaled for outlier detection.

---

## 2. Feature Extraction, Preprocessing & Model Training Protocols

This section lists the comprehensive flow for each discrete diagnostic model.

### 2.1 Acoustic Voice Analysis (MDVP)
*   **Data Source**: GitHub mirror of the UCI Parkinson's Dataset (195 clinical recordings) mapped to 16 key Multi-Dimensional Voice Program (MDVP) features.
*   **Frontend Preprocessing**: The user speaks a sustained vowel ("ahhh") into their microphone via the web browser. The frontend captures the raw audio and encodes it into a compressed `.webm` blob. This blob is transferred to the backend.
*   **Backend Calculation**:
    *   The backend retrieves the `.webm` file and leverages system-level `FFmpeg` to convert the browser audio stream to the standard, uncompressed clinical format (`.wav`).
    *   It calculates 16 MDVP features, such as `MDVP:Fo(Hz)` (fundamental frequency/pitch), `MDVP:Jitter(%)`, `MDVP:Shimmer`, `NHR` (noise-to-harmonic ratio), and `HNR` using `parselmouth` (the Python implementation of **Praat**). Preprocessing mandates measuring pitch strictly within a defined 75–600Hz frequency envelope.
*   **Training Protocol**:
    *   **Class Balancing:** Raw clinical data is deeply imbalanced towards positive cases (often 75% PD). The pipeline injects **SMOTE** (Synthetic Minority Over-sampling Technique) to algorithmically rebalance the training classes.
    *   **Architecture:** Features are scaled strictly dynamically using a `RobustScaler` (which is highly resistant to extreme webcam/mic noise) and piped into a Calibrated Soft-Voting Ensemble containing `RandomForest`, `GBM`, `XGBoost`, and `SVM`.

### 2.2 Keystroke Dynamics
*   **Data Source**: PhysioNet Tappy Dataset (~200 users mapped to 8 macro keystroke variability features).
*   **Frontend Preprocessing**: A diagnostic web component asks the user to type a short passage. The browser intrinsically tracks typing behavior by capturing exact millisecond timestamps mapped respectively to `keydown` and `keyup` Javascript events.
*   **Backend Calculation**:
    *   The backend consumes the raw event timeline to isolate single-key characteristics.
    *   **Base components**: It calculates **Dwell Time** (`keyup` - `keydown`) and **Flight Time** (gap between a key release and the next key depression).
    *   **Final Feature Vectors**: Based on Arroyo-Gallego et al. (2017), the backend extracts 8 derived features: `mean_dwell_time`, `std_dwell_time`, `dwell_iqr`, `mean_flight_time`, `std_flight_time`, `flight_iqr` (emphasizing variability over direct speed), overall `typing_speed` (chars/sec), and `error_rate`.
*   **Training Protocol**: Uses the unified ImbPipeline (RobustScaler → SMOTE) leading into the standard Soft-Voting Ensemble. Output confidence is bound tightly via `CalibratedClassifierCV` (Isotonic mapping) to simulate accurate prior probabilities. 

### 2.3 Mouse Dynamics & Accelerometer Proxies
*   **Data Source**: Zenodo ALAMEDA Accelerometer Dataset. Translated functionally into 10 mapped features.
*   **Frontend Preprocessing**: While completing tasks, a web listener monitors intrinsic `mousemove` events, buffering the `(x, y)` coordinate trail against highly accurate timestamps at a nominal 60Hz browser polling rate.
*   **Backend Calculation**:
    *   Since browsers lack dedicated physical accelerometer sensors, the backend synthesizes "G-force" numerical proxies mathematically from the displacement timeline.
    *   **Derivation**: Calculates vector length per polling slice to establish velocity, and the delta between steps to construct acceleration. A heuristic multiplier (`A_SCALE = 0.001`) normalizes these pixel-based derivations to clinical units.
    *   **Features Formed**: Extracts 10 robust ALAMEDA metric equivalents including `path_length` (Magnitude_rms proxy), `movement_time`, `velocity_jitter`, `direction_changes`, `skewness` (burst asymmetry), `kurtosis` (kinetic peakedness/jumpiness), and `pc1_rms` / `pc1_std` (identifying dominant instability axes using PCA).
*   **Training Protocol**: Uses `RobustScaler` coupled with the SMOTE integration and outputs inference via the Soft-Voting Ensemble architecture.

### 2.4 Vision-Based Tremor (MediaPipe + FFT)
*   **Data Source**: Zenodo ALAMEDA format (adapted entirely for 8 pure spectral parameters).
*   **Frontend Preprocessing**: The frontend accesses the user's localized webcam to process live frames via Google's `MediaPipe HandLandmarker` API. It securely flattens the video to purely spatial landmark arrays without streaming sensitive visual data, natively sending the isolated spatial coordinates for **Landmark 0 (the wrist)**.
*   **Backend Calculation**:
    *   **Euclidean Displacement**: Converts 2D coordinate deltas to a singular spatial displacement vector `sqrt(dx² + dy²)`.
    *   **Detrending**: A signal processing layer subtracts slow, linear arm displacement (drifting) in order to strictly isolate high-frequency tremor oscillations.
    *   **FFT Application**: Runs a Fast Fourier Transform (FFT) sequence over the signal, enforcing a strict **3Hz - 12Hz** physiological bandpass filter (matching the standard clinical signature bounds for Parkinsonian rest-tremor). 
    *   **Features Formed**: 8 pure spectral outputs including `peak_frequency_hz`, `amplitude_mean`, `spectral_entropy` (randomness/noisiness of movement), and `total_power`.
*   **Training Protocol**: Trained dynamically against synthetic clinical data bridges via SMOTE and an Isotonic Calibrated Ensemble, providing tremor risk without needing external wearables.

### 2.5 Handwriting & Kinematic Tracking
*   **Data Source**: Shubhamjha97 Kinematic Dataset (77 high-fidelity spiral/meander clinical recordings) expanded securely into 15 dynamic features.
*   **Frontend Preprocessing**: The React frontend houses an interactive canvas element tracking continuous drawing interactions (touch or mouse). High-resolution spatial vectors `(x, y)` and granular sequence timings (`t`) are continuously retained and transmitted.
*   **Backend Calculation**:
    *   Numerical arrays calculate dynamic state metrics using first derivatives for continuous velocity, and second discrete derivatives for localized acceleration and jerk.
    *   **Normalization Layer**: Converts variables strictly to **Per-Second Intercept Rates**. This isolates logic from hardware desynchronizations (general web canvas 60Hz polling vs. high-fidelity medical stylus 100Hz+ polling). 
    *   **Features Formed**: Extracts `NCV` (Number of Changes in Velocity—quantifying halting velocity), `NCA` (Number of Changes in Acceleration), state magnitudes, combined with overall drawing speeds.
*   **Training Protocol**: Runs a Gradient Boosting Classification module (GBM) localized within an ImbPipeline framework using robust-scaling methodologies alongside SMOTE upsampling for dense spatial prediction outputs.

### 2.6 Cognitive Test (Stroop Effect)
*   **Data Source**: Large-scale dynamically generated 100,000-sample dataset synthesizing rigorous clinical Gaussian mixtures (simulating the overlapping properties between cognitive decline cases and slow-healthies).
*   **Frontend Preprocessing**: A classic digital Stroop matching diagnostic forces users to parse mismatched colors and text. The frontend tracks exact task response accuracy strings alongside rapid decision latencies locally.
*   **Backend Calculation**:
    *   Calculates and groups trial-specific means specifically targeting congruent (matching) versus incongruent (mismatching) arrays.
    *   **Features Formed**: Computes `congruent_rt_mean`, `incongruent_rt_mean`, the derived `stroop_effect` (the explicit scalar offset between incongruent and congruent RT), and total `error_rate`.
*   **Training Protocol**:
    *   Leverages highly optimized `XGBoost` trees calibrated by generalized `GridSearchCV` routines finding optimal logloss topologies.
    *   Data boundaries are managed by SMOTE and the inference scores natively bridged via Isotonic Calibration mapped into risk percentiles.

---

## 3. Mathematical Base Corrections (Logit & Prev)

A fundamental challenge working natively with internet-based ML is dealing with Public clinical dataset inflation.

*   Clinical datasets often possess a prevalence distribution heavily artificially skewed towards disease positives (`P(Target) ≈ 75%`). 
*   Internet-based screening baseline populations operate dramatically differently (`P(Target) ≈ 1% - 5%`).
*   To circumvent this problem without losing dataset validity, the SynaptiScan pipeline integrates a **Bayesian Logit Correction Protocol** directly into backend inference engines. The correction actively shifts the model's structural prior based upon the logit offset dynamically scaling predictions out of the clinical space into broad physiological screening parameters seamlessly.
