# Emergency Response Command Platform

A comprehensive command-and-control platform for emergency response management with AI-powered accident detection, real-time incident monitoring, and multi-agency collaboration.

## Features

### System Administrator
- **System Health Dashboard**: Real-time monitoring of AI engine, alerting service, database, and camera fleet
- **Camera Management**: Add, edit, and manage camera infrastructure with interactive map view
- **User Management**: Full user lifecycle management with role-based access control
- **System Audit Log**: Comprehensive audit trail for security and accountability

### First Responder
- **Real-Time Incident Dashboard**: Live monitoring of active incidents with filtering and search
- **Alert Modal**: Interruptive notifications for high-severity incidents with visual countdown
- **Incident Details**: Comprehensive incident management with AI summaries, visual evidence, and collaboration log
- **Incident Archives & Analytics**: Searchable archive and performance analytics

## Technology Stack

- **Frontend**: React 18.2 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Charts**: Recharts
- **PDF Generation**: jsPDF
- **Maps**: Leaflet (ready for integration)

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open browser to `http://localhost:3000`

### Demo Credentials

**Admin:**
- Email: `admin@system.gov`
- Password: `password123`

**Responder (Hospital):**
- Email: `responder@hospital.gov`
- Password: `password123`

**Responder (Police):**
- Email: `responder@police.gov`
- Password: `password123`

## Project Structure

See `PROJECT_STRUCTURE.md` for detailed project architecture and design specifications.

## Design System

The application follows a professional, data-driven design system optimized for 24/7 operations:

- **Color Palette**: Dark mode base (#202a37) with semantic colors for alerts and status
- **Typography**: Inter/Roboto font family with clear hierarchy
- **Components**: Reusable, accessible components following XAI principles

## Key Features

### XAI (Explainable AI) Framework
- All AI-generated content clearly labeled
- Confidence scores for predictions
- Visual citations linking claims to evidence
- Uncertainty framing for estimates

### Real-time Updates
- WebSocket-ready architecture for live incident updates
- Auto-refresh for system health metrics
- Live collaboration log

### Responsive Design
- Desktop-first (multi-monitor control center)
- Tablet accessibility
- Mobile-friendly navigation

## Development

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Linting
```bash
npm run lint
```

## License

Private - Internal Use Only

