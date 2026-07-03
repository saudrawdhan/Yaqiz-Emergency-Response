import React, { useState, useRef, useCallback } from 'react'
import Sidebar from '../../components/common/Sidebar'
import './VideoTest.css'

// ── Types ────────────────────────────────────────────────────
interface TriageReport {
  alert_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  scene_description: string
  vehicles_involved: string[]
  vehicle_count: number
  pedestrians_in_scene: boolean
  collision_zone: string
  road_type: string
  hazards: string[]
  visibility_conditions: string
  severity_score: number
  recommended_units: string[]
  confidence: number
}

interface AnalysisResult {
  triggered_at_sec: number
  detection_method: string
  collision_type: string
  triage: TriageReport
  latency_ms: number
}

type AnalysisStage =
  | 'idle'
  | 'uploading'
  | 'efficientnet'
  | 'timesformer'
  | 'bytetrack'
  | 'vlm'
  | 'done'
  | 'no_accident'

// ── Mock pipeline stages ─────────────────────────────────────
const STAGE_LABELS: Record<AnalysisStage, string> = {
  idle:        '',
  uploading:   'Loading video...',
  efficientnet:'EfficientNet-B0 — scanning frames...',
  timesformer: 'TimeSformer — analysing 8-frame clips...',
  bytetrack:   'YOLO11 + ByteTrack — tracking vehicles...',
  vlm:         'Qwen2.5-VL — generating triage report...',
  done:        'Analysis complete',
  no_accident: 'No accident detected',
}

const STAGE_ICONS: Record<AnalysisStage, string> = {
  idle:        'play_circle',
  uploading:   'cloud_upload',
  efficientnet:'frame_inspect',
  timesformer: 'theaters',
  bytetrack:   'directions_car',
  vlm:         'psychology',
  done:        'task_alt',
  no_accident: 'check_circle',
}

const SEVERITY_COLOR: Record<string, string> = {
  LOW:      '#2e8540',
  MEDIUM:   '#fdb81e',
  HIGH:     '#e31c3d',
  CRITICAL: '#8b0000',
}

// ── Mock triage report returned after "processing" ───────────
const MOCK_RESULT: AnalysisResult = {
  triggered_at_sec: 3.6,
  detection_method: 'TimeSformer + IoU contact (A1)',
  collision_type: 'vehicle_vehicle',
  latency_ms: 847,
  triage: {
    alert_level: 'HIGH',
    scene_description:
      'Two-vehicle collision at an urban intersection. Sedan impacted by a light truck running a red light. Significant front-end damage on both vehicles.',
    vehicles_involved: ['car', 'truck'],
    vehicle_count: 2,
    pedestrians_in_scene: false,
    collision_zone: 'Central intersection — right lane',
    road_type: 'urban road',
    hazards: ['vehicle_blocking_lane', 'debris_on_road', 'fluid_leak_possible'],
    visibility_conditions: 'daytime',
    severity_score: 7,
    recommended_units: ['police', 'ambulance'],
    confidence: 0.91,
  },
}

// ── Component ────────────────────────────────────────────────
const VideoTest: React.FC = () => {
  const [videoFile, setVideoFile]       = useState<File | null>(null)
  const [videoUrl, setVideoUrl]         = useState<string | null>(null)
  const [isDragging, setIsDragging]     = useState(false)
  const [stage, setStage]               = useState<AnalysisStage>('idle')
  const [result, setResult]             = useState<AnalysisResult | null>(null)
  const [apiUrl, setApiUrl]             = useState('')
  const [useRealApi, setUseRealApi]     = useState(false)
  const [progress, setProgress]         = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef     = useRef<HTMLVideoElement>(null)

  // ── File handling ──────────────────────────────────────────
  const loadFile = (file: File) => {
    if (!file.type.startsWith('video/')) return
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoFile(file)
    setVideoUrl(URL.createObjectURL(file))
    setStage('idle')
    setResult(null)
    setProgress(0)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) loadFile(e.target.files[0])
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.[0]) loadFile(e.dataTransfer.files[0])
  }, [])

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)

  // ── Simulated pipeline ────────────────────────────────────
  const runSimulated = async () => {
    const stages: AnalysisStage[] = ['uploading', 'efficientnet', 'timesformer', 'bytetrack', 'vlm']
    const durations = [600, 900, 1100, 800, 1400]

    for (let i = 0; i < stages.length; i++) {
      setStage(stages[i])
      setProgress(Math.round(((i + 1) / (stages.length + 1)) * 100))
      await new Promise(r => setTimeout(r, durations[i]))
    }

    setStage('done')
    setProgress(100)
    setResult(MOCK_RESULT)
  }

  // ── Real API call (when ngrok/Flask is running) ───────────
  const runRealApi = async () => {
    if (!videoFile || !apiUrl) return
    setStage('uploading')
    setProgress(10)

    try {
      const form = new FormData()
      form.append('video', videoFile)

      setStage('efficientnet')
      setProgress(30)

      const res = await fetch(`${apiUrl}/analyze`, { method: 'POST', body: form })
      setProgress(80)

      if (!res.ok) throw new Error(`API error: ${res.status}`)

      const data = await res.json()
      setStage('done')
      setProgress(100)
      setResult(data)
    } catch (err) {
      console.error(err)
      setStage('idle')
      setProgress(0)
      alert(`API call failed: ${err}`)
    }
  }

  const handleAnalyze = () => {
    if (!videoFile) return
    setResult(null)
    if (useRealApi && apiUrl) runRealApi()
    else runSimulated()
  }

  const handleReset = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoFile(null)
    setVideoUrl(null)
    setStage('idle')
    setResult(null)
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isProcessing = !['idle', 'done', 'no_accident'].includes(stage)

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="video-test-layout">
      <Sidebar userRole="admin" />

      <main className="video-test-main">
        {/* Header */}
        <header className="vt-header">
          <div>
            <h1 className="vt-title">
              <span className="material-symbols-outlined">science</span>
              AI Detection Test Lab
            </h1>
            <p className="vt-subtitle">
              Upload an MP4 video to run the full accident detection pipeline locally.
            </p>
          </div>
          <span className="vt-badge">Demo Mode</span>
        </header>

        <div className="vt-body">

          {/* ── LEFT: Upload + Video + Controls ── */}
          <div className="vt-left">

            {/* Drop zone / video player */}
            {!videoUrl ? (
              <div
                className={`vt-dropzone glass-panel ${isDragging ? 'vt-dropzone--active' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
              >
                <span className="material-symbols-outlined vt-drop-icon">
                  {isDragging ? 'file_download' : 'upload_file'}
                </span>
                <p className="vt-drop-title">
                  {isDragging ? 'Drop to load video' : 'Drag & drop an MP4 here'}
                </p>
                <p className="vt-drop-sub">or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/*"
                  onChange={onFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            ) : (
              <div className="vt-player-wrap glass-panel">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="vt-player"
                />
                <div className="vt-file-meta">
                  <span className="material-symbols-outlined">videocam</span>
                  <span className="vt-file-name">{videoFile?.name}</span>
                  <span className="vt-file-size">
                    {videoFile ? `${(videoFile.size / 1024 / 1024).toFixed(1)} MB` : ''}
                  </span>
                  <button className="vt-btn-ghost" onClick={handleReset}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>
            )}

            {/* API toggle */}
            <div className="vt-api-row glass-panel">
              <label className="vt-toggle-label">
                <div
                  className={`vt-toggle ${useRealApi ? 'vt-toggle--on' : ''}`}
                  onClick={() => setUseRealApi(p => !p)}
                >
                  <div className="vt-toggle-knob" />
                </div>
                <span>Connect to live pipeline API</span>
              </label>
              {useRealApi && (
                <input
                  className="vt-input"
                  type="text"
                  placeholder="https://your-ngrok-url.ngrok.io"
                  value={apiUrl}
                  onChange={e => setApiUrl(e.target.value)}
                />
              )}
              {!useRealApi && (
                <p className="vt-api-note">
                  <span className="material-symbols-outlined">info</span>
                  Simulation mode — no Colab connection needed
                </p>
              )}
            </div>

            {/* Analyze button */}
            <button
              className={`vt-btn-analyze ${!videoFile || isProcessing ? 'vt-btn-analyze--disabled' : ''}`}
              onClick={handleAnalyze}
              disabled={!videoFile || isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className="vt-spinner" />
                  Processing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">play_circle</span>
                  Run AI Analysis
                </>
              )}
            </button>
          </div>

          {/* ── RIGHT: Pipeline status + Results ── */}
          <div className="vt-right">

            {/* Pipeline stage tracker */}
            <div className="vt-pipeline glass-panel">
              <h3 className="vt-section-title">Pipeline Status</h3>
              <div className="vt-stages">
                {(
                  [
                    { key: 'efficientnet', label: 'EfficientNet-B0',   sub: 'Frame classifier' },
                    { key: 'timesformer',  label: 'TimeSformer',        sub: '8-frame video ViT' },
                    { key: 'bytetrack',   label: 'YOLO11 + ByteTrack', sub: 'Physics tracker' },
                    { key: 'vlm',         label: 'Qwen2.5-VL-7B',      sub: 'Triage report' },
                  ] as const
                ).map((s, idx) => {
                  const stageOrder: AnalysisStage[] = ['efficientnet', 'timesformer', 'bytetrack', 'vlm']
                  const currentIdx = stageOrder.indexOf(stage as AnalysisStage)
                  const isDone    = currentIdx > idx || stage === 'done' || stage === 'no_accident'
                  const isActive  = stage === s.key
                  return (
                    <div key={s.key} className={`vt-stage ${isActive ? 'vt-stage--active' : ''} ${isDone ? 'vt-stage--done' : ''}`}>
                      <div className="vt-stage-icon">
                        {isDone
                          ? <span className="material-symbols-outlined">check</span>
                          : isActive
                            ? <span className="vt-spinner vt-spinner--sm" />
                            : <span className="vt-stage-num">{idx + 1}</span>
                        }
                      </div>
                      <div className="vt-stage-text">
                        <span className="vt-stage-name">{s.label}</span>
                        <span className="vt-stage-sub">{s.sub}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Progress bar */}
              {isProcessing && (
                <div className="vt-progress-wrap">
                  <div className="vt-progress-bar">
                    <div className="vt-progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="vt-progress-label">
                    <span className="material-symbols-outlined">{STAGE_ICONS[stage]}</span>
                    {STAGE_LABELS[stage]}
                  </span>
                </div>
              )}

              {stage === 'idle' && !result && (
                <p className="vt-idle-hint">Upload a video and click Run AI Analysis to begin.</p>
              )}
            </div>

            {/* Triage Report */}
            {result && (
              <div className="vt-report glass-panel">
                <div
                  className="vt-report-banner"
                  style={{ background: SEVERITY_COLOR[result.triage.alert_level] }}
                >
                  <span className="material-symbols-outlined">
                    {result.triage.alert_level === 'HIGH' || result.triage.alert_level === 'CRITICAL'
                      ? 'emergency_home'
                      : 'warning'}
                  </span>
                  <div>
                    <p className="vt-alert-level">{result.triage.alert_level} SEVERITY</p>
                    <p className="vt-alert-sub">
                      Accident detected at {result.triggered_at_sec.toFixed(1)}s &nbsp;·&nbsp;
                      Latency {result.latency_ms} ms &nbsp;·&nbsp;
                      Confidence {Math.round(result.triage.confidence * 100)}%
                    </p>
                  </div>
                </div>

                <div className="vt-report-body">
                  {/* Scene */}
                  <div className="vt-report-row">
                    <span className="material-symbols-outlined vt-ri">description</span>
                    <div>
                      <p className="vt-ri-label">Scene Description</p>
                      <p className="vt-ri-value">{result.triage.scene_description}</p>
                    </div>
                  </div>

                  {/* Detection method */}
                  <div className="vt-report-row">
                    <span className="material-symbols-outlined vt-ri">smart_toy</span>
                    <div>
                      <p className="vt-ri-label">Detection Method</p>
                      <p className="vt-ri-value">{result.detection_method} — {result.collision_type}</p>
                    </div>
                  </div>

                  {/* Vehicles */}
                  <div className="vt-report-row">
                    <span className="material-symbols-outlined vt-ri">directions_car</span>
                    <div>
                      <p className="vt-ri-label">Vehicles Involved</p>
                      <p className="vt-ri-value">
                        {result.triage.vehicle_count} vehicles —&nbsp;
                        {result.triage.vehicles_involved.join(', ')}
                        {result.triage.pedestrians_in_scene && ' · Pedestrian in scene'}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="vt-report-row">
                    <span className="material-symbols-outlined vt-ri">location_on</span>
                    <div>
                      <p className="vt-ri-label">Collision Zone</p>
                      <p className="vt-ri-value">
                        {result.triage.collision_zone} &nbsp;·&nbsp; {result.triage.road_type}
                      </p>
                    </div>
                  </div>

                  {/* Hazards */}
                  <div className="vt-report-row">
                    <span className="material-symbols-outlined vt-ri">warning</span>
                    <div>
                      <p className="vt-ri-label">Hazards</p>
                      <div className="vt-tags">
                        {result.triage.hazards.length > 0
                          ? result.triage.hazards.map(h => (
                              <span key={h} className="vt-tag vt-tag--warn">
                                {h.replace(/_/g, ' ')}
                              </span>
                            ))
                          : <span className="vt-tag">none</span>
                        }
                      </div>
                    </div>
                  </div>

                  {/* Recommended units */}
                  <div className="vt-report-row">
                    <span className="material-symbols-outlined vt-ri">local_police</span>
                    <div>
                      <p className="vt-ri-label">Recommended Units</p>
                      <div className="vt-tags">
                        {result.triage.recommended_units.map(u => (
                          <span key={u} className="vt-tag vt-tag--blue">
                            {u}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Severity score bar */}
                  <div className="vt-severity-row">
                    <span className="vt-ri-label">Severity Score</span>
                    <div className="vt-severity-bar-wrap">
                      <div className="vt-severity-bar">
                        <div
                          className="vt-severity-fill"
                          style={{
                            width: `${(result.triage.severity_score / 10) * 100}%`,
                            background: SEVERITY_COLOR[result.triage.alert_level],
                          }}
                        />
                      </div>
                      <span className="vt-severity-score">
                        {result.triage.severity_score}/10
                      </span>
                    </div>
                  </div>

                  {/* Raw JSON toggle */}
                  <details className="vt-raw">
                    <summary className="vt-raw-toggle">
                      <span className="material-symbols-outlined">code</span>
                      View raw JSON output
                    </summary>
                    <pre className="vt-raw-pre">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default VideoTest
