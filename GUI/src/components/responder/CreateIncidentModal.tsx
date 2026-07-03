import React, { useState } from 'react'
import { IncidentSeverity, ConfidenceLevel } from '../../types/incident'
import { createIncident, CreateIncidentPayload } from '../../services/incidentOrchestrator'
import './CreateIncidentModal.css'

interface Props {
  onClose: () => void
  onCreated: () => void // caller refreshes the list
}

interface FormState {
  // Required
  location: string
  lat: string
  lng: string
  time: string
  severity: IncidentSeverity | ''
  confidence: ConfidenceLevel | ''
  aiSummary: string
  // Optional
  estimatedInjuries: string
  traffic: string
  cameraId: string
  llmHospital: string
  llmPolice: string
  llmNajm: string
  // Weather sub-fields (assembled into jsonb on submit)
  weatherCondition: string
  weatherTemp: string
  weatherVisibility: string
}

interface FormErrors {
  location?: string
  lat?: string
  lng?: string
  time?: string
  severity?: string
  confidence?: string
  aiSummary?: string
  estimatedInjuries?: string
  weatherTemp?: string
  global?: string
}

// Default time = now rounded to the minute
const nowLocal = (): string => {
  const d = new Date()
  d.setSeconds(0, 0)
  // datetime-local expects "YYYY-MM-DDTHH:mm"
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const RIYADH_LAT = '24.7136'
const RIYADH_LNG = '46.6753'

const CreateIncidentModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState<FormState>({
    location: '',
    lat: '',
    lng: '',
    time: nowLocal(),
    severity: '',
    confidence: '',
    aiSummary: '',
    estimatedInjuries: '',
    traffic: '',
    cameraId: '',
    llmHospital: '',
    llmPolice: '',
    llmNajm: '',
    weatherCondition: '',
    weatherTemp: '',
    weatherVisibility: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [showOptional, setShowOptional] = useState(false)

  // -------------------------------------------------------------------------
  //  Field change helper
  // -------------------------------------------------------------------------
  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    // Clear field-level error on change
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  // -------------------------------------------------------------------------
  //  Validation
  // -------------------------------------------------------------------------
  const validate = (): boolean => {
    const errs: FormErrors = {}

    if (!form.location.trim()) {
      errs.location = 'Location is required'
    }

    const latNum = parseFloat(form.lat)
    if (form.lat.trim() === '' || isNaN(latNum)) {
      errs.lat = 'Latitude is required'
    } else if (latNum < -90 || latNum > 90) {
      errs.lat = 'Must be between -90 and 90'
    }

    const lngNum = parseFloat(form.lng)
    if (form.lng.trim() === '' || isNaN(lngNum)) {
      errs.lng = 'Longitude is required'
    } else if (lngNum < -180 || lngNum > 180) {
      errs.lng = 'Must be between -180 and 180'
    }

    if (!form.time) {
      errs.time = 'Date and time are required'
    } else if (isNaN(new Date(form.time).getTime())) {
      errs.time = 'Invalid date/time'
    }

    if (!form.severity) {
      errs.severity = 'Severity is required'
    }

    if (!form.confidence) {
      errs.confidence = 'Confidence level is required'
    }

    if (!form.aiSummary.trim()) {
      errs.aiSummary = 'Incident description is required'
    }

    if (form.estimatedInjuries.trim() !== '') {
      const n = parseInt(form.estimatedInjuries, 10)
      if (isNaN(n) || n < 0) {
        errs.estimatedInjuries = 'Must be a non-negative whole number'
      }
    }

    if (form.weatherTemp.trim() !== '' && isNaN(parseFloat(form.weatherTemp))) {
      errs.weatherTemp = 'Temperature must be a number'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // -------------------------------------------------------------------------
  //  Submit
  // -------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    setErrors((prev) => ({ ...prev, global: undefined }))

    try {
      // Assemble weather jsonb only if at least one sub-field is filled
      let weather: CreateIncidentPayload['weather'] | undefined
      if (form.weatherCondition || form.weatherTemp || form.weatherVisibility) {
        weather = {
          condition:   form.weatherCondition || 'Unknown',
          temperature: form.weatherTemp ? parseFloat(form.weatherTemp) : 0,
          visibility:  form.weatherVisibility || 'Unknown',
        }
      }

      const payload: CreateIncidentPayload = {
        location:           form.location.trim(),
        lat:                parseFloat(form.lat),
        lng:                parseFloat(form.lng),
        time:               new Date(form.time).toISOString(),
        severity:           form.severity as IncidentSeverity,
        confidence:         form.confidence as ConfidenceLevel,
        aiSummary:          form.aiSummary.trim(),
        estimatedInjuries:  form.estimatedInjuries.trim() !== ''
                              ? parseInt(form.estimatedInjuries, 10)
                              : undefined,
        weather,
        traffic:            form.traffic.trim() || undefined,
        cameraId:           form.cameraId.trim() || undefined,
        llmHospital:        form.llmHospital.trim() || undefined,
        llmPolice:          form.llmPolice.trim() || undefined,
        llmNajm:            form.llmNajm.trim() || undefined,
      }

      await createIncident(payload)
      onCreated()  // triggers list refresh + closes modal
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setErrors((prev) => ({ ...prev, global: msg }))
    } finally {
      setSaving(false)
    }
  }

  // -------------------------------------------------------------------------
  //  Render
  // -------------------------------------------------------------------------
  return (
    <div className="ci-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ci-modal" role="dialog" aria-labelledby="ci-title">
        {/* Header */}
        <div className="ci-header">
          <div className="ci-header-icon">
            <span className="material-symbols-outlined">add_alert</span>
          </div>
          <div className="ci-header-text">
            <h2 className="ci-title" id="ci-title">Create New Incident Report</h2>
            <p className="ci-subtitle">Manually log an incident into the response system</p>
          </div>
          <button className="ci-close-btn" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="ci-body">

            {/* ── Core Information ── */}
            <div className="ci-section">
              <p className="ci-section-title">Incident Details</p>

              {/* Location */}
              <div className="ci-field ci-row-full">
                <label className="ci-label" htmlFor="ci-location">
                  Location <span className="ci-required">*</span>
                </label>
                <input
                  id="ci-location"
                  className={`ci-input${errors.location ? ' ci-error' : ''}`}
                  type="text"
                  placeholder="e.g. King Fahd Road, Al Olaya District, Riyadh"
                  value={form.location}
                  onChange={set('location')}
                  disabled={saving}
                />
                {errors.location && (
                  <span className="ci-field-error">
                    <span className="material-symbols-outlined">error</span>
                    {errors.location}
                  </span>
                )}
              </div>

              {/* Lat / Lng / Fill button */}
              <div className="ci-coords-row">
                <div className="ci-field">
                  <label className="ci-label" htmlFor="ci-lat">
                    Latitude <span className="ci-required">*</span>
                  </label>
                  <input
                    id="ci-lat"
                    className={`ci-input${errors.lat ? ' ci-error' : ''}`}
                    type="number"
                    step="any"
                    placeholder="24.7136"
                    value={form.lat}
                    onChange={set('lat')}
                    disabled={saving}
                  />
                  {errors.lat && (
                    <span className="ci-field-error">
                      <span className="material-symbols-outlined">error</span>
                      {errors.lat}
                    </span>
                  )}
                </div>

                <div className="ci-field">
                  <label className="ci-label" htmlFor="ci-lng">
                    Longitude <span className="ci-required">*</span>
                  </label>
                  <input
                    id="ci-lng"
                    className={`ci-input${errors.lng ? ' ci-error' : ''}`}
                    type="number"
                    step="any"
                    placeholder="46.6753"
                    value={form.lng}
                    onChange={set('lng')}
                    disabled={saving}
                  />
                  {errors.lng && (
                    <span className="ci-field-error">
                      <span className="material-symbols-outlined">error</span>
                      {errors.lng}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="ci-coords-hint-btn"
                  title="Fill Riyadh city center coordinates"
                  onClick={() => setForm((prev) => ({ ...prev, lat: RIYADH_LAT, lng: RIYADH_LNG }))}
                  disabled={saving}
                >
                  <span className="material-symbols-outlined">my_location</span>
                  Riyadh
                </button>
              </div>

              {/* Date / Time */}
              <div className="ci-field">
                <label className="ci-label" htmlFor="ci-time">
                  Incident Date & Time <span className="ci-required">*</span>
                </label>
                <input
                  id="ci-time"
                  className={`ci-input${errors.time ? ' ci-error' : ''}`}
                  type="datetime-local"
                  value={form.time}
                  onChange={set('time')}
                  disabled={saving}
                />
                {errors.time && (
                  <span className="ci-field-error">
                    <span className="material-symbols-outlined">error</span>
                    {errors.time}
                  </span>
                )}
              </div>

              {/* Severity / Confidence */}
              <div className="ci-row">
                <div className="ci-field">
                  <label className="ci-label" htmlFor="ci-severity">
                    Severity <span className="ci-required">*</span>
                  </label>
                  <select
                    id="ci-severity"
                    className={`ci-select${errors.severity ? ' ci-error' : ''}`}
                    value={form.severity}
                    onChange={set('severity')}
                    disabled={saving}
                  >
                    <option value="">Select severity…</option>
                    <option value="high">🔴 High</option>
                    <option value="moderate">🟠 Moderate</option>
                    <option value="low">🟡 Low</option>
                  </select>
                  {errors.severity && (
                    <span className="ci-field-error">
                      <span className="material-symbols-outlined">error</span>
                      {errors.severity}
                    </span>
                  )}
                </div>

                <div className="ci-field">
                  <label className="ci-label" htmlFor="ci-confidence">
                    Confidence <span className="ci-required">*</span>
                  </label>
                  <select
                    id="ci-confidence"
                    className={`ci-select${errors.confidence ? ' ci-error' : ''}`}
                    value={form.confidence}
                    onChange={set('confidence')}
                    disabled={saving}
                  >
                    <option value="">Select confidence…</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  {errors.confidence && (
                    <span className="ci-field-error">
                      <span className="material-symbols-outlined">error</span>
                      {errors.confidence}
                    </span>
                  )}
                </div>
              </div>

              {/* AI Summary / Description */}
              <div className="ci-field">
                <label className="ci-label" htmlFor="ci-summary">
                  Incident Description <span className="ci-required">*</span>
                </label>
                <textarea
                  id="ci-summary"
                  className={`ci-textarea${errors.aiSummary ? ' ci-error' : ''}`}
                  placeholder="Describe the incident — what happened, who is involved, and the current situation…"
                  value={form.aiSummary}
                  onChange={set('aiSummary')}
                  disabled={saving}
                  rows={4}
                />
                {errors.aiSummary && (
                  <span className="ci-field-error">
                    <span className="material-symbols-outlined">error</span>
                    {errors.aiSummary}
                  </span>
                )}
              </div>
            </div>

            <div className="ci-divider" />

            {/* ── Optional Details toggle ── */}
            <div className="ci-section">
              <button
                type="button"
                className={`ci-optional-toggle${showOptional ? ' open' : ''}`}
                onClick={() => setShowOptional((p) => !p)}
              >
                <span className="material-symbols-outlined">expand_more</span>
                {showOptional ? 'Hide optional details' : 'Add optional details'}
                &nbsp;(injuries, weather, dispatch notes…)
              </button>

              {showOptional && (
                <>
                  {/* Estimated injuries + Traffic */}
                  <div className="ci-row">
                    <div className="ci-field">
                      <label className="ci-label" htmlFor="ci-injuries">
                        Estimated Injuries
                      </label>
                      <input
                        id="ci-injuries"
                        className={`ci-input${errors.estimatedInjuries ? ' ci-error' : ''}`}
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={form.estimatedInjuries}
                        onChange={set('estimatedInjuries')}
                        disabled={saving}
                      />
                      {errors.estimatedInjuries && (
                        <span className="ci-field-error">
                          <span className="material-symbols-outlined">error</span>
                          {errors.estimatedInjuries}
                        </span>
                      )}
                    </div>

                    <div className="ci-field">
                      <label className="ci-label" htmlFor="ci-traffic">
                        Traffic Conditions
                      </label>
                      <input
                        id="ci-traffic"
                        className="ci-input"
                        type="text"
                        placeholder="e.g. Heavy congestion"
                        value={form.traffic}
                        onChange={set('traffic')}
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {/* Camera ID */}
                  <div className="ci-field">
                    <label className="ci-label" htmlFor="ci-camera">
                      Camera ID
                    </label>
                    <input
                      id="ci-camera"
                      className="ci-input"
                      type="text"
                      placeholder="e.g. CAM-042"
                      value={form.cameraId}
                      onChange={set('cameraId')}
                      disabled={saving}
                    />
                  </div>

                  {/* Weather */}
                  <p className="ci-section-title" style={{ marginTop: 4 }}>Weather Conditions</p>
                  <div className="ci-row ci-row-3">
                    <div className="ci-field">
                      <label className="ci-label" htmlFor="ci-w-condition">Condition</label>
                      <input
                        id="ci-w-condition"
                        className="ci-input"
                        type="text"
                        placeholder="e.g. Clear"
                        value={form.weatherCondition}
                        onChange={set('weatherCondition')}
                        disabled={saving}
                      />
                    </div>
                    <div className="ci-field">
                      <label className="ci-label" htmlFor="ci-w-temp">
                        Temperature (°C)
                      </label>
                      <input
                        id="ci-w-temp"
                        className={`ci-input${errors.weatherTemp ? ' ci-error' : ''}`}
                        type="number"
                        step="0.1"
                        placeholder="e.g. 38"
                        value={form.weatherTemp}
                        onChange={set('weatherTemp')}
                        disabled={saving}
                      />
                      {errors.weatherTemp && (
                        <span className="ci-field-error">
                          <span className="material-symbols-outlined">error</span>
                          {errors.weatherTemp}
                        </span>
                      )}
                    </div>
                    <div className="ci-field">
                      <label className="ci-label" htmlFor="ci-w-vis">Visibility</label>
                      <input
                        id="ci-w-vis"
                        className="ci-input"
                        type="text"
                        placeholder="e.g. Good"
                        value={form.weatherVisibility}
                        onChange={set('weatherVisibility')}
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {/* LLM dispatch recommendations */}
                  <p className="ci-section-title" style={{ marginTop: 4 }}>Dispatch Recommendations</p>
                  <div className="ci-field">
                    <label className="ci-label" htmlFor="ci-llm-hospital">Hospital / Medical</label>
                    <textarea
                      id="ci-llm-hospital"
                      className="ci-textarea"
                      placeholder="Hospital or medical dispatch notes…"
                      value={form.llmHospital}
                      onChange={set('llmHospital')}
                      disabled={saving}
                      rows={2}
                    />
                  </div>
                  <div className="ci-field">
                    <label className="ci-label" htmlFor="ci-llm-police">Police</label>
                    <textarea
                      id="ci-llm-police"
                      className="ci-textarea"
                      placeholder="Police dispatch notes…"
                      value={form.llmPolice}
                      onChange={set('llmPolice')}
                      disabled={saving}
                      rows={2}
                    />
                  </div>
                  <div className="ci-field">
                    <label className="ci-label" htmlFor="ci-llm-najm">Najm Insurance</label>
                    <textarea
                      id="ci-llm-najm"
                      className="ci-textarea"
                      placeholder="Najm insurance notes…"
                      value={form.llmNajm}
                      onChange={set('llmNajm')}
                      disabled={saving}
                      rows={2}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Global error */}
            {errors.global && (
              <div className="ci-error-banner">
                <span className="material-symbols-outlined">error</span>
                <span>{errors.global}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="ci-footer">
            <button
              type="button"
              className="ci-btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="ci-btn-submit" disabled={saving}>
              {saving ? (
                <>
                  <span className="ci-spinner" />
                  Creating…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">add_alert</span>
                  Create Incident
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateIncidentModal
