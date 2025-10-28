// src/SFEOSMap.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Map as MapLibreMap } from 'react-map-gl/maplibre';
import LogoOverlay from './components/LogoOverlay';
import ThumbnailOverlay from './components/ThumbnailOverlay';
import ItemDetailsOverlay from './components/ItemDetailsOverlay';
import MapStyleSelector from './components/MapStyleSelector';
import StacClient from './components/StacClient';
import './SFEOSMap.css';

function SFEOSMap() {
  // State
  const [mapStyle, setMapStyle] = useState(
    `https://api.maptiler.com/maps/streets/style.json?key=${process.env.REACT_APP_MAPTILER_KEY}`
  );
  const [viewState, setViewState] = useState({
    longitude: 28.9784,
    latitude: 41.0151,
    zoom: 12
  });
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [thumbnail, setThumbnail] = useState({ url: null, title: '', type: null });
  const [itemDetails, setItemDetails] = useState(null);
  
  // Refs
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const bboxLayers = useRef(new Set()); // Track bounding box layer IDs
  
  // Event Handlers
  const handleMapLoad = useCallback((e) => {
    console.log('Map loaded, map instance:', e.target);
    const map = e.target;
    
    // Initialize the map with a default view if needed
    if (!map.getCenter()) {
      map.jumpTo({
        center: [0, 20],
        zoom: 2
      });
    }
    
    console.log('Map center:', map.getCenter(), 'Zoom:', map.getZoom());
    setIsMapLoaded(true);
  }, []);
  
  const handleStyleChange = useCallback((newStyle) => {
    setMapStyle(newStyle);
  }, []);

  const handleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    const elem = containerRef.current;
    const isCurrentlyFullscreen = document.fullscreenElement === elem;

    if (isCurrentlyFullscreen) {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    } else {
      // Enter fullscreen
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
      setIsFullscreen(true);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  
  // Function to add a geometry to the map
  const addGeometry = useCallback((map, id, geometry, color = '#FF0000', width = 2) => {
    if (!map || !geometry) {
      console.warn('Invalid geometry in addGeometry:', geometry);
      return;
    }
    
    console.log(`Adding geometry ${id}:`, geometry);
    
    // Create a GeoJSON feature for the geometry
    const geometryFeature = {
      type: 'Feature',
      geometry: geometry,
      properties: { id }
    };
    
    // Add the source if it doesn't exist
    if (!map.getSource(`geometry-${id}`)) {
      map.addSource(`geometry-${id}`, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [geometryFeature]
        }
      });
      
      // Add the layer
      map.addLayer({
        id: `geometry-${id}`,
        type: 'line',
        source: `geometry-${id}`,
        layout: {},
        paint: {
          'line-color': color,
          'line-width': width,
          'line-opacity': 0.8
        }
      });
      
      // Add fill layer for better visibility
      map.addLayer({
        id: `geometry-fill-${id}`,
        type: 'fill',
        source: `geometry-${id}`,
        layout: {},
        paint: {
          'fill-color': color,
          'fill-opacity': 0.1
        }
      });
      
      // Track the layer IDs
      bboxLayers.current.add(`geometry-${id}`);
      bboxLayers.current.add(`geometry-fill-${id}`);
    } else {
      // Update existing source
      map.getSource(`geometry-${id}`).setData({
        type: 'FeatureCollection',
        features: [geometryFeature]
      });
    }
  }, []);
  
  // Function to clear all geometries
  const clearGeometries = useCallback((map) => {
    if (!map) return;
    
    // Remove all layers and sources that start with 'geometry-'
    bboxLayers.current.forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      const sourceId = layerId.replace('-fill', '').replace('-line', '');
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    });
    
    bboxLayers.current.clear();
  }, []);

  const handleShowItemsOnMap = useCallback(async (event) => {
    console.log('=== START handleShowItemsOnMap ===');
    console.log('Event received:', event);
    
    // Get the map instance directly from the ref
    const getMapInstance = () => {
      if (!mapRef.current) return null;
      try {
        const map = mapRef.current.getMap();
        return map.loaded() ? map : null;
      } catch (error) {
        console.error('Error getting map instance:', error);
        return null;
      }
    };
    
    // Get the map instance
    const map = getMapInstance();
    if (!map) {
      console.error('Map not available');
      return;
    }
    
    const { items = [] } = event.detail || {};
    if (!Array.isArray(items) || items.length === 0) {
      console.error('❌ No valid items array provided or empty items array');
      return;
    }
    
    try {
      // Clear any existing geometries
      console.log('🧹 Clearing existing geometries');
      clearGeometries(map);
      
      // Process items and add their geometries
      const validGeometries = items
        .filter(item => item?.geometry)
        .map(item => ({
          geometry: item.geometry,
          id: item.id || `item-${Math.random().toString(36).substr(2, 9)}`
        }));
        
      if (validGeometries.length === 0) {
        console.error('❌ No valid geometries found in items');
        return;
      }
      
      // Calculate combined bounds from all geometries
      let combinedBbox = [Infinity, Infinity, -Infinity, -Infinity];
      
      validGeometries.forEach(({ geometry }) => {
        if (geometry.type === 'Polygon' && geometry.coordinates) {
          geometry.coordinates[0].forEach(([lon, lat]) => {
            combinedBbox[0] = Math.min(combinedBbox[0], lon);
            combinedBbox[1] = Math.min(combinedBbox[1], lat);
            combinedBbox[2] = Math.max(combinedBbox[2], lon);
            combinedBbox[3] = Math.max(combinedBbox[3], lat);
          });
        } else if (geometry.type === 'Point' && geometry.coordinates) {
          const [lon, lat] = geometry.coordinates;
          combinedBbox[0] = Math.min(combinedBbox[0], lon);
          combinedBbox[1] = Math.min(combinedBbox[1], lat);
          combinedBbox[2] = Math.max(combinedBbox[2], lon);
          combinedBbox[3] = Math.max(combinedBbox[3], lat);
        }
      });
      
      console.log('Combined bbox:', combinedBbox);
      
      // Zoom to the combined bounds
      const [minLon, minLat, maxLon, maxLat] = combinedBbox;
      
      // Ensure valid coordinates
      if (![minLon, minLat, maxLon, maxLat].every(coord => 
        typeof coord === 'number' && !isNaN(coord)
      )) {
        throw new Error('Invalid coordinates in bbox');
      }
      
      const centerLon = (minLon + maxLon) / 2;
      const centerLat = (minLat + maxLat) / 2;
      
      // Calculate zoom level based on bbox size
      const lonDiff = maxLon - minLon;
      const latDiff = maxLat - minLat;
      const maxDiff = Math.max(lonDiff, latDiff, 0.001); // Ensure we don't get Infinity
      const zoom = Math.max(0, Math.min(12, 12 - Math.log2(maxDiff / 0.1)));
      
      console.log('Setting map view:', { centerLon, centerLat, zoom });
      
      // Update view state
      setViewState({
        longitude: centerLon,
        latitude: centerLat,
        zoom: zoom
      });
      
      // Use flyTo for smooth animation
      map.flyTo({
        center: [centerLon, centerLat],
        zoom: zoom,
        duration: 1000,
        essential: true
      });
      
      // Add geometry for each valid item
      validGeometries.forEach(({ geometry, id }, index) => {
        const hue = (index * 137.5) % 360; // Golden angle for distinct colors
        const color = `hsl(${hue}, 80%, 50%)`;
        console.log(`🎨 Adding geometry for item ${index} (${id}):`, geometry);
        addGeometry(map, id, geometry, color, 2);
      });
      
      console.log('=== END handleShowItemsOnMap ===');
    } catch (error) {
      console.error('Error in handleShowItemsOnMap:', error);
    }
  }, [addGeometry, clearGeometries, setViewState]);

  // Function to handle zooming to a bounding box
  const handleZoomToBbox = useCallback(async (event) => {
    console.log('handleZoomToBbox called with event:', event);
    const { bbox, options = {} } = event.detail || {};
    
    if (!bbox || !Array.isArray(bbox) || bbox.length !== 4) {
      console.error('Invalid bbox format:', bbox);
      return;
    }
    
    console.log('Processing bbox:', bbox);
    
    // Get the map instance with retry logic
    const getMapInstance = (attempt = 0) => {
      try {
        if (!mapRef.current) {
          console.log('mapRef.current is null');
          return null;
        }
        
        const map = mapRef.current.getMap();
        if (!map || typeof map.fitBounds !== 'function') {
          console.log('Map not properly initialized yet');
          return null;
        }
        
        console.log('Successfully got map instance');
        return map;
      } catch (error) {
        console.error('Error getting map instance:', error);
        return null;
      }
    };
    
    // Wait for map to be ready with retry logic
    let map = null;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (!map && attempts < maxAttempts) {
      map = getMapInstance();
      if (!map) {
        console.log(`Map not ready, attempt ${attempts + 1}/${maxAttempts}...`);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      attempts++;
    }
    
    if (!map) {
      console.error('Failed to get map instance after multiple attempts');
      return;
    }
    
    try {
      // Ensure coordinates are valid numbers
      const [minLon, minLat, maxLon, maxLat] = bbox.map(Number);
      
      if ([minLon, minLat, maxLon, maxLat].some(isNaN)) {
        throw new Error('Invalid bbox coordinates - non-numeric values detected');
      }
      
      console.log('Zooming to bbox:', { minLon, minLat, maxLon, maxLat });
      
      // Create bounds in the format expected by fitBounds
      const bounds = [
        [minLon, minLat],
        [maxLon, maxLat]
      ];
      
      // Add padding with safe defaults
      const padding = Math.min(Math.max(Number(options.padding) || 50, 20), 200);
      const maxZoom = Math.min(Math.max(Number(options.maxZoom) || 14, 1), 20);
      
      console.log('Using fitBounds with bounds:', bounds, 'padding:', padding, 'maxZoom:', maxZoom);
      
      // First ensure we have a valid map view
      if (!map.getCenter() || !map.getZoom()) {
        console.log('Initializing map view...');
        map.jumpTo({
          center: [(minLon + maxLon) / 2, (minLat + maxLat) / 2],
          zoom: Math.min(10, maxZoom)
        });
      }
      
      // Use requestAnimationFrame to ensure map is ready
      requestAnimationFrame(() => {
        try {
          // Fit bounds with padding and max zoom
          map.fitBounds(bounds, {
            padding: padding,
            maxZoom: maxZoom,
            duration: 1000
          });
          
          // Update view state
          const center = map.getCenter();
          setViewState({
            longitude: center.lng,
            latitude: center.lat,
            zoom: map.getZoom()
          });
          
          console.log('Map view updated successfully');
          
        } catch (fitError) {
          console.error('Error in fitBounds:', fitError);
          
          // Fallback to center/zoom
          try {
            map.jumpTo({
              center: [(minLon + maxLon) / 2, (minLat + maxLat) / 2],
              zoom: Math.min(10, maxZoom)
            });
          } catch (jumpError) {
            console.error('Fallback jumpTo also failed:', jumpError);
          }
        }
      });
      
    } catch (error) {
      console.error('Error in handleZoomToBbox:', error);
    }
  }, []);

  // The zoom to bbox functionality is handled by the handleZoomToBbox function

  // Set up event listeners for map interactions
  useEffect(() => {
    if (!isMapLoaded) {
      console.log('Waiting for map to load before setting up event listeners');
      return;
    }
    
    console.log('✅ Map is loaded, setting up event listeners');
    
    // Get the map instance
    const getMap = () => {
      try {
        return mapRef.current?.getMap();
      } catch (error) {
        console.error('Error getting map instance:', error);
        return null;
      }
    };
    
    const map = getMap();
    if (!map) {
      console.error('Failed to get map instance');
      return;
    }
    
    // Store the event handler functions so we can remove them later
    const zoomToBboxHandler = (event) => {
      console.log('zoomToBbox event received:', event);
      handleZoomToBbox(event).catch(error => {
        console.error('Error handling zoomToBbox:', error);
      });
    };
    
    const showItemsOnMapHandler = async (event) => {
      try {
        await handleShowItemsOnMap(event);
      } catch (error) {
        console.error('Error in showItemsOnMapHandler:', error);
      }
    };

    const showItemThumbnailHandler = (event) => {
      try {
        const { url, title, type } = event.detail || {};
        if (url) {
          setThumbnail({ url, title: title || '', type: type || null });
        } else {
          console.warn('showItemThumbnail event missing url');
        }
      } catch (e) {
        console.error('Error handling showItemThumbnail:', e);
      }
    };

    const showItemDetailsHandler = (event) => {
      try {
        const d = event.detail || null;
        if (d) {
          setItemDetails(d);
        } else {
          console.warn('showItemDetails event missing detail');
        }
      } catch (e) {
        console.error('Error handling showItemDetails:', e);
      }
    };
    
    // Add event listeners
    window.addEventListener('zoomToBbox', zoomToBboxHandler);
    window.addEventListener('showItemsOnMap', showItemsOnMapHandler);
    window.addEventListener('showItemThumbnail', showItemThumbnailHandler);
    window.addEventListener('showItemDetails', showItemDetailsHandler);
    
    // Log the current map state
    if (map) {
      console.log('Current map state:', {
        center: map.getCenter(),
        zoom: map.getZoom(),
        loaded: map.loaded()
      });
    }
    
    // Clean up event listeners
    return () => {
      console.log('Cleaning up map event listeners');
      window.removeEventListener('zoomToBbox', zoomToBboxHandler);
      window.removeEventListener('showItemsOnMap', showItemsOnMapHandler);
      window.removeEventListener('showItemThumbnail', showItemThumbnailHandler);
      window.removeEventListener('showItemDetails', showItemDetailsHandler);
    };
  }, [isMapLoaded, handleZoomToBbox, handleShowItemsOnMap]);

  // handleShowItemsOnMap has been moved up in the file

  return (
    <div className="map-container" ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <MapLibreMap
        ref={mapRef}
        // Set the initial map state
        initialViewState={{
          longitude: 0,
          latitude: 20,
          zoom: 2,
          maxZoom: 20,
          minZoom: 1
        }}
        projection="mercator"
        renderWorldCopies={true}
        
        // Use viewState for controlled component
        longitude={viewState.longitude}
        latitude={viewState.latitude}
        zoom={viewState.zoom}
        onMove={(evt) => setViewState(evt.viewState)}
        
        // Handle map load
        onLoad={handleMapLoad}
        
        // This is the full-screen styling
        style={{ width: '100%', height: '100%' }}
        
        // Set the map style from state
        mapStyle={mapStyle}
        
        // Basic interaction settings
        interactive={true}
        touchZoomRotate={true}
        dragRotate={true}
        dragPan={true}
        doubleClickZoom={true}
        scrollZoom={true}
        boxZoom={true}
        keyboard={true}
        
        // Performance optimizations
        reuseMaps={false}
        transformRequest={(url) => {
          return { url };
        }}
      />
      <StacClient />
      <div className="map-controls">
        <div className="control-section">
          <div className="control-label">View</div>
          <button 
            className="fullscreen-btn"
            onClick={handleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            ⛶
          </button>
        </div>
        <div className="control-section">
          <div className="control-label">Map Style</div>
          <MapStyleSelector 
            value={mapStyle} 
            onChange={handleStyleChange} 
          />
        </div>
      </div>
      <LogoOverlay />
      {thumbnail.url && (
        <ThumbnailOverlay 
          url={thumbnail.url} 
          title={thumbnail.title}
          type={thumbnail.type}
          onClose={() => setThumbnail({ url: null, title: '', type: null })}
        />
      )}
      {itemDetails && (
        <ItemDetailsOverlay 
          details={itemDetails}
          onClose={() => setItemDetails(null)}
        />
      )}
    </div>
  );
}

export default SFEOSMap;