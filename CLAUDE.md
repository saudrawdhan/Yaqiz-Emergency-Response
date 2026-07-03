# CLAUDE.md — AI Assistant Guide

## Project Overview

**Harnessing Deep Learning to Optimize Emergency Response** is a capstone research project that uses YOLOv11-based computer vision to detect road accidents from CCTV footage. The system classifies video frames as `accident` or `no_accident` and is designed to accelerate emergency dispatch.

- **Team**: 5-member undergraduate team + 2 supervisors at Taibah University
- **Timeline**: August 2025 – June 2026 (currently in 2nd semester implementation phase)
- **Status**: Model training pipeline complete; GUI and integration in progress

---

## Repository Structure

```
.
├── CLAUDE.md                    # This file
├── README.md                    # Project overview and team info
├── .gitmodules                  # GUI submodule reference
├── Coding/
│   ├── main.py                  # Pipeline entry point (download → process → upload)
│   └── drive_manager.py         # Google Drive API integration layer
├── ai-traing/
│   └── YOLOv11_Accident_Detection_Training2.ipynb  # Full ML training pipeline
├── Dataset/
│   └── PLACEHOLDER              # Dataset lives on Google Drive, not in repo
├── gui/                         # Git submodule: Emergency-Response-Platform (GUI)
├── images/                      # Project diagram PNG
├── 1st Semester/                # Proposal, reports, and presentation (PDFs + DOCX)
└── 2nd Semester/                # Syllabus and sample final report
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Deep learning | Ultralytics YOLOv11 (classification), YOLOv8n (vehicle filtering) |
| Computer vision | OpenCV (`cv2`) |
| Data augmentation | `albumentations` |
| ML utilities | `scikit-learn` |
| Cloud storage | Google Drive API (OAuth 2.0) |
| Web framework | Flask (dashboard, planned) |
| Notebook runtime | Google Colab (GPU required) |
| Language | Python 3 |

No `requirements.txt` exists yet. Key packages: `ultralytics`, `albumentations`, `scikit-learn`, `opencv-python`, `google-api-python-client`, `google-auth-oauthlib`, `google-auth-httplib2`, `pyyaml`, `tqdm`.

---

## Core Modules

### `Coding/drive_manager.py`

Handles all Google Drive I/O. Key constants (hardcoded):

```python
DATASET_FOLDER_ID = "1DL5msjVLw2CPoH8ZGkiA3iEdM2Xcobtl"
REPORTS_FOLDER_ID = "1P_Ogn8pEyyKPFJZ5nXTU3vYnPM6O9iEB"
```

Key functions:

| Function | Purpose |
|---|---|
| `authenticate_user()` | OAuth 2.0 login, returns Drive service object |
| `list_files_in_folder(service, folder_id)` | List files in a Drive folder |
| `download_media(service, file_id, dest_path)` | Download a single file |
| `upload_media(service, file_path, folder_id)` | Upload a file, skips duplicates |
| `download_dataset(service)` | Batch download dataset files to `downloads/` |
| `upload_report(service, report_path)` | Upload result file to reports folder |

### `Coding/main.py`

Three-phase orchestration script:
1. Authenticate and download dataset from Drive
2. Run AI processing (accident detection)
3. Upload results back to Drive

### `ai-traing/YOLOv11_Accident_Detection_Training2.ipynb`

Complete ML pipeline designed for Google Colab. Notebook sections:

| Section | Description |
|---|---|
| 1. Setup | Install deps, mount Drive, verify GPU |
| 2. Dataset Exploration | Explore CADP `extracted_frames/` structure |
| 3. Dataset Preparation | Label frames, filter with YOLOv8n, split train/val/test |
| 4. Model Training | YOLOv11s-cls with resume/checkpoint support |
| 5. Evaluation | Test set metrics, confusion matrix |
| 6. Inference | Per-frame classification on video clips |
| 7. Export | ONNX export + summary report |

---

## Data Pipeline

### Dataset: CADP (Car Accident Detection and Prediction)

Frames extracted from dashcam/CCTV clips. Labeling convention based on frame index within each clip:

- Frames **0–90**: `no_accident` (normal traffic)
- Frames **91–104**: ambiguous boundary — **skip**
- Frames **105+**: `accident`

### Processing Steps

1. Filter frames: only keep frames where YOLOv8n detects a vehicle (confidence ≥ 0.3)
2. Split: **70% train / 20% val / 10% test** (stratified by clip)
3. Image size: **224×224**
4. Augmentation: conservative (no vertical flips — CCTV footage)

### Smart Caching

All intermediate results (filtered frame lists, splits) are cached to Google Drive. Re-runs automatically resume from the last checkpoint. This is critical for long Colab sessions.

---

## Model Training Configuration

```python
model = YOLO("yolo11s-cls.pt")
model.train(
    data="dataset_yolo/",
    epochs=100,
    imgsz=224,
    batch=32,
    optimizer="AdamW",
    lr0=0.001,
    cos_lr=True,       # cosine LR schedule
    warmup_epochs=3,
    patience=20,       # early stopping
    augment=True,
)
```

Best weights saved as `best.pt`; exported to ONNX for deployment.

---

## Git Submodule: GUI

The `gui/` directory is a submodule pointing to:
```
https://github.com/GoldenAhmad/Emergency-Response-Platform.git
```

To initialize after cloning:
```bash
git submodule update --init --recursive
```

---

## Development Workflows

### Running the Pipeline

```bash
# Requires Google Drive credentials (OAuth 2.0)
python Coding/main.py
```

Credentials flow: OAuth browser prompt → token cached locally.

### Running Model Training

Open `ai-traing/YOLOv11_Accident_Detection_Training2.ipynb` in Google Colab:
1. Mount Google Drive when prompted
2. Run all cells in order
3. Training auto-resumes if session disconnects (cached state on Drive)

### Adding New Code

- Python modules go in `Coding/`
- Notebooks go in `ai-traing/` (note the typo in the folder name — keep it for consistency)
- Do not commit large model weights or datasets — they live on Google Drive

---

## Conventions and Notes for AI Assistants

1. **No requirements.txt** — if adding dependencies, create one under the repo root.
2. **No tests** — a `test` file exists but contains only the word "test". Testing is planned for Apr–May 2026.
3. **Hardcoded Drive IDs** — `DATASET_FOLDER_ID` and `REPORTS_FOLDER_ID` in `drive_manager.py` are fixed. Do not change them without team confirmation.
4. **Notebook folder typo** — the folder is named `ai-traing/` (missing an 'i'). Do not rename it without updating all references.
5. **Dataset not in repo** — `Dataset/PLACEHOLDER` is a placeholder. Real data is on Google Drive.
6. **Colab-specific code** — the notebook uses `google.colab.drive.mount()` and Colab-specific paths. Do not refactor for local execution without testing.
7. **Frame labeling logic** — the 0–90/91–104/105+ boundary is dataset-specific to CADP. Do not change unless the dataset changes.
8. **GUI is a submodule** — do not add GUI code directly to this repo.

---

## Project Timeline (2nd Semester)

| Dates | Milestone |
|---|---|
| Jan 19 – Feb 1 | System design |
| Feb 2 – Mar 1 | Core implementation |
| Mar 2 – Mar 29 | Integration + **Midterm Report due Mar 29** |
| Apr 5 – Apr 26 | Testing and validation |
| May 3 – May 17 | Refinement and optimization |
| May 24 – Jun 7 | Documentation |
| Jun 8 – Jun 14 | Final presentation |

---

## Team

- **Abdulrhman Alshehri** — Team Lead / GitHub Admin
- **Ahmed Almohammadi** — GUI (Emergency-Response-Platform submodule)
- **Ali Alotaibi** — Drive integration (`drive_manager.py`)
- **Mohammed Hadi** — Model training (YOLOv11 notebook)
- (5th member not identified from git history)
- **Supervisors**: Listed in README.md
