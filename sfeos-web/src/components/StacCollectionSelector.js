import React from 'react';
import './StacCollectionSelector.css';
import StacCollectionDetails from './StacCollectionDetails';

function StacCollectionSelector({ 
  collections, 
  loading, 
  error, 
  selectedCollection,
  onCollectionChange,
  onZoomToBbox,
  onShowItemsOnMap
}) {
  const handleChange = (e) => {
    const collectionId = e.target.value;
    const collection = collections.find(c => c.id === collectionId);
    if (collection) {
      // Close any open overlays when changing collections
      try {
        window.dispatchEvent(new CustomEvent('hideOverlays'));
        window.dispatchEvent(new CustomEvent('selectedCollectionChanged', { detail: { collectionId: collection.id } }));
      } catch (err) {
        console.warn('Failed to dispatch hideOverlays on collection change:', err);
      }
      onCollectionChange(collection);
    }
  };

  return (
    <div className="stac-collection-selector">
      <div className="stac-header">
        <h3>STAC Collections</h3>
      </div>

      {loading && <div className="stac-status">Loading collections...</div>}
      
      {error && <div className="stac-error">{error}</div>}
      
      {!loading && collections.length > 0 && (
        <div className="stac-selector">
          <select 
            onChange={handleChange}
            defaultValue=""
            className="stac-select"
          >
            <option value="">Select a collection...</option>
            {collections.map(collection => (
              <option key={collection.id} value={collection.id}>
                {collection.id}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedCollection && (
        <StacCollectionDetails 
          collection={selectedCollection}
          onZoomToBbox={onZoomToBbox}
          onShowItemsOnMap={onShowItemsOnMap}
        />
      )}
    </div>
  );
}

export default StacCollectionSelector;
