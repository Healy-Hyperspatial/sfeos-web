import React, { useState, useEffect } from 'react';
import './StacClient.css';

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

  const handleCollectionChange = (e) => {
    const collectionId = e.target.value;
    const collection = collections.find(c => c.id === collectionId);
    setSelectedCollection(collection);
  };

  return (
    <div className="stac-client">
      <div className="stac-header">
        <h3>STAC Collections</h3>
      </div>

      {loading && <div className="stac-status">Loading collections...</div>}
      
      {error && <div className="stac-error">{error}</div>}
      
      {!loading && collections.length > 0 && (
        <div className="stac-selector">
          <select 
            onChange={handleCollectionChange}
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
        <div className="stac-details">
          <h4>{selectedCollection.title || selectedCollection.id}</h4>
          <p>{selectedCollection.description}</p>
        </div>
      )}
    </div>
  );
}

export default StacClient;
