import React, { useState, useEffect } from 'react';
import StacCollectionSelector from './StacCollectionSelector';
import StacCollectionDetails from './StacCollectionDetails';

const STAC_API_URL = process.env.REACT_APP_STAC_API_URL || 'http://localhost:8000';

function StacClient() {
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

  return (
    <StacCollectionSelector 
      collections={collections}
      loading={loading}
      error={error}
      selectedCollection={selectedCollection}
      onCollectionChange={handleCollectionChange}
    />
  );
}

export default StacClient;
