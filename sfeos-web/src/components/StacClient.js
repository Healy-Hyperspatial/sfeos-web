import React, { useState, useEffect } from 'react';
import StacCollectionSelector from './StacCollectionSelector';

const STAC_API_URL = process.env.REACT_APP_STAC_API_URL || 'http://localhost:8000';

function StacClient({ onShowItemsOnMap: propOnShowItemsOnMap }) {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState(null);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${STAC_API_URL}/collections`);
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
  }, []);

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
    
    // Calculate combined bounding box that contains all items
    const validBboxes = items
      .filter(item => item && item.bbox && Array.isArray(item.bbox) && item.bbox.length === 4)
      .map(item => item.bbox);
    
    let combinedBbox = null;
    if (validBboxes.length > 0) {
      combinedBbox = [
        Math.min(...validBboxes.map(b => b[0])), // minX
        Math.min(...validBboxes.map(b => b[1])), // minY
        Math.max(...validBboxes.map(b => b[2])), // maxX
        Math.max(...validBboxes.map(b => b[3]))  // maxY
      ];
    }
    
    console.log('Dispatching showItemsOnMap event with items and combined bbox:', { items, combinedBbox });
    
    // Dispatch event to show items on map
    window.dispatchEvent(new CustomEvent('showItemsOnMap', { 
      detail: { 
        items,
        bbox: combinedBbox 
      } 
    }));
    
    // If a prop callback is provided, use that as well (for testing or alternative implementations)
    if (propOnShowItemsOnMap) {
      propOnShowItemsOnMap(items, combinedBbox);
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
    />
  );
}

export default StacClient;
