// src/SFEOSMap.js

import React, { useState, useEffect, useRef } from 'react';
import { Map as MapLibreMap } from 'react-map-gl/maplibre';
import { Container, Row, Col } from 'react-bootstrap';
import LogoOverlay from './components/LogoOverlay';
import MapStyleSelector from './components/MapStyleSelector';
import StacClient from './components/StacClient';
import './SFEOSMap.css';

function SFEOSMap() {
  const [mapStyle, setMapStyle] = useState(
    `https://api.maptiler.com/maps/streets/style.json?key=${process.env.REACT_APP_MAPTILER_KEY}`
  );
  const [viewState, setViewState] = useState({
    longitude: 28.9784,
    latitude: 41.0151,
    zoom: 12
  });
  const mapRef = useRef(null);

  const handleStyleChange = (newStyle) => {
    setMapStyle(newStyle);
  };

  useEffect(() => {
    const handleZoomToBbox = (event) => {
      const { bbox } = event.detail;
      // bbox format: [minLon, minLat, maxLon, maxLat]
      const [minLon, minLat, maxLon, maxLat] = bbox;
      
      // Calculate center and zoom level
      const centerLon = (minLon + maxLon) / 2;
      const centerLat = (minLat + maxLat) / 2;
      
      // Simple zoom calculation based on bbox size
      const lonDiff = maxLon - minLon;
      const latDiff = maxLat - minLat;
      const maxDiff = Math.max(lonDiff, latDiff);
      const zoom = Math.max(0, Math.min(28, 12 - Math.log2(maxDiff / 0.5)));
      
      setViewState({
        longitude: centerLon,
        latitude: centerLat,
        zoom: zoom
      });
    };

    window.addEventListener('zoomToBbox', handleZoomToBbox);
    return () => window.removeEventListener('zoomToBbox', handleZoomToBbox);
  }, []);

  return (
    <div className="map-container">
      <MapLibreMap
        ref={mapRef}
        // Set the initial map state
        initialViewState={{
          longitude: 28.9784,
          latitude: 41.0151,
          zoom: 12
        }}
        
        // Update map view when viewState changes
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        
        // This is the full-screen styling
        style={{ width: '100%', height: '100%' }}
        
        // Set the map style from state
        mapStyle={mapStyle}
      />
      <StacClient />
      <div className="map-controls">
        <Container fluid>
          <Row className="justify-content-end">
            <Col xs="auto">
              <MapStyleSelector 
                value={mapStyle} 
                onChange={handleStyleChange} 
              />
            </Col>
          </Row>
        </Container>
      </div>
      <LogoOverlay />
    </div>
  );
}

export default SFEOSMap;