# CAPS08
## Head Counting System pada Area Titik Kumpul
### Contoh truktur repo
```text
petro-headcount/
├── core-backend/           # Golang (Gudang Data & API Utama)
│   ├── cmd/api/            # Entry point aplikasi (main.go)
│   ├── internal/           
│   │   ├── handler/        # Logika HTTP (Controller)
│   │   ├── service/        # Business logic
│   │   ├── repository/     # Query ke Database (GORM)
│   │   ├── model/          # Struct tabel DB (User, Source, Log)
│   │   └── middleware/     # Auth JWT & CORS
│   ├── pkg/                # Helper (db connection, logger)
│   ├── storage/            # Folder lokal untuk simpan file
│   │   └── snapshots/      # Hasil capture AI tiap 5 menit
│   ├── .env                # Konfigurasi DB & Port
│   └── go.mod
│
├── ai-engine/              # FastAPI (Otak AI)
│   ├── app/
│   │   ├── api/            # Endpoint FastAPI
│   │   ├── core/           # Config (load model .pt/.pth)
│   │   ├── processor/      # Logika deteksi YOLO & RT-DETR
│   │   └── utils/          # Helper (image processing, timer)
│   ├── models/             # Tempat file .pt dan .pth
│   ├── test_videos/        # Folder video lokal untuk testing
│   ├── main.py             # Entry point FastAPI
│   └── requirements.txt    # Library (torch, ultralytics, opencv)
│
├── web-frontend/           # Next.js (Wajah Aplikasi)
│   ├── public/             # Asset statis (Logo Petrokimia)
│   ├── src/
│   │   ├── app/            # Next.js App Router (Pages)
│   │   ├── components/     # UI Components (Sidebar, Table, Modal)
│   │   ├── services/       # API Fetcher (Axios/Fetch ke Golang)
│   │   ├── hooks/          # Custom logic (useLiveView, etc.)
│   │   └── lib/            # Utility functions (format date, etc.)
│   ├── tailwind.config.js
│   └── package.json
│
└── README.md               # Dokumentasi cara jalankan project
```
