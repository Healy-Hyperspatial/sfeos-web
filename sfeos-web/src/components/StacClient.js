import React, { useState, useEffect } from 'react';
import StacCollectionSelector from './StacCollectionSelector';

const getDefaultStacApiUrl = () =>
  process.env.REACT_APP_STAC_API_URL || 'http://localhost:8000';

function StacClient({ stacApiUrl, onShowItemsOnMap: propOnShowItemsOnMap }) {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState(null);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        setError(null);

        const baseUrl = stacApiUrl || getDefaultStacApiUrl();
        const response = await fetch(`${baseUrl}/collections`);
        if (!response.ok) {
          throw new Error(`Failed to fetch collections: ${response.status}`);
        }

        const data = await response.json();
        const collectionsList = Array.isArray(data.collections) ? data.collections : [];
        setCollections(collectionsList);
        console.log('Fetched collections:', collectionsList);
        
        if (collectionsList.length === 0) {
          setError('No collections found');
        }
      } catch (err) {
        console.error('Error fetching STAC collections:', err);
        setError(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, [stacApiUrl]);

  const handleCollectionChange = (collection) => {
    setSelectedCollection(collection);
  };

  const handleZoomToBbox = (bbox) => {
    // bbox format: [minLon, minLat, maxLon, maxLat]
    // Dispatch event or callback to parent component to handle map zoom
    window.dispatchEvent(new CustomEvent('zoomToBbox', { detail: { bbox } }));
  };

  const handleShowItemsOnMap = (items) => {
    if (!items || !items.length) {
      console.warn('No items provided to show on map');
      return;
    }
    
    console.log('Dispatching showItemsOnMap event with items:', items);
    
    // Dispatch event to show items on map
    window.dispatchEvent(new CustomEvent('showItemsOnMap', { 
      detail: { 
        items
      } 
    }));
    
    // If a prop callback is provided, use that as well (for testing or alternative implementations)
    if (propOnShowItemsOnMap) {
      propOnShowItemsOnMap(items);
    }
  };

  return (
    <StacCollectionSelector 
      collections={collections}
      loading={loading}
      error={error}
      selectedCollection={selectedCollection}
      onCollectionChange={handleCollectionChange}
      onZoomToBbox={handleZoomToBbox}
      onShowItemsOnMap={handleShowItemsOnMap}
      stacApiUrl={stacApiUrl}
    />
  );
}

export default StacClient;
