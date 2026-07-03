import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Fix for default marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface MarkerData {
  id: string;
  position: [number, number];
  severity?: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description?: string;
  onClick?: () => void;
}

interface MapViewProps {
  center: [number, number];
  zoom?: number;
  markers?: MarkerData[];
  height?: string;
  className?: string;
}

// Custom marker icons based on severity
const createCustomIcon = (severity?: string) => {
  const colors: {[key: string]: string} = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#facc15',
    low: '#3b82f6'
  };
  
  const color = colors[severity || 'low'] || '#6b7280';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border: 3px solid #fff;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      ">
        <div style="
          width: 48px;
          height: 48px;
          background: ${color};
          border-radius: 50%;
          position: absolute;
          opacity: 0.3;
          animation: pulse 2s infinite;
        "></div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Component to handle map updates
const MapUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
};

const MapView: React.FC<MapViewProps> = ({ 
  center, 
  zoom = 13, 
  markers = [], 
  height = '100%',
  className = '' 
}) => {
  return (
    <div className={`map-view-container ${className}`} style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: '12px' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={center} zoom={zoom} />
        
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            icon={createCustomIcon(marker.severity)}
            eventHandlers={{
              click: () => marker.onClick?.(),
            }}
          >
            <Popup>
              <div style={{ padding: '8px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
                  {marker.title}
                </h3>
                {marker.description && (
                  <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                    {marker.description}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;

