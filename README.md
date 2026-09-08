![Harnessing Deep Learning to Optimize Emergency Response — project banner](./images/Harnessing%20Deep%20Learning%20to%20Optimize%20Emergency%20Response.png)

# Harnessing Deep Learning to Optimize Emergency Response

An AI system that detects road accidents from live CCTV feeds in real time, classifies their severity, and automatically alerts the nearest emergency responders. Graduation project for the Bachelor of Science in Artificial Intelligence, Imam Abdulrahman Bin Faisal University (ARTI 521).

## What it does

- Ingests CCTV video continuously and processes it autonomously, with no manual triggering.
- A three-stage AI pipeline detects an accident, classifies it, and drafts a structured incident report.
- Routes alerts to the correct emergency agency (hospital, police, Najm, civil defense) via Telegram.
- Role-based dashboards give administrators and first responders distinct, secure views.
- Displays each incident's location on a live map and exports a formatted incident PDF for field commanders.

## Architecture

The final system runs three sequential AI stages, each doing the part it's actually good at:

| Stage | Model | Role |
|---|---|---|
| 1 — Spatial detection | Dual-stream YOLO11n (COCO-pretrained + CADP fine-tuned) | Detects and localizes vehicles, pedestrians, and road infrastructure per frame |
| 2 — Temporal classification | VideoViT v4 (VideoMAE-base backbone) | Analyzes a 16-frame window and decides accident / no accident |
| 3 — Semantic triage | Qwen2.5-VL-7B | Writes a structured incident report: severity, vehicle types, and recommended response |

Stage 2 is the core classifier. It fuses the two YOLO detection streams into the video transformer through an alpha-gated cross-attention mechanism, so the model reasons about accidents using explicit object positions rather than raw pixels alone.

## Results

Measured on a 587-clip validation set (303 normal, 284 accident; drawn from CADP, TU-DAT, and ACCIDENT-picekl, stratified 80/20 split, seed 42):

| Metric | Value | Target |
|---|---|---|
| F1-score | **0.888** | ≥ 0.85 |
| Precision | 0.944 | ≥ 0.85 |
| Recall | 0.838 | ≥ 0.80 |
| Accuracy | 0.90 | ≥ 0.85 |
| Classification latency (Stage 2, CPU/ONNX) | 41.2 ms/clip | — |

Every target set for the project is met or exceeded. The reported latency covers Stage 2 only (Stage 1 detection and Stage 3 triage add to end-to-end time, which was not formally benchmarked). This 587-clip set is the training-time validation split, fixed before training began; no separate post-training test set was defined for the project.

Fusing explicit object-detection data with the video transformer is what drove the result: a pure temporal baseline (VideoMAE, no detection tokens) reached F1 0.826, while adding the YOLO detection-token stream raised it to 0.888 and pushed precision from 0.88 to 0.944 — fewer false alerts, which matters for a system that pages real emergency responders.

## How the model got here

Two earlier architectures were tried and superseded before landing on the final design:

| Model | Approach | Outcome |
|---|---|---|
| EfficientNet-B0 | Single-frame classifier | Up to F1 0.897, but a 33% false-positive rate — fog and spray were consistently misread as post-collision smoke. No temporal context, a structural ceiling. |
| TimeSformer + ByteTrack | 8-frame video transformer, plus a parallel physics-based collision tracker | F1 0.88, but TimeSformer's fixed architecture couldn't accept the YOLO detection-token fusion the project needed. The physics tracker's deceleration threshold also failed on 69% of accident clips that had no measurable pre-collision braking. |
| **VideoViT v4** | VideoMAE + dual-stream YOLO tokens, alpha-gated cross-attention | **F1 0.888 — adopted as the production model.** |

**A real training failure and how it was handled:** the original design included a severity classification head trained jointly with the accident detector. Training collapsed (NaN) at epoch 18 because only ~18% of clips carried severity labels, and the imbalance destabilized the shared loss. The fix was to drop the severity head, keep the epoch-15 checkpoint saved just before the collapse as the production model, and move severity classification to Stage 3 (Qwen2.5-VL-7B) instead — a language model handles the ambiguous, low-data judgment call better than a starved classification head.

## Tech stack

- **Detection:** YOLO11n, dual-stream (COCO-pretrained + fine-tuned on CADP)
- **Temporal classification:** VideoViT v4 (VideoMAE-base), PyTorch — trained on an A100 40GB (Google Colab), exported to ONNX (347MB → 2MB via graph optimization and quantization) for CPU inference
- **Semantic triage:** Qwen2.5-VL-7B
- **Backend / data:** Supabase (PostgreSQL, RPC-driven incident lifecycle, real-time updates)
- **Notifications:** Telegram Bot API
- **Frontend:** React + TypeScript, Leaflet for live incident maps, PDF export for field reports
- **Deployment:** Netlify (frontend)

## Limitations and future work

- Not yet validated against live municipal CCTV feeds — testing so far is on benchmark datasets, not an operational deployment.
- Recall on the accident class (0.838) leaves room to grow; the likely gap is underrepresented conditions such as rural highways, severe weather, and night-time pedestrian incidents.
- The AI stages run in the cloud; porting them to edge hardware (e.g., NVIDIA Jetson) was not attempted.
- Automated emergency-vehicle rerouting was in the original proposal but was descoped: the delivered system notifies responders and shows incident location on a map, but does not compute or transmit alternate routes automatically. This needs a live traffic-data integration and dispatch-fleet GPS feed that were out of scope for a single-semester project.

## Team and academic context

Built over two semesters (August 2025 – June 2026) as a five-person graduation project at Imam Abdulrahman Bin Faisal University (ARTI 521). Full semester reports and the final presentation are in [`docs/`](docs).

| Name | Role |
|---|---|
| Mohammed Kamal Hadi | Leader |
| Abdulrhman Mohammed Alshehri | Member |
| Saud Ali Rawdhan | Member |
| Ahmad Abdulqader Alakhdar | Member |
| Ali Ibrahim Asiri | Member |

**Supervised by:** Dr. Mohammad Aftab Alam Khan (Supervisor), Dr. Atta-ur-Rahman (Co-supervisor)
**Committee:** Dr. Ito Wasio, Dr. Rabab Alkhalifa

## License

This project was submitted in partial fulfillment of the Bachelor of Science in Artificial Intelligence at Imam Abdulrahman Bin Faisal University. It is shared here as portfolio material; as a multi-author academic project, no open-source license is granted and no part of it may be reused without permission from the team.
