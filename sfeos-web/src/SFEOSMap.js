// src/SFEOSMap.js

import React from 'react';
import { Map as MapLibreMap } from 'react-map-gl/maplibre';

function SFEOSMap() {
  return (
    <MapLibreMap
      // Set the initial map state
      initialViewState={{
        longitude: 28.9784,
        latitude: 41.0151,
        zoom: 12
      }}
      
      // This is the full-screen styling
      style={{ width: '100vw', height: '100vh' }}
      
      // Add a basemap style
      // You NEED a style URL for the map to show anything
      mapStyle={`https://api.maptiler.com/maps/streets/style.json?key=${process.env.REACT_APP_MAPTILER_KEY}`}
    />
  );
}

export default SFEOSMap;