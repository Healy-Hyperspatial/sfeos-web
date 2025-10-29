import React, { useEffect, useState } from 'react';
import './MapThumbnailOverlay.css';

function MapThumbnailOverlay({ mapRef, itemGeometry, thumbnailUrl, title, type }) {
  const [mapContainer, setMapContainer] = useState(null);

  useEffect(() => {
    if (!mapRef?.current) return;
    
    try {
      const mapElement = mapRef.current.getContainer?.();
      setMapContainer(mapElement);
    } catch (e) {
      console.warn('Error getting map container:', e);
    }
  }, [mapRef]);

  if (!thumbnailUrl || !itemGeometry || !mapContainer) {
    return null;
  }

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

  const bounds = getBoundsFromGeometry(itemGeometry);
  if (!bounds) return null;

  // Get map instance and convert geographic coordinates to pixel coordinates
  const getPixelPosition = () => {
    try {
      const map = mapRef.current?.getMap?.();
      if (!map) return null;

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
        width: Math.max(width, 100), // minimum width
        height: Math.max(height, 100) // minimum height
      };
    } catch (e) {
      console.warn('Error calculating pixel position:', e);
      return null;
    }
  };

  const pixelPos = getPixelPosition();
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
