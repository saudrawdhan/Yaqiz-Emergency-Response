import React, { useState, useMemo } from 'react';
import Sidebar from '../../components/common/Sidebar';
import { useSystem } from '../../context/SystemContext';
import './SystemAuditLog.css';

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

/** Map the raw action string prefix to a readable label for the filter UI. */
const ACTION_PREFIXES = [
  { value: '',            label: 'Action Type: All' },
  { value: 'TRANSITION',  label: 'Transitions'      },
  { value: 'CREATE',      label: 'Creates'           },
  { value: 'ASSIGN',      label: 'Assignments'       },
  { value: 'DISPATCH',    label: 'Dispatches'        },
  { value: 'NOTIFY',      label: 'Notifications'     },
  { value: 'REJECTED',    label: 'Rejected'          },
]

/** Map entity_type to a readable badge. */
const entityBadge = (type: string | null): string => {
  switch (type) {
    case 'incident': return '🚨 Incident'
    case 'camera':   return '📷 Camera'
    case 'unit':     return '🚑 Unit'
    default:         return type ?? '—'
  }
}

/** Returns a CSS class suffix based on action prefix for colour-coding. */
const actionClass = (action: string): string => {
  if (action.startsWith('TRANSITION'))  return 'transition'
  if (action.startsWith('CREATE'))      return 'create'
  if (action.startsWith('ASSIGN'))      return 'assign'
  if (action.startsWith('DISPATCH'))    return 'dispatch'
  if (action.startsWith('NOTIFY'))      return 'notify'
  if (action.startsWith('REJECTED'))    return 'rejected'
  return 'default'
}

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------

const SystemAuditLog: React.FC = () => {
  const { auditLog, refreshAuditLog } = useSystem()

  const [searchQuery, setSearchQuery]       = useState('')
  const [actionFilter, setActionFilter]     = useState('')
  const [entityFilter, setEntityFilter]     = useState('')
  const [isRefreshing, setIsRefreshing]     = useState(false)

  // Derived: unique entity types present in the current log for the filter dropdown
  const entityTypes = useMemo(() => {
    const types = new Set(auditLog.map((e) => e.entityType).filter(Boolean) as string[])
    return Array.from(types).sort()
  }, [auditLog])

  // Derived: filtered + searched entries
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return auditLog.filter((entry) => {
      const matchesSearch =
        !q ||
        (entry.user ?? '').toLowerCase().includes(q) ||
        (entry.action ?? '').toLowerCase().includes(q) ||
        (entry.entityId ?? '').toLowerCase().includes(q)

      const matchesAction =
        !actionFilter || entry.action.startsWith(actionFilter)

      const matchesEntity =
        !entityFilter || entry.entityType === entityFilter

      return matchesSearch && matchesAction && matchesEntity
    })
  }, [auditLog, searchQuery, actionFilter, entityFilter])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshAuditLog()
    setIsRefreshing(false)
  }

  const handleExport = () => {
    const header = 'Timestamp,User,Action,Entity Type,Entity ID\n'
    const rows = filtered
      .map((e) =>
        [
          new Date(e.timestamp).toISOString(),
          `"${e.user ?? ''}"`,
          `"${e.action}"`,
          e.entityType ?? '',
          e.entityId ?? '',
        ].join(',')
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="audit-layout">
      <Sidebar userRole="admin" />

      <main className="audit-main">
        <div className="audit-container">

          {/* Header */}
          <header className="audit-header">
            <div>
              <h1>System Audit Log</h1>
              <p>
                Live system activity trail — {filtered.length} of {auditLog.length} entries shown
              </p>
            </div>
            <div className="audit-header-actions">
              <button
                className="btn-refresh"
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Refresh audit log"
              >
                <span className={`material-symbols-outlined${isRefreshing ? ' spinning' : ''}`}>
                  refresh
                </span>
              </button>
              <button className="btn-export" onClick={handleExport} disabled={filtered.length === 0}>
                <span className="material-symbols-outlined">download</span>
                <span>Export CSV</span>
              </button>
            </div>
          </header>

          {/* Filters */}
          <div className="audit-filters">
            {/* Live search */}
            <div className="audit-search-box">
              <span className="material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder="Search by user, action, or entity ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="audit-search-clear" onClick={() => setSearchQuery('')}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>

            {/* Action type filter */}
            <select
              className="filter-select"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              {ACTION_PREFIXES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* Entity type filter — populated from live data */}
            <select
              className="filter-select"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            >
              <option value="">Entity: All</option>
              {entityTypes.map((t) => (
                <option key={t} value={t}>{entityBadge(t)}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="audit-log-container">
            {auditLog.length === 0 ? (
              /* Initial load — no data yet */
              <div className="empty-audit">
                <span className="material-symbols-outlined">history</span>
                <p>Loading audit log…</p>
              </div>
            ) : filtered.length === 0 ? (
              /* Data loaded but filters produced no matches */
              <div className="empty-audit">
                <span className="material-symbols-outlined">search_off</span>
                <p>No entries match the current filters</p>
                <button
                  className="btn-clear-filters"
                  onClick={() => { setSearchQuery(''); setActionFilter(''); setEntityFilter('') }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="audit-log">
                {filtered.map((entry) => (
                  <div key={entry.id} className={`log-item log-item--${actionClass(entry.action)}`}>

                    <div className="timestamp-cell">
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>

                    <div className="user-cell">
                      <span className="material-symbols-outlined user-icon">person</span>
                      <span>{entry.user ?? '—'}</span>
                    </div>

                    <div className="action-cell">
                      {entry.action}
                    </div>

                    <div className="entity-cell">
                      {entry.entityType ? (
                        <span className={`entity-badge entity-badge--${entry.entityType}`}>
                          {entityBadge(entry.entityType)}
                        </span>
                      ) : (
                        <span className="entity-badge entity-badge--none">—</span>
                      )}
                      {entry.entityId && (
                        <span className="entity-id">{entry.entityId}</span>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer count */}
          {filtered.length > 0 && (
            <div className="audit-footer">
              Showing {filtered.length} of {auditLog.length} entries (most recent 50 loaded)
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

export default SystemAuditLog
