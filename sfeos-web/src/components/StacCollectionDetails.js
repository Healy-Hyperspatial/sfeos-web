import React, { useState } from 'react';
import './StacCollectionDetails.css';

function StacCollectionDetails({ collection, onZoomToBbox }) {
  const [expandDetails, setExpandDetails] = useState(false);
  const [expandSpatial, setExpandSpatial] = useState(false);

  if (!collection) return null;

  const bbox = collection.extent?.spatial?.bbox?.[0];
  const hasValidBbox = bbox && bbox.length === 4;

  const handleZoomToBbox = () => {
    if (hasValidBbox && onZoomToBbox) {
      onZoomToBbox(bbox);
    }
  };

  return (
    <>
      <button 
        className="stac-expand-btn"
        onClick={() => setExpandDetails(!expandDetails)}
        title={expandDetails ? "Hide details" : "Show details"}
      >
        <span className="expand-arrow">{expandDetails ? '◀' : '▶'}</span>
        <span className="expand-label">Description</span>
      </button>
      {expandDetails && (
        <div className="stac-details-expanded">
          <h4>{collection.title || collection.id}</h4>
          <p>{collection.description}</p>
        </div>
      )}

      <button 
        className="stac-expand-btn"
        onClick={() => setExpandSpatial(!expandSpatial)}
        title={expandSpatial ? "Hide spatial extent" : "Show spatial extent"}
      >
        <span className="expand-arrow">{expandSpatial ? '◀' : '▶'}</span>
        <span className="expand-label">Spatial Extent</span>
      </button>
      {expandSpatial && hasValidBbox && (
        <div className="stac-details-expanded">
          <h4>Bounding Box</h4>
          <p>
            <strong>West:</strong> {bbox[0].toFixed(4)}°<br />
            <strong>South:</strong> {bbox[1].toFixed(4)}°<br />
            <strong>East:</strong> {bbox[2].toFixed(4)}°<br />
            <strong>North:</strong> {bbox[3].toFixed(4)}°
          </p>
          <button 
            className="stac-zoom-btn"
            onClick={handleZoomToBbox}
          >
            Zoom to Area
          </button>
        </div>
      )}
    </>
  );
}

export default StacCollectionDetails;
