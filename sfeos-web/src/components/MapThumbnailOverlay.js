import React, { useEffect, useState, useCallback } from 'react';
import './MapThumbnailOverlay.css';

function MapThumbnailOverlay({ mapRef, itemGeometry, thumbnailUrl, title, type }) {
  const [mapContainer, setMapContainer] = useState(null);
  const [pixelPos, setPixelPos] = useState(null);

  useEffect(() => {
    if (!mapRef?.current) return;
    
    try {
      const mapElement = mapRef.current.getContainer?.();
      setMapContainer(mapElement);
    } catch (e) {
      console.warn('Error getting map container:', e);
    }
  }, [mapRef]);

  // Calculate bounds from geometry
  const getBoundsFromGeometry = (geometry) => {
    if (!geometry) return null;

    let bounds = {
      minLon: Infinity,
      minLat: Infinity,
      maxLon: -Infinity,
      maxLat: -Infinity
    };

    const processCoordinates = (coords) => {
      if (Array.isArray(coords[0])) {
        coords.forEach(c => processCoordinates(c));
      } else {
        const [lon, lat] = coords;
        bounds.minLon = Math.min(bounds.minLon, lon);
        bounds.minLat = Math.min(bounds.minLat, lat);
        bounds.maxLon = Math.max(bounds.maxLon, lon);
        bounds.maxLat = Math.max(bounds.maxLat, lat);
      }
    };

    if (geometry.type === 'Polygon' && geometry.coordinates) {
      processCoordinates(geometry.coordinates[0]);
    } else if (geometry.type === 'Point' && geometry.coordinates) {
      const [lon, lat] = geometry.coordinates;
      bounds.minLon = bounds.maxLon = lon;
      bounds.minLat = bounds.maxLat = lat;
    } else if (geometry.type === 'MultiPolygon' && geometry.coordinates) {
      geometry.coordinates.forEach(polygon => {
        processCoordinates(polygon[0]);
      });
    }

    return bounds;
  };

  // Get map instance and convert geographic coordinates to pixel coordinates
  const calculatePixelPosition = useCallback(() => {
    try {
      const map = mapRef.current?.getMap?.();
      if (!map || !itemGeometry) return null;

      const bounds = getBoundsFromGeometry(itemGeometry);
      if (!bounds) return null;

      // Calculate center of geometry
      const centerLon = (bounds.minLon + bounds.maxLon) / 2;
      const centerLat = (bounds.minLat + bounds.maxLat) / 2;

      // Convert to pixel coordinates
      const point = map.project([centerLon, centerLat]);
      
      // Calculate size based on geometry extent
      const topLeftPoint = map.project([bounds.minLon, bounds.maxLat]);
      const bottomRightPoint = map.project([bounds.maxLon, bounds.minLat]);

      const width = Math.abs(bottomRightPoint.x - topLeftPoint.x);
      const height = Math.abs(bottomRightPoint.y - topLeftPoint.y);

      return {
        x: point.x,
        y: point.y,
        width: Math.max(width, 1), // minimum 1px to avoid rendering issues
        height: Math.max(height, 1) // minimum 1px to avoid rendering issues
      };
    } catch (e) {
      console.warn('Error calculating pixel position:', e);
      return null;
    }
  }, [mapRef, itemGeometry]);

  // Recalculate position when map moves or geometry changes
  useEffect(() => {
    if (!mapRef?.current || !itemGeometry) return;

    const map = mapRef.current.getMap?.();
    if (!map) return;

    const updatePosition = () => {
      const newPos = calculatePixelPosition();
      setPixelPos(newPos);
    };

    updatePosition();
    
    // Recalculate on map move/zoom
    map.on('move', updatePosition);
    map.on('zoom', updatePosition);

    return () => {
      map.off('move', updatePosition);
      map.off('zoom', updatePosition);
    };
  }, [mapRef, itemGeometry, calculatePixelPosition]);

  if (!thumbnailUrl || !itemGeometry || !mapContainer) {
    return null;
  }

  if (!pixelPos) return null;

  const lowerType = (type || '').toLowerCase();
  const isWebImage = lowerType.startsWith('image/jpeg') || lowerType.startsWith('image/png') || /\.(jpg|jpeg|png)(\?|$)/i.test(thumbnailUrl);

  return (
    <div
      className="map-thumbnail-overlay"
      style={{
        left: `${pixelPos.x}px`,
        top: `${pixelPos.y}px`,
        width: `${pixelPos.width}px`,
        height: `${pixelPos.height}px`
      }}
    >
      {isWebImage ? (
        <img
          src={thumbnailUrl}
          alt={title || 'Item thumbnail'}
          className="map-thumbnail-image"
        />
      ) : (
        <div className="map-thumbnail-unsupported">
          <span>Image format not supported</span>
        </div>
      )}
    </div>
  );
}

export default MapThumbnailOverlay;
