// src/SFEOSMap.js

import React from 'react';
import { Map as MapLibreMap } from 'react-map-gl/maplibre';
import LogoOverlay from './components/LogoOverlay';
import './SFEOSMap.css';

function SFEOSMap() {
  return (
    <div className="map-container">
      <MapLibreMap
        // Set the initial map state
        initialViewState={{
          longitude: 28.9784,
          latitude: 41.0151,
          zoom: 12
        }}
        
        // This is the full-screen styling
        style={{ width: '100%', height: '100%' }}
        
        // Add a basemap style
        mapStyle={`https://api.maptiler.com/maps/streets/style.json?key=${process.env.REACT_APP_MAPTILER_KEY}`}
      />
      <LogoOverlay />
    </div>
  );
}

export default SFEOSMap;