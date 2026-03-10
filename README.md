# CAPS08
## Head Counting System pada Area Titik Kumpul
### Struktur repo
my-project/
├── apps/
│   │
│   ├── frontend/                  # Next.js (Dikelola oleh Tim FE/UI)
│   │   ├── src/
│   │   │   ├── app/               # Next.js App Router
│   │   │   │   ├── (auth)/login/  # Halaman Login & form
│   │   │   │   ├── dashboard/     # Main Monitoring Dashboard (Real-Time UI)
│   │   │   │   ├── personnel/     # Personnel Status List & Missing Persons
│   │   │   │   └── settings/      # Notification & Email Settings
│   │   │   ├── components/        # UI Reusable (Grafik, Tabel, Tombol Manual Override, Badge Merah/Hijau)
│   │   │   └── lib/               # Integrasi API (HTTP fetch) & klien WebSocket
│   │   └── package.json
│   │
│   ├── backend-ai/                # FastAPI & Model ML (Tim AI/ML & AI Backend)
│   │   ├── api/                   # (AI Backend Eng.) Endpoint FastAPI & Webhook payload format
│   │   ├── core/                  # (Engineer C) Logika bridging pipeline & TensorRT/CUDA optimizers
│   │   ├── models/
│   │   │   ├── detection/         # (Engineer A) RF DETR model & Tracking algorithm logic
│   │   │   └── recognition/       # (Engineer B) Face Recognition model (ArcFace/DeepFace)
│   │   ├── streams/               # (AI Backend Eng.) RTSP/Webcam frame extractor
│   │   ├── utils/                 # Config & hardcoded variables (misal: assembly_point_id = 1)
│   │   ├── main.py                # Entry point Uvicorn
│   │   └── requirements.txt
│   │
│   └── backend-core/              # Golang (Backend Core Engineer)
│       ├── cmd/
│       │   └── api/               # Entry point server Golang
│       ├── internal/
│       │   ├── handlers/          # REST API endpoints (Auth, Manual Override) & WebSocket controller
│       │   ├── models/            # Skema Database (users, personnel, assembly_points, attendance_logs)
│       │   ├── repository/        # Query database langsung ke PostgreSQL/MySQL
│       │   ├── services/          # Business logic utama (Auth, pengolahan data status)
│       │   └── workers/           # Background jobs & Scheduler (Timer Notifikasi 10 menit & Email sender)
│       ├── pkg/                   # Fungsi bantuan (konfigurasi email templates)
│       ├── go.mod
│       └── go.sum
│
├── docker-compose.yml             # Orkestrasi seluruh layanan (termasuk config GPU nvidia)
└── README.md                      # Dokumentasi cara setup, install, dan run project
