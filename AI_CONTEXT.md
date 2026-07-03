# AI Context — Harnessing Deep Learning to Optimize Emergency Response

> This document is the single source of truth for any AI assistant working on this project.
> Read it fully before making any changes.

---

## 1. Project Overview

**Goal**: Automatically detect road accidents from live CCTV/dashcam footage and dispatch emergency services faster.

**University**: Taibah University (README says Imam Abdulrahman Bin Faisal University — treat both as valid depending on context)
**Team size**: 5 undergraduates + 2 supervisors + 2 committee members
**Timeline**: August 2025 – June 2026
**Current phase**: 2nd semester — implementation complete, testing in progress (Apr–May 2026)

### Team

| Name | Role |
|---|---|
| Mohammed Kamal Hadi | Team Leader, model training |
| Abdulrhman Mohammed Alshehri | GitHub Admin |
| Ali Ibrahim Asiri | Google Drive integration (`drive_manager.py`) |
| Ahmad Abdulqader Alakhdar | GUI (dashboard) |
| Saud Ali Rawdhan | Member |
| Dr. Mohammad Aftab Alam Khan | Supervisor |
| Dr. Atta-ur-Rahman | Co-supervisor |

---

## 2. Repository Structure

```
.
├── AI_CONTEXT.md                  # This file
├── CLAUDE.md                      # Claude Code assistant guide
├── README.md                      # Project overview + team
├── .gitignore
├── netlify.toml                   # Netlify deployment config for GUI
├── Coding/
│   ├── main.py                    # Pipeline entry: download → process → upload
│   └── drive_manager.py           # Google Drive API integration
├── ai-traing/                     # NOTE: folder name has a typo — do NOT rename
│   ├── YOLOv11_Accident_Detection_Training2.ipynb   # Main training pipeline
│   ├── CADP_v2_EfficientNet_fixed.ipynb             # EfficientNet-B0 path
│   ├── Path1_VideoViT_v2.ipynb                      # TimeSformer (video ViT)
│   ├── Path2_ByteTrack_v5.ipynb                     # YOLO11 + ByteTrack tracker
│   ├── VLM_Triage_Qwen25_v2.ipynb                   # VLM triage (Qwen2.5-VL)
│   └── GP_Emergency_Response_System.ipynb           # Full system integration
├── GUI/                           # React/TypeScript dashboard
│   ├── src/
│   ├── supabase/
│   ├── public/
│   ├── python/                    # Python utilities for camera discovery
│   ├── package.json
│   ├── vite.config.ts
│   └── netlify.toml
├── Dataset/
│   └── PLACEHOLDER                # Real data is on Google Drive — not in repo
├── images/
│   └── Harnessing Deep Learning to Optimize Emergency Response.png
├── 1st Semester/                  # PDFs + DOCX: proposal, reports, presentation
└── 2nd Semester/                  # Syllabus + sample final report
```

---

## 3. AI / Model Pipeline

### 3.1 Dataset: CADP (Car Accident Detection and Prediction)

- 230 video clips, 10,313 annotated frames
- Source: dashcam and CCTV footage
- Stored on Google Drive (folder ID: `1DL5msjVLw2CPoH8ZGkiA3iEdM2Xcobtl`)

**Frame labeling convention** (do NOT change — dataset-specific):

| Frame range | Label |
|---|---|
| 0–90 | `no_accident` |
| 91–104 | **skip** (ambiguous boundary) |
| 105+ | `accident` |

### 3.2 Multi-Path Detection Architecture

The system uses three parallel detection paths:

#### Path 1 — EfficientNet-B0 (Frame Classifier)
- **Notebook**: `CADP_v2_EfficientNet_fixed.ipynb`
- **Input**: Single 224×224 RGB frame
- **Output**: `accident` / `no_accident` binary classification
- **Use case**: Fast per-frame classification

#### Path 2 — TimeSformer (Video Vision Transformer)
- **Notebook**: `Path1_VideoViT_v2.ipynb`
- **Model**: TimeSformer (spatial-temporal attention)
- **Reported F1**: 0.88
- **Input**: Sequence of frames (video clip)
- **Use case**: Temporal context — catches accidents that develop over multiple frames

#### Path 3 — YOLOv11 + ByteTrack (Physics-Informed Tracker)
- **Notebook**: `Path2_ByteTrack_v5.ipynb`
- **Models**: YOLOv11 (detection) + ByteTrack (multi-object tracking)
- **Key metric**: Height-normalized velocity (BH/s²) — scale-invariant collision detection
- **Use case**: Vehicle tracking, speed and trajectory anomaly detection

#### VLM Triage — Qwen2.5-VL-7B-AWQ
- **Notebook**: `VLM_Triage_Qwen25_v2.ipynb`
- **Model**: Qwen2.5-VL-7B-AWQ (INT4 quantized, runs on T4 GPU)
- **Input**: Accident frame(s) + detection result
- **Output**: Structured emergency triage report (severity, agency-specific instructions, summary)
- **This is what populates** `ai_summary` and `agency_specific_info` in the database

#### Main Training Notebook
- **Notebook**: `YOLOv11_Accident_Detection_Training2.ipynb`
- **Model**: YOLOv11s-cls (classification variant)
- **Runtime**: Google Colab (T4 GPU, 15.6 GB VRAM)

```python
model = YOLO("yolo11s-cls.pt")
model.train(
    data="dataset_yolo/",
    epochs=100,
    imgsz=224,
    batch=32,
    optimizer="AdamW",
    lr0=0.001,
    cos_lr=True,        # cosine LR schedule
    warmup_epochs=3,
    patience=20,        # early stopping
    augment=True,
)
```

**Data preprocessing**:
1. Filter frames with YOLOv8n vehicle detection (confidence ≥ 0.3)
2. Split: 70% train / 20% val / 10% test (stratified by clip)
3. Augmentation: conservative — no vertical flips (CCTV perspective)

**Export**: Best weights (`best.pt`) → ONNX (`model.onnx`) for deployment

### 3.3 ONNX Model

- **Input**: `[batch, 3, 224, 224]` float32 RGB tensor (normalized)
- **Output**: `[batch, 2]` softmax probabilities → `[no_accident, accident]`
- **Stored on**: Google Drive (reports/results folder, ID: `1P_Ogn8pEyyKPFJZ5nXTU3vYnPM6O9iEB`)

### 3.4 Google Drive Structure

```
Google Drive/
├── Dataset Folder  (ID: 1DL5msjVLw2CPoH8ZGkiA3iEdM2Xcobtl)
│   └── *.mp4 / *.avi         # Raw CADP video clips (dashcam/CCTV)
│       └── extracted_frames/  # Pre-extracted frames per clip
└── Reports Folder  (ID: 1P_Ogn8pEyyKPFJZ5nXTU3vYnPM6O9iEB)
    ├── model.onnx             # Exported ONNX model
    ├── best.pt                # YOLOv11 best weights
    ├── results_*.csv          # Per-run evaluation results
    └── confusion_matrix_*.png # Evaluation visualizations
```

**Access**: OAuth 2.0 via `credentials.json` → token cached in `token.json`.
Run `python Coding/main.py` to authenticate and download.

---

## 4. Backend Pipeline (`Coding/`)

### `Coding/drive_manager.py`

All Google Drive I/O. Key constants (hardcoded — do NOT change):

```python
DATASET_FOLDER_ID = '1DL5msjVLw2CPoH8ZGkiA3iEdM2Xcobtl'
REPORTS_FOLDER_ID = '1P_Ogn8pEyyKPFJZ5nXTU3vYnPM6O9iEB'
```

| Function | Purpose |
|---|---|
| `authenticate_user()` | OAuth 2.0 login, returns Drive service object |
| `list_files_in_folder(service, folder_id)` | List files in a Drive folder |
| `download_media(service, file_id, dest_path)` | Download single file |
| `upload_media(service, file_path, name, mime, folder_id)` | Upload file |
| `download_dataset(service)` | Batch download all dataset files to `downloads/` |
| `upload_report(service, local_path)` | Upload result — skips if file already exists |

### `Coding/main.py`

Three-phase orchestration:
1. Authenticate + download dataset from Drive
2. Run AI processing (accident detection — currently a placeholder, real inference goes here)
3. Upload results back to Drive

---

## 5. Database (Supabase / PostgreSQL)

**Host**: Supabase (PostgreSQL)
**Auth**: Supabase Auth (email + password) with auto-profile creation trigger
**Realtime**: Enabled on all tables via `ALTER PUBLICATION supabase_realtime ADD TABLE ...`

### 5.1 Tables

#### `profiles`
Extends `auth.users`. Auto-created by trigger on signup.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | References `auth.users.id` |
| `email` | TEXT | |
| `name` | TEXT | |
| `role` | TEXT | `'admin'` or `'responder'` |
| `agency` | TEXT | e.g. "King Faisal Hospital" |
| `agency_type` | TEXT | `'Hospital'`, `'Police'`, `'Civil Defense'`, `'Najm'` |
| `status` | TEXT | `'active'` or `'disabled'` |
| `contact_number` | TEXT | |
| `last_login` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

#### `incidents`
Core incident table — populated by the AI detection pipeline.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | e.g. `'INC-2024-001'` |
| `case_id` | TEXT UNIQUE | e.g. `'ER-AI-20240521-001'` |
| `location` | TEXT | Human-readable address |
| `lat` / `lng` | DOUBLE PRECISION | Coordinates |
| `time` | TIMESTAMPTZ | Time of incident |
| `severity` | TEXT | `'high'`, `'moderate'`, `'low'` |
| `status` | TEXT | `'new'` → `'acknowledged'` → `'on_scene'` → `'scene_cleared'` → `'closed'` |
| `ai_summary` | TEXT | Generated by Qwen2.5-VL triage module |
| `agency_specific_info` | TEXT | Agency-targeted instructions from VLM |
| `estimated_injuries` | INTEGER | From VLM triage output |
| `confidence` | TEXT | `'low'`, `'medium'`, `'high'` — model confidence |
| `weather` | JSONB | `{condition, temperature, visibility}` |
| `traffic` | TEXT | Traffic condition description |

#### `incident_photos`
Evidence frames linked to incidents.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `incident_id` | TEXT FK | → `incidents.id` CASCADE DELETE |
| `uri` | TEXT | URL to image (Supabase Storage or external) |
| `timestamp` | TIMESTAMPTZ | |
| `verified` | BOOLEAN | Manual verification flag |

#### `action_logs`
Audit trail of all actions taken on an incident.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | Auto-generated UUID |
| `incident_id` | TEXT FK | → `incidents.id` CASCADE DELETE |
| `timestamp` | TIMESTAMPTZ | |
| `user_name` | TEXT | `'System'` for automated actions |
| `action` | TEXT | Description of what happened |
| `ip_address` | TEXT | Optional |

#### `dispatched_units`
Emergency units assigned to an incident.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `incident_id` | TEXT FK | → `incidents.id` CASCADE DELETE |
| `name` | TEXT | e.g. `'Ambulance 734'` |
| `agency` | TEXT | e.g. `'King Faisal Hospital'` |
| `status` | TEXT | `'dispatched'` → `'en_route'` → `'on_scene'` → `'cleared'` |
| `dispatched_at` | TIMESTAMPTZ | |
| `on_scene_at` | TIMESTAMPTZ | Nullable |
| `cleared_at` | TIMESTAMPTZ | Nullable |

#### `collaboration_messages`
Inter-agency messaging per incident.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | Auto-generated UUID |
| `incident_id` | TEXT FK | → `incidents.id` CASCADE DELETE |
| `timestamp` | TIMESTAMPTZ | |
| `user_name` | TEXT | |
| `agency` | TEXT | |
| `message` | TEXT | |

#### `cameras`
CCTV camera registry (admin-managed).

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | e.g. `'CAM-001-RUH'` |
| `name` | TEXT | |
| `location` | TEXT | |
| `stream_url` | TEXT | RTSP/HTTP stream URL |
| `status` | TEXT | `'online'`, `'offline'`, `'degraded'` |
| `lat` / `lng` | DOUBLE PRECISION | |
| `protocol` | TEXT | `'rtsp'`, `'http'`, `'https'` |
| `username` / `port` / `path` | TEXT/INT | Stream auth params |

#### `audit_logs`
System-level audit log (admin only).

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | Auto UUID |
| `timestamp` | TIMESTAMPTZ | |
| `user_id` | UUID FK | → `auth.users.id` nullable |
| `user_name` | TEXT | |
| `ip_address` | TEXT | |
| `action` | TEXT | |

### 5.2 Row Level Security (RLS)

| Operation | Who |
|---|---|
| SELECT all tables | Any authenticated user |
| INSERT `action_logs`, `collaboration_messages` | Any authenticated user |
| UPDATE `incidents` | Any authenticated user |
| INSERT/UPDATE/DELETE `cameras` | Admin only |
| UPDATE `profiles` | Admin only |
| INSERT `audit_logs` | Admin only |

### 5.3 Realtime

All 8 tables are added to `supabase_realtime` publication:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE
  incidents, action_logs, collaboration_messages,
  dispatched_units, incident_photos,
  cameras, audit_logs, profiles;
```

---

## 6. Dashboard (GUI)

**Tech stack**: React 18.2 + TypeScript, Vite, React Router v6, Supabase JS client
**Deployed on**: Netlify (`netlify.toml` at repo root and `GUI/`)
**Styling**: Custom CSS with CSS variables (dark theme, green `#9DEE2B` accent)

### 6.1 Routes

```
/login                          → LoginScreen
/admin/dashboard                → AdminDashboard        [admin only]
/admin/cameras                  → CameraManagement      [admin only]
/admin/users                    → UserManagement        [admin only]
/admin/audit                    → SystemAuditLog        [admin only]
/admin/video-test               → VideoTest (AI Test Lab) [admin only]
/responder/dashboard            → ResponderDashboard    [responder only]
/responder/incident/:id         → IncidentDetails       [responder only]
/responder/archives             → IncidentArchives      [responder only]
/responder/cameras              → CamerasScreen         [responder only]
```

### 6.2 Context Providers (State Management)

```
App
└── ThemeProvider
    └── NotificationProvider      # Toast notifications (showSuccess/showError)
        └── AuthProvider          # user, isAuthenticated, login, logout
            └── SystemProvider    # System health stats
                └── IncidentProvider  # incidents[], loading, error, refreshIncidents
```

#### `IncidentContext` — key behaviour
- **Initial fetch**: on mount, calls `refreshIncidents()` which retries up to 3 times (2s → 4s → 8s backoff) before setting `error`
- **Realtime**: Supabase channel subscribed to all 5 incident-related tables — any DB change triggers `fetchOnce()`
- **Fallback poll**: `setInterval(fetchOnce, 2 minutes)` as safety net
- **Exposes**: `incidents`, `activeIncidents`, `loading`, `error`, `refreshIncidents`, `acknowledgeIncident`, `updateIncidentStatus`, `addCollaborationMessage`

### 6.3 Screens — Current State

#### Responder Role

**`ResponderDashboard`** (`/responder/dashboard`)
- Split view: incident list (left) + interactive Leaflet map (right)
- Shows active incidents only (status ≠ `closed` / `scene_cleared`)
- Stats chips: New count, Acknowledged count, Total
- Loading spinner on first fetch; error state with Retry button on failure
- Clicking a card navigates to `IncidentDetails`

**`IncidentDetails`** (`/responder/incident/:id`)
- Header: back button (inline with title), case ID, action buttons
- **Action buttons**: Acknowledge (when `status = 'new'`), progressive status buttons (On Scene, Scene Cleared), Generate PDF
- Left column:
  - Leaflet map zoomed to incident coordinates
  - Location + Time + Status + AI Confidence badge + Estimated Injuries + Weather + Traffic
  - Event Summary (AI-generated, from `ai_summary`)
  - Agency Specific Info (from `agency_specific_info` — real DB field, not hardcoded)
  - Evidence Photos grid (hidden if no photos)
- Right column:
  - Action Log (with user names)
  - Dispatched Units (with color-coded status badges)
  - Inter-Agency Messages (collaboration log)

**`IncidentArchives`** (`/responder/archives`)
- Searchable list of all incidents (including closed)

**`CamerasScreen`** (`/responder/cameras`)
- 3×2 grid of live camera feeds (YouTube embeds, branding hidden via CSS clip trick)
- All feeds autoplay muted on load (`autoplay=1&mute=1&controls=0`)
- Expand button — opens selected camera in large focused view with autoplay
- Add Camera button — modal form (name, location, YouTube URL/ID)
  - `extractVideoId()` parses any YouTube URL format
  - New camera appended to grid immediately
- Delete button on each card
- Responsive: 3-col → 2-col → 1-col

#### Admin Role

**`AdminDashboard`** (`/admin/dashboard`)
- System health overview: AI engine, alerting service, database, camera stats
- Recent incidents summary

**`CameraManagement`** (`/admin/cameras`)
- CRUD interface for the `cameras` table in Supabase
- Map view of camera locations

**`UserManagement`** (`/admin/users`)
- Manage user profiles and roles

**`SystemAuditLog`** (`/admin/audit`)
- Full audit trail from the `audit_logs` table

**`VideoTest`** (`/admin/video-test`)
- AI Test Lab — upload video clips and test detection pipeline

### 6.4 Shared Components

| Component | Purpose |
|---|---|
| `Sidebar` | Navigation for both roles; responder nav: Dashboard, Incidents, Cameras |
| `MapView` | Leaflet map wrapper with colored severity markers |
| `StatusBadge` | Colored label chip (severity/status) |
| `AlertModal` | High-priority alert popup for new incidents |
| `VideoModal` | Fullscreen video player modal |
| `Toast` / `ToastContainer` | Notification toasts |

### 6.5 CSS Design System

All screens use shared CSS variables:

```css
--color-primary:        #9DEE2B   /* green accent */
--color-primary-dark:   #7BC422
--color-background-dark: #0a0e14
--glass-bg:             rgba(255,255,255,0.04)
--glass-blur:           blur(20px)
--glass-border:         rgba(163,230,53,0.15)
--color-text-primary:   #ffffff
--color-text-secondary: rgba(255,255,255,0.6)
--color-text-muted:     rgba(255,255,255,0.3)
```

---

## 7. What Is Planned / Not Yet Built

| Feature | Status | Notes |
|---|---|---|
| Real AI model inference in pipeline | Planned | `main.py` Phase 2 is a placeholder |
| ONNX model served to dashboard | Planned | Model runs in Colab, output written to Drive |
| Camera stream processing (RTSP → frames → model) | Planned | `GUI/python/` scripts exist for camera discovery |
| Notification/alert push to responders | Partial | `AlertModal` component exists, WebSocket not wired |
| Supabase Storage for incident photos | Partial | URIs in DB currently point to Pexels (seed data) |
| Real camera integration (RTSP) | Not started | Currently YouTube mock streams |
| Unit and integration tests | Not started | Planned Apr–May 2026 |
| User registration UI | Not started | Currently manual via Supabase dashboard |
| PDF report refinement | Partial | `pdfService.ts` exists |
| Mobile responsive polish | Partial | Basic responsive CSS exists |

---

## 8. Development Conventions

1. **Python modules** → `Coding/`
2. **Notebooks** → `ai-traing/` (typo is intentional — do not rename)
3. **GUI source** → `GUI/src/`
4. **No large files in repo** — models and datasets live on Google Drive
5. **Notebook runtime** — Google Colab only; uses `google.colab.drive.mount()`
6. **No `requirements.txt`** yet — if adding deps, create one at repo root
7. **Hardcoded Drive IDs** — never change without team confirmation
8. **Frame labeling boundary** (0–90 / 91–104 / 105+) — never change unless dataset changes
9. **Supabase anon key** — stored in `GUI/.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
10. **Branch workflow** — Claude Code pushes to `claude/` branches; team merges PRs to `main`

---

## 9. Key Dependencies

### GUI (Node.js)
```json
{
  "react": "18.2",
  "react-router-dom": "v6",
  "typescript": "5.x",
  "vite": "5.x",
  "@supabase/supabase-js": "2.x",
  "leaflet": "1.x",
  "react-leaflet": "4.x",
  "recharts": "2.x",
  "jspdf": "2.x"
}
```

### Python Pipeline
```
ultralytics          # YOLOv11 / YOLOv8
albumentations       # data augmentation
scikit-learn         # train/val/test split, metrics
opencv-python        # frame extraction
google-api-python-client
google-auth-oauthlib
google-auth-httplib2
pyyaml
tqdm
torch               # PyTorch (for TimeSformer, EfficientNet)
transformers        # Qwen2.5-VL
```

---

## 10. Default Test Credentials (Seed Data)

Create these users manually in Supabase Auth → then run `seed.sql`:

| Email | Password | Role |
|---|---|---|
| `admin@system.gov.sa` | `Admin@ERP2024` | admin |
| `responder@hospital.gov` | `Resp@ERP2024` | responder |
| `responder@police.gov` | `Resp@ERP2024` | responder |
