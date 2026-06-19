# CAPS08 — Real-Time People Counting System

A full-stack, multi-service system for real-time people (head) counting using computer vision. The system ingests video from IP cameras or RTSP streams, runs AI-based object detection using a custom ONNX model, and delivers live analytics to a web dashboard.

---

## Table of Contents

- [Project Overview \& Architecture](#1-project-overview--architecture)
- [Prerequisites \& GPU Setup](#2-prerequisites--gpu-setup)
- [Installation \& Setup](#3-installation--setup)
- [Environment Variables (.env)](#4-environment-variables-env)
- [How to Run (Execution Order)](#5-how-to-run-execution-order)

---

## 1. Project Overview & Architecture

### What This Project Does

CAPS08 counts the number of people in a scene in real time using an AI model. Video feeds (RTSP, IP camera, or video URL) are processed frame-by-frame, people are detected and tracked, and the results (head count, FPS, snapshots) are logged and displayed on a live web dashboard.

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Web Frontend                               │
│              Next.js 15 + TypeScript + Tailwind CSS                 │
│     Dashboard: live camera streams, head count charts, snapshots    │
└───────────────────────┬─────────────────────┬───────────────────────┘
                        │  REST API            │  WebSocket (ws://)
                        ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Core Backend                                │
│                    Go (Gin) — runs on :8080                         │
│  - Auth (JWT) · Sources CRUD · Head Count Logs · Snapshots          │
│  - WebSocket hub (broadcasts live detection events to frontend)     │
│  - PostgreSQL (via pgx) · Goose migrations · SQLC                   │
└───────────────────────┬─────────────────────────────────────────────┘
                        │  On startup: fetches sources list
                        │  While running: receives POST /logs & /snapshots
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          AI Engine                                  │
│                 Python (FastAPI + Uvicorn) — runs on :8000          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     DetectionSource                          │   │
│  │   Thread-safe manager — one DetectorRunner per camera        │   │
│  │  ┌───────────────────────────────────────────────────────┐   │   │
│  │  │  DetectorRunner (background daemon thread per source) │   │   │
│  │  │   ├─ ONNXRuntime  (onnxruntime-gpu, CUDA/CPU)         │   │   │
│  │  │   ├─ Tracker      (OC-SORT via supervision/trackers)  │   │   │
│  │  │   └─ FrameManager (latest annotated JPEG buffer)      │   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  REST Endpoints:                                                    │
│   POST  /probe         — register new camera source                 │
│   POST  /probe/remove/{id} — remove source                          │
│   GET   /camera/stream/{id} — MJPEG live stream                     │
└─────────────────────────────────────────────────────────────────────┘
                        │
                        ▼
              PostgreSQL Database
```

### Workflow Summary

1. **Core Backend** starts and exposes the REST API + WebSocket.
2. **AI Engine** starts, immediately calls `GET /api/sources` on the Core Backend to retrieve all registered camera sources.
3. For each source, a `DetectorRunner` daemon thread is spawned. Each thread:
   - Opens the video stream (RTSP / URL) with OpenCV.
   - Loads the ONNX model into `onnxruntime` (GPU if available, else CPU).
   - Runs inference every frame; applies OC-SORT tracking.
   - Every **10 seconds**, POSTs detection data (head count, FPS) to Core Backend at `POST /api/logs` and a snapshot image to `POST /api/snapshots`.
4. Core Backend broadcasts real-time detection events over WebSocket to the **Web Frontend**.
5. **Web Frontend** displays live MJPEG streams from `GET /camera/stream/{id}`, charts, and snapshot history.

### Technology Stack

| Layer | Technology |
|---|---|
| AI Engine | Python 3.11+, FastAPI, Uvicorn, ONNX Runtime (GPU), OpenCV, Supervision, OC-SORT |
| Core Backend | Go 1.21+, Gin, pgx v5, SQLC, Goose, JWT, Gorilla WebSocket |
| Web Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS v4 |
| Database | PostgreSQL |
| AI Model | Custom ONNX model (RT-DETR / YOLO-based, 512×512 input) |

---

## 2. Prerequisites & GPU Setup

### System Requirements

| Component | Minimum | Recommended |
|---|---|---|
| OS | Windows 10 / Ubuntu 20.04 | Windows 11 / Ubuntu 22.04 |
| RAM | 8 GB | 16 GB+ |
| GPU | NVIDIA GPU (CUDA capable) | NVIDIA RTX 3060+ |
| VRAM | 4 GB | 8 GB+ |
| CPU | 4 cores | 8 cores+ |
| Disk | 10 GB free | 20 GB free |

> **Note:** The AI Engine will fall back to CPU if no CUDA-capable GPU is detected, but performance will be significantly slower.

### GPU Setup: CUDA & cuDNN

The AI Engine uses `onnxruntime-gpu==1.26.0`, which requires **CUDA 12.x** and a compatible cuDNN version.

#### Step 1 — Install NVIDIA GPU Driver

Download and install the latest NVIDIA driver for your GPU from:
[https://www.nvidia.com/Download/index.aspx](https://www.nvidia.com/Download/index.aspx)

Verify installation:
```bash
nvidia-smi
```

#### Step 2 — Install CUDA Toolkit 12.x

Download CUDA 12.x from:
[https://developer.nvidia.com/cuda-downloads](https://developer.nvidia.com/cuda-downloads)

Verify:
```bash
nvcc --version
```

#### Step 3 — Install cuDNN 9.x

> [!WARNING]
> The `nvidia-cudnn-cu12` pip package in `requirements.txt` is a **Linux-only** package. On **Windows**, it does **not** install the cuDNN DLL files. You must install cuDNN manually for Windows.

**Windows — Manual cuDNN Installation:**

1. Go to [https://developer.nvidia.com/cudnn-downloads](https://developer.nvidia.com/cudnn-downloads) (free NVIDIA account required).
2. Select: **Windows → x86_64 → Zip** → version **cuDNN 9.x for CUDA 12.x**.
3. Download and extract the ZIP file.
4. Inside the extracted folder, open the `bin\` directory.
5. Copy **all `.dll` files** (e.g., `cudnn64_9.dll`, `cudnn_ops64_9.dll`, etc.) to your CUDA installation's `bin` folder:
   ```
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.x\bin\
   ```
6. Restart your terminal and run `invoke server`. You should now see:
   ```
   [INFO] Active Provider: CUDAExecutionProvider
   ```

**Linux/macOS — Automatic via pip:**

On Linux, the `nvidia-cudnn-cu12` pip package handles cuDNN automatically — no manual installation required.


### Other Software Requirements

| Software | Version | Purpose |
|---|---|---|
| Python | 3.11+ | AI Engine |
| Go | 1.21+ | Core Backend |
| Node.js | 18+ | Web Frontend |
| pnpm | 8+ | Frontend package manager |
| PostgreSQL | 14+ | Database |
| Goose | latest | DB migrations |

---

## 3. Installation & Setup

### Clone the Repository

```bash
git clone <repository-url>
cd CAPS08
```

### AI Engine Setup

```bash
cd ai-engine
```

**Create and activate a virtual environment (recommended):**

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux / macOS
python -m venv venv
source venv/bin/activate
```

**Install dependencies:**

```bash
pip install -r requirements.txt
```

> ⚠️ The `requirements.txt` includes `onnxruntime-gpu`, `torch`, `torchvision`, and CUDA-related packages. This will download several GB of data. Make sure CUDA 12.x is installed before this step.

**Verify ONNX Runtime GPU Provider:**

After the installation finishes, confirm that the GPU provider is active:
```bash
python -c "import onnxruntime as ort; print(ort.get_available_providers())"
# Expected output includes: 'CUDAExecutionProvider'
```

> [!WARNING]
> **Troubleshooting CUDA Not Detected:**
> If the output only shows `['CPUExecutionProvider']` or you get an error, it is likely because `onnxruntime` (the CPU-only version) is overriding `onnxruntime-gpu`. 
> **Fix:** Comment out `# onnxruntime==...` in your `requirements.txt`, then run `pip uninstall onnxruntime onnxruntime-gpu -y` followed by `pip install onnxruntime-gpu==1.26.0` to ensure only the GPU version is installed.

**Place your ONNX model file:**

Copy your trained ONNX model file into the `ai-engine/` root directory and name it according to `config.py`:

```bash
# Default expected filename (see config.py):
ai-engine/v6_augconfig.onnx
```

If your model file has a different name, update `MODEL_PATH` and `INFERENCE_SIZE` in [`ai-engine/config.py`](./ai-engine/config.py).

---

### Core Backend Setup

```bash
cd core-backend
```

**Install Go dependencies:**

```bash
go mod download
```

**Install Goose (database migration tool):**

```bash
go install github.com/pressly/goose/v3/cmd/goose@latest
```

**Run database migrations:**

```bash
# Make sure your .env is configured first (see section 4)
# For Linux/macOS (or if you have 'make' installed on Windows):
make migrate-up

# For Windows (PowerShell/CMD) without 'make':
# Copy the DATABASE_URL from your .env and run this:
goose -dir ./db/migrations postgres "postgres://postgres:password@localhost..." up
```

---

### Web Frontend Setup

```bash
cd web-frontend
```

**Install dependencies using pnpm:**

```bash
pnpm install
```

If you do not have pnpm:
```bash
npm install -g pnpm
pnpm install
```

---

## 4. Environment Variables (.env)

Each service has its own `.env` file. Copy the template and fill in the values.

---

### `ai-engine/.env`

Copy from template:
```bash
cp ai-engine/.env.template ai-engine/.env
```

| Variable | Example | Description |
|---|---|---|
| `BE_CORE_URL` | `http://localhost:8080/api` | Base URL of the Core Backend REST API. The AI Engine POSTs detection logs and snapshots here, and fetches sources on startup. |
| `BASE_URL` | `http://localhost:8000` | The AI Engine's own base URL. Used for internal self-reference if needed. |
| `MODEL_NAME` | `rfdetr` | Identifier for the model type being used (informational, e.g. `rfdetr`, `yolo`). |
| `CAMERA_SOURCE` | `0` | Fallback camera source index or URL (used only if no sources are loaded from Core Backend). `0` = default webcam. |

**Example `ai-engine/.env`:**
```env
BE_CORE_URL=http://localhost:8080/api
BASE_URL=http://localhost:8000
MODEL_NAME=rfdetr
CAMERA_SOURCE=0
```

---

### `core-backend/.env`

Copy from template:
```bash
cp core-backend/.env.template core-backend/.env
```

| Variable | Example | Description |
|---|---|---|
| `DATABASE_URL` | `postgres://user:pass@localhost:5432/caps08` | Full PostgreSQL connection string. |
| `JWT_SECRET` | `your-very-secret-key-here` | Secret key used to sign and verify JWT tokens for authentication. |
| `BE_CORE_URL` | `http://localhost:8080` | This backend's own URL. Used for CORS allowlist. |
| `BE_AI_URL` | `http://localhost:8000` | URL of the AI Engine. Added to CORS allowlist. |
| `FE_URL` | `http://localhost:3000` | URL of the Web Frontend. Added to CORS allowlist. |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server host for sending emails (password reset). |
| `SMTP_EMAIL` | `youremail@gmail.com` | Email address used as the sender for SMTP. |
| `SMTP_PASSWORD` | `your-app-password` | SMTP password or App Password (for Gmail, use App Password). |
| `RESEND_API_KEY` | `re_xxxxxxxxxxxx` | API key for the Resend email service (alternative to SMTP). |

**Example `core-backend/.env`:**
```env
DATABASE_URL=postgres://postgres:password@localhost:5432/caps08
JWT_SECRET=supersecretjwtkeychangeme
BE_CORE_URL=http://localhost:8080
BE_AI_URL=http://localhost:8000
FE_URL=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_EMAIL=your@email.com
SMTP_PASSWORD=your-app-password
RESEND_API_KEY=re_your_resend_api_key
```

#### Configuring "Forgot Password" Email Service
The backend supports two methods for sending password reset emails: **Resend API (HTTPS)** and **SMTP (e.g., Gmail)**. By default, the codebase uses **Resend**.

**Option A: Using Resend API (Default)**
1. Register for a free account at [resend.com](https://resend.com/).
2. Generate an API Key (starts with `re_...`).
3. Fill in the `RESEND_API_KEY` in your `.env` file.
4. No code changes are needed.

**Option B: Using SMTP (e.g., Gmail)**
1. In your `.env`, fill in `SMTP_HOST` (e.g., `smtp.gmail.com`), `SMTP_EMAIL`, and `SMTP_PASSWORD` (use an App Password, not your real password).
2. Open the file `core-backend/src/utils/email.go`.
3. **Comment out** the top `SendEmail` function (which uses Resend).
4. **Uncomment** the bottom `SendEmail` function (which uses `gomail` / SMTP).
5. Restart the backend server.

---

### `web-frontend/.env.local`

Copy from template:
```bash
cp web-frontend/.env.template web-frontend/.env.local
```

| Variable | Example | Description |
|---|---|---|
| `NEXT_PUBLIC_BE_CORE_URL` | `http://localhost:8080/api` | Core Backend REST API URL, exposed to the browser. |
| `NEXT_PUBLIC_BE_CORE_WS_URL` | `ws://localhost:8080/ws` | WebSocket URL for receiving real-time detection events from Core Backend. |
| `NEXT_PUBLIC_BE_AI_URL` | `http://localhost:8000` | AI Engine URL, used for MJPEG stream URLs (`/camera/stream/{id}`). |
| `PORT` | `3000` | Port the Next.js dev server runs on. |

**Example `web-frontend/.env.local`:**
```env
NEXT_PUBLIC_BE_CORE_URL=http://localhost:8080/api
NEXT_PUBLIC_BE_CORE_WS_URL=ws://localhost:8080/ws
NEXT_PUBLIC_BE_AI_URL=http://localhost:8000
PORT="3000"
```

---

## 5. How to Run (Execution Order)

The services **must be started in the following order**. The AI Engine depends on the Core Backend being available at startup to fetch the list of camera sources.

```
1. PostgreSQL Database  →  2. Core Backend  →  3. AI Engine  →  4. Web Frontend
```

---

### Step 1 — Start PostgreSQL

Make sure your PostgreSQL server is running and the database exists.

```bash
# If using a local PostgreSQL installation, ensure the service is started.
# Then create the database if it doesn't exist:
psql -U postgres -c "CREATE DATABASE caps08;"
```

---

### Step 2 — Run Database Migrations (Core Backend)

```bash
cd core-backend

# Ensure .env is configured, then run:
make migrate-up
```

---

### Step 3 — Start Core Backend

```bash
cd core-backend
make run

# Or directly:
go run main.go
```

The Core Backend will start on **`:8080`**.

---

### Step 4 — Start AI Engine

```bash
cd ai-engine

# Activate virtual environment first:
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Run using invoke:
invoke server

# Or directly with uvicorn:
uvicorn app.main:app --reload
```

The AI Engine will start on **`:8000`**.

On startup, it automatically fetches all camera sources from the Core Backend and spawns a detection thread for each one. You will see log messages like:

```
[STARTUP] 2 sources loaded, detection threads started
[DETECTOR <uuid>] Started with model: rfdetr
[INFO] Active Provider: CUDAExecutionProvider
```

---

### Step 5 — Start Web Frontend

```bash
cd web-frontend
pnpm dev
```

The Web Frontend will start on **`http://localhost:3000`**.

---

### Full Startup Summary

```bash
# Terminal 1 — Core Backend
cd core-backend
# (First time only) run migrations:
make migrate-up                                 # (Linux/macOS)
# goose -dir ./db/migrations postgres "..." up  # (Windows)

# Start backend server:
make run                                        # (Linux/macOS)
go run main.go                                  # (Windows)

# Terminal 2 — AI Engine
cd ai-engine
# Activate virtual environment:
source venv/bin/activate                        # (Linux/macOS)
venv\Scripts\activate                           # (Windows)
# Start AI server:
invoke server

# Terminal 3 — Web Frontend
cd web-frontend
pnpm dev
```

Open your browser at: **[http://localhost:3000](http://localhost:3000)**

---

## Project Structure

```
CAPS08/
├── ai-engine/                  # Python AI inference service
│   ├── app/
│   │   ├── core/
│   │   │   ├── model.py        # ONNX Runtime inference wrapper
│   │   │   ├── tracker.py      # OC-SORT tracker integration
│   │   │   ├── detector_runner.py  # Per-source detection thread
│   │   │   ├── detection_source.py # Thread manager
│   │   │   └── frame_manager.py    # Thread-safe JPEG frame buffer
│   │   ├── routers/
│   │   │   ├── source.py       # POST /probe — register camera sources
│   │   │   └── stream.py       # GET /camera/stream/{id} — MJPEG stream
│   │   ├── services/
│   │   │   └── sender_service.py   # Sends detection results to Core Backend
│   │   └── main.py             # FastAPI app + lifespan startup
│   ├── config.py               # Central config (model path, thresholds, etc.)
│   ├── tasks.py                # Invoke tasks (invoke server)
│   └── requirements.txt
│
├── core-backend/               # Go REST API + WebSocket server
│   ├── src/
│   │   ├── auth/               # JWT auth, register/login/forgot-password
│   │   ├── sources/            # Camera source CRUD
│   │   ├── head_count_log/     # Detection log ingestion + WS broadcast
│   │   ├── snapshots/          # Snapshot upload & retrieval
│   │   └── websocket/          # WebSocket hub
│   ├── db/
│   │   ├── migrations/         # Goose SQL migrations
│   │   └── query/              # SQLC queries
│   ├── main.go
│   └── Makefile
│
└── web-frontend/               # Next.js dashboard
    ├── app/                    # Next.js App Router pages
    ├── components/             # UI components
    ├── contexts/               # React contexts
    └── lib/                    # Utilities & API clients
```
