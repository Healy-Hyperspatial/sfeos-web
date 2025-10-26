// src/SFEOSMap.js

import React, { useState } from 'react';
import { Map as MapLibreMap } from 'react-map-gl/maplibre';
import { Container, Row, Col } from 'react-bootstrap';
import LogoOverlay from './components/LogoOverlay';
import MapStyleSelector from './components/MapStyleSelector';
import './SFEOSMap.css';

function SFEOSMap() {
  const [mapStyle, setMapStyle] = useState(
    `https://api.maptiler.com/maps/streets/style.json?key=${process.env.REACT_APP_MAPTILER_KEY}`
  );

  const handleStyleChange = (newStyle) => {
    setMapStyle(newStyle);
  };

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
        
        // Set the map style from state
        mapStyle={mapStyle}
      />
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