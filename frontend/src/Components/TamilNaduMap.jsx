import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, CircleMarker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Webpack/React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [24, 36],
    iconAnchor: [12, 36]
});
L.Marker.prototype.options.icon = DefaultIcon;

export const TN_CITIES = [
  { id: 'CHENNAI', name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { id: 'COIMBATORE', name: 'Coimbatore', lat: 11.0168, lng: 76.9558 },
  { id: 'MADURAI', name: 'Madurai', lat: 9.9252, lng: 78.1198 },
  { id: 'SALEM', name: 'Salem', lat: 11.6643, lng: 78.1460 },
  { id: 'TRICHY', name: 'Tiruchirappalli', lat: 10.7905, lng: 78.7047 },
  { id: 'TIRUNELVELI', name: 'Tirunelveli', lat: 8.7139, lng: 77.7567 },
  { id: 'VELLORE', name: 'Vellore', lat: 12.9165, lng: 79.1325 },
  { id: 'ERODE', name: 'Erode', lat: 11.3410, lng: 77.7172 },
  { id: 'THOOTHUKUDI', name: 'Thoothukudi', lat: 8.7973, lng: 78.1348 },
  { id: 'THANJAVUR', name: 'Thanjavur', lat: 10.7870, lng: 79.1378 }
];

const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

const TamilNaduMap = ({ 
  userLocation, 
  selectedCity,
  onCityClick, 
  onMapClick,
  onHubRelocate,
  simulationPath,
  zoom = 7,
  interactive = true 
}) => {
  const defaultCenter = [13.0827, 80.2707];
  const currentCenter = userLocation || defaultCenter;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
      <style>{`
        @keyframes leaflet-dash-anim {
          from { stroke-dashoffset: 100; }
          to { stroke-dashoffset: 0; }
        }
        .animated-polyline {
          animation: leaflet-dash-anim 2s linear infinite !important;
        }
        .leaflet-container { background: #1a1a1a !important; }
      `}</style>
      <MapContainer 
        center={currentCenter} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={interactive}
        dragging={interactive}
        scrollWheelZoom={interactive}
      >
        <ChangeView center={currentCenter} zoom={zoom} />
        <MapClickHandler onMapClick={onMapClick} />
        
        {/* Tile Layer (Clean Voyager style) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* User / Admin Location Hub (Emerald Green / Defense Color) */}
        {userLocation && (
          <>
            <CircleMarker 
              center={userLocation} 
              radius={15} 
              pathOptions={{ color: '#10B981', fillColor: '#10B981', fillOpacity: 0.2, weight: 1 }}
            >
              <Popup><b style={{color: '#059669'}}>ADMIN SOC HUB</b></Popup>
            </CircleMarker>
            <CircleMarker 
              center={userLocation} 
              radius={8} 
              pathOptions={{ color: '#059669', fillColor: '#10B981', fillOpacity: 1, weight: 3, color: 'white' }}
            />
          </>
        )}

        {/* State Mode: Show Major Cities (Standard Markers) */}
        {TN_CITIES.map((city) => (
          <Marker 
            key={city.id} 
            position={[city.lat, city.lng]}
            eventHandlers={{
              click: () => onCityClick && onCityClick(city),
            }}
          >
            <Popup>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px' }}>
                <b style={{ color: '#0F172A' }}>{city.name}</b><br />
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button 
                    onClick={() => onCityClick && onCityClick(city)}
                    style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: '10px', cursor: 'pointer' }}
                  >
                    Select as Attack Origin
                  </button>
                  <button 
                    onClick={() => onHubRelocate && onHubRelocate([city.lat, city.lng])}
                    style={{ background: '#10B981', color: 'white', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: '10px', cursor: 'pointer' }}
                  >
                    Set as Admin SOC Hub
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Simulation Path (Aggressive Red Pulse) */}
        {simulationPath && userLocation && (
          <Polyline 
            positions={[simulationPath, userLocation]} 
            pathOptions={{ 
              color: '#EF4444', 
              weight: 3, 
              dashArray: '12, 12', 
              className: 'animated-polyline',
              opacity: 0.85
            }} 
          />
        )}
      </MapContainer>
    </div>
  );
};

export default TamilNaduMap;
