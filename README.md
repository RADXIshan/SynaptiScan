# SynaptiScan 🧠

SynaptiScan is a comprehensive, AI-powered screening application designed to analyze biomarkers associated with Parkinson's Disease (PD). It leverages a combination of multiple machine-learning models to evaluate voice acoustics, keystroke dynamics, mouse kinematics, rest tremor characteristics, and handwriting (spiral drawing) patterns to generate a comprehensive risk assessment score.

---

## 🌟 Key Features
- **Multi-Modal Assessment:** Combines six separate biomarker tests—Voice, Keystroke, Mouse, Tremor, Handwriting, and Cognition.
- **Real-Time Biomarker Extraction:** Uses advanced techniques like webcam-based spatial tracking (Mediapipe), audio processing, and fine-motor kinematic tracking via the browser.
- **Predictive ML Pipelines:** Machine learning models trained on robust clinical datasets utilizing advanced class-balancing (SMOTE) and probabilistic calibrations.
- **Comprehensive Dashboard:** Interactive data visualization of assessment results using React and Recharts.

---

## 🛠️ Technology Stack

### **Frontend**
- **Framework:** React 19 with Vite
- **Routing:** React Router
- **Styling:** Tailwind CSS v4
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Data Visualization:** Recharts
- **Network Requests:** Axios

### **Backend**
- **Framework:** FastAPI (Python 3.12+)
- **Server:** Uvicorn
- **Database & ORM:** PostgreSQL / SQLite with SQLAlchemy
- **Authentication:** JWT (JSON Web Tokens) with Passlib & bcrypt
- **Machine Learning & AI:** Scikit-Learn, XGBoost, PyTorch, Imbalanced-learn
- **Audio & Signal Processing:** Praat-Parselmouth, Python-Speech-Features
- **Computer Vision:** OpenCV Headless, MediaPipe (for pose/hand land-marking)
- **Data Manipulation:** Pandas, NumPy, SciPy

---

## 🤖 Machine Learning Pipeline & Datasets

SynaptiScan relies on six specifically calibrated models to evaluate the user's inputs. Due to the imbalanced nature of clinical datasets, most models leverage **SMOTE (Synthetic Minority Over-sampling Technique)** to establish balanced priors. The primary classification algorithm used across most tests is a **Soft-Voting Ensemble comprising Random Forest, Gradient Boosting (GBM), eXtreme Gradient Boosting (XGBoost), and Support Vector Machines (SVM)** wrapped with Isotonic Calibration to output true probabilistic risk scores rather than binary classifications.

### 1. Voice Acoustic Analysis
Analyzes vocal tremors, phonation stability, and micro-fluctuations in speech.
- **Dataset:** UCI Parkinson's Disease Dataset (195 recordings).
- **Extracted Features (22 MDVP features):** Fundamental frequency metrics (Fo, Fhi, Flo), Jitter variants (Abs, RAP, PPQ, DDP), Shimmer variants (APQ3, APQ5, DDA), NHR, HNR, RPDE, DFA, and spread markers.
- **Algorithm:** SMOTE + Calibrated Ensemble (RF + GBM + XGBoost + SVM).

### 2. Keystroke Dynamics
Evaluates typing hesitation, dwell times, and flight times which correlate to bradykinesia and muscle rigidity.
- **Dataset:** PhysioNet Tappy Dataset (227 participants, ~200MB keystroke log data).
- **Extracted Features:** Mean/Std/IQR Dwell Time, Mean/Std/IQR Flight Time, Typing Speed (chars/sec), and Error Rate.
- **Algorithm:** SMOTE + Calibrated Ensemble (RF + GBM + XGBoost + SVM). Outputs are probabilistically corrected to account for general population screening priors (conservative 5% threshold).

### 3. Mouse Kinematics
Measures fine-motor control, velocity jitter, and directional changes via mouse movements.
- **Dataset:** ALAMEDA Accelerometer Dataset (Mapped continuously to 2D screen tracking).
- **Extracted Features:** Path length, movement time, average velocity, velocity jitter, direction changes, mean magnitude, variance, skewness, kurtosis, and PC1 RMS/Std.
- **Algorithm:** SMOTE + Ensemble Predictors (RF + GBM + XGBoost + SVM).

### 4. Rest Tremor Analysis
Quantifies rest tremors via webcam feed tracking localized hand landmarks.
- **Dataset:** ALAMEDA Accelerometer Dataset (Translating 3D positional shift into spectral features).
- **Extracted Features:** Peak frequency (Hz), mean amplitude, raw spectral entropy, total spectral power, power at dominant frequency, FFT RMS, and PCA variants.
- **Algorithm:** SMOTE + Ensemble Predictors (RF + GBM + XGBoost + SVM).

### 5. Kinematic Handwriting (Spiral/Meander Drawing)
Assesses micrographia and non-smooth drawing patterns typical of PD patients.
- **Dataset:** Shubhamjha97 Parkinson's Spirals/Meander kinematic dataset (77 recordings).
- **Extracted Features (Normalised to per-second rates):** Speed (`_st` and `_dy`), magnitude of velocity/acceleration/jerk, NCV (Number of Changes in Velocity), NCA (Number of Changes in Acceleration), air time, and surface time.
- **Algorithm:** SMOTE + Isotonically Calibrated Gradient Boosting Classifier (GBM). Adjusts ncv/nca values from dataset recording rates (~100-200 Hz) to expected browser polling rates (~60 Hz).

### 6. Cognitive Assessment (Stroop Test)
Evaluates executive dysfunction and delayed reaction times using a web-based Stroop task.
- **Dataset:** High-fidelity simulated clinical dataset (100,000 algorithmic profiles mapping clinical Gaussian mixtures).
- **Extracted Features:** Congruent Reaction Time (ms), Incongruent Reaction Time (ms), Stroop Effect (ms delta), and Error Rate.
- **Algorithm:** SMOTE + Isotonically Calibrated XGBoost Classifier (GridSearch tuned).

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v18 or higher)
- Python 3.12+ 
- `uv` package manager (recommended for backend)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a `.env` file in the `backend` directory. Example:
   ```env
   PORT=8000
   CLIENT_URL=http://localhost:5173
   DATABASE_URL=sqlite:///./synaptiscan.db
   SECRET_KEY=your_secret_key_here
   ```
3. Install dependencies (this creates a `.venv` using `uv.lock`):
   ```bash
   uv sync
   ```
4. Activate the virtual environment (optional if using `uv run`):
   ```bash
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
5. Run the model training pipeline to generate the models:
   ```bash
   uv run python app/ml/training/train_models.py
   ```
6. Start the FastAPI server (in development mode):
   ```bash
   uv run fastapi dev app/main.py --port 8000
   ```
   *The API will be available at `http://localhost:8000`*

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Create a `.env` file in the `frontend` directory:
   ```env
   VITE_API_URL=http://localhost:8000/api
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   *The application will be accessible at `http://localhost:5173`*

---
