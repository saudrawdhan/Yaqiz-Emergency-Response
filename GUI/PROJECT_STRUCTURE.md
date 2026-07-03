# Emergency Response Command Platform - Project Structure

## Overview
A comprehensive command-and-control platform for emergency response management with AI-powered accident detection, real-time incident monitoring, and multi-agency collaboration.

## Technology Stack
- **Frontend**: React 18.2 with TypeScript
- **Styling**: CSS Modules / Styled Components
- **State Management**: React Context API + Custom Hooks
- **Routing**: React Router v6
- **Maps**: React Leaflet / Mapbox GL
- **Charts**: Recharts / Chart.js
- **PDF Generation**: jsPDF / React-PDF
- **Icons**: Material Design Icons / React Icons

## Project Structure

```
emergency-response-platform/
├── public/
│   ├── index.html
│   └── assets/
│       ├── images/
│       └── icons/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Card.tsx
│   │   ├── admin/
│   │   │   ├── CameraList.tsx
│   │   │   ├── CameraMap.tsx
│   │   │   ├── AddCameraWizard.tsx
│   │   │   ├── UserTable.tsx
│   │   │   └── AuditLogTable.tsx
│   │   └── responder/
│   │       ├── IncidentCard.tsx
│   │       ├── IncidentMap.tsx
│   │       ├── AlertModal.tsx
│   │       ├── IncidentTimeline.tsx
│   │       └── CollaborationLog.tsx
│   ├── screens/
│   │   ├── auth/
│   │   │   └── LoginScreen.tsx
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── CameraManagement.tsx
│   │   │   ├── UserManagement.tsx
│   │   │   └── SystemAuditLog.tsx
│   │   └── responder/
│   │       ├── ResponderDashboard.tsx
│   │       ├── IncidentDetails.tsx
│   │       └── IncidentArchives.tsx
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   ├── IncidentContext.tsx
│   │   └── SystemContext.tsx
│   ├── services/
│   │   ├── api.ts
│   │   ├── dataService.ts
│   │   ├── pdfService.ts
│   │   └── websocketService.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useIncidents.ts
│   │   └── useSystemHealth.ts
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── ThemeContext.tsx
│   │   └── globalStyles.css
│   ├── types/
│   │   ├── user.ts
│   │   ├── incident.ts
│   │   ├── camera.ts
│   │   └── system.ts
│   ├── utils/
│   │   ├── dateUtils.ts
│   │   ├── validation.ts
│   │   └── formatters.ts
│   ├── App.tsx
│   └── index.tsx
├── package.json
├── tsconfig.json
├── .eslintrc.json
└── README.md
```

## Design System

### Color Palette
- **Background**: #202a37 (Dark gray/charcoal)
- **Card Background**: #323a45
- **Primary**: #0071bc (Trust blue)
- **Alert/High Severity**: #e31c3d (Red)
- **Warning/Moderate**: #fdb81e (Yellow)
- **Success/Low Severity**: #2e8540 (Green)
- **Text Primary**: #ffffff
- **Text Secondary**: #aeb0b5

### Typography Scale
- **Display 1**: 48px, Light, Line-height: 1.2
- **Headline 1**: 24px, Bold, Line-height: 1.3
- **Headline 2**: 18px, Bold, Line-height: 1.4
- **Body 1**: 16px, Regular, Line-height: 1.5
- **Body 2**: 14px, Regular, Line-height: 1.5
- **Label**: 12px, Medium, Line-height: 1.5

### Component Specifications

#### 1. Login Screen
- Centered form on dark background
- Email and password fields
- Login button (primary action)
- Support links (Forgot Password, Contact Admin)
- Error message area

#### 2. Admin Dashboard
- Left sidebar navigation
- System health widgets:
  - Core system status (AI Engine, Alerting, Database)
  - Camera fleet status (donut chart + stats)
  - Live performance metrics (line graph)
  - Recent system errors list

#### 3. Camera Management
- Tabbed interface: List | Map
- Camera List: Table with columns (ID, Name, Location, Stream URL, Status, Actions)
- Camera Map: Interactive map with color-coded pins
- Add Camera: 3-step wizard
  - Step 1: Identification (Name, ID)
  - Step 2: Connection & Location (Stream URL constructor, Map pin)
  - Step 3: Verification (Live stream preview)

#### 4. User Management
- User table (Name, Email, Agency, Role, Status, Last Login, Actions)
- Add User modal with role-specific settings
- Hospital role: Alert escalation settings toggle

#### 5. System Audit Log
- Searchable/filterable table
- Columns: Timestamp, User, IP Address, Action
- Filters: Date range, User, Action type

#### 6. Responder Dashboard
- Top metrics bar (New incidents, Acknowledged, Avg. acknowledge time)
- Left panel: Incident queue (filterable, scrollable cards)
- Right panel: Interactive incident map
- Cross-filtering: Click list → pan map, Click map → highlight list

#### 7. Alert Modal
- Interruptive modal for new high-severity incidents
- Visual progress bar (10s countdown, not numerical)
- Single "Accept & View Details" button
- Audio alert (single chime)

#### 8. Incident Details
- Header: Case ID, Status badge, Update Status button
- Left panel (60%): Event summary (LLM), Agency-specific info (LLM), Photos gallery
- Right panel (40%): Static map, Action log timeline
- Visual citations: [Verify] links in LLM text → scroll to photo
- Collaboration log: Real-time chat feed

#### 9. Incident Archives
- Tabbed: Archive Search | Analytics
- Archive: Advanced search, paginated table
- Analytics: Date range selector, metrics widgets, visualizations (heatmap, bar charts, pie charts)

#### 10. PDF Report
- Multi-page formal document
- Sections: Summary, Environmental Context, AI Synopsis, Visual Evidence, Response Log, Dispatched Units

## State Management

### Context Providers
1. **AuthContext**: User authentication, role-based access
2. **IncidentContext**: Real-time incident data, updates
3. **SystemContext**: System health, camera status, audit logs

### Data Flow
- Services layer handles API calls and WebSocket connections
- Context providers manage global state
- Components consume context via hooks
- Local state for UI-specific data (modals, forms)

## Key Features

### Real-time Updates
- WebSocket connection for live incident updates
- Auto-refresh for system health metrics
- Live collaboration log updates

### XAI (Explainable AI) Framework
- All LLM content labeled as "AI-Generated"
- Confidence scores for predictions
- Visual citations linking claims to evidence
- Uncertainty framing for estimates

### Responsive Design
- Desktop-first (multi-monitor control center)
- Tablet accessibility
- Mobile-friendly navigation

## Security Considerations
- Role-based access control
- Secure authentication
- Audit trail for all actions
- IP address logging

## Performance Optimizations
- Lazy loading for routes
- Virtualized lists for large datasets
- Memoized components
- Debounced search/filter inputs

