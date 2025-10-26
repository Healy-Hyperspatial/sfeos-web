import React, { useState } from 'react';
import './StacCollectionDetails.css';

function StacCollectionDetails({ collection }) {
  const [expandDetails, setExpandDetails] = useState(false);

  if (!collection) return null;

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
    </>
  );
}

export default StacCollectionDetails;
