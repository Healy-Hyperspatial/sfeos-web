import React, { useState, useEffect } from 'react';
import './StacCollectionDetails.css';
import './QueryItems.css';

function StacCollectionDetails({ collection, onZoomToBbox, onShowItemsOnMap }) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isBoundingBoxVisible, setIsBoundingBoxVisible] = useState(false);
  const [isQueryItemsVisible, setIsQueryItemsVisible] = useState(false);
  const [queryItems, setQueryItems] = useState([]);

  // Fetch query items when the component mounts or collection changes
  useEffect(() => {
    if (collection && collection.id) {
      console.log(`Fetching items for collection: ${collection.id}`);
      // Fetch items from the collection using STAC API
      const fetchItems = async () => {
        try {
          const baseUrl = process.env.REACT_APP_STAC_API_BASE_URL || 'http://localhost:8080';
          const url = `${baseUrl}/collections/${collection.id}/items?limit=10`;
          console.log(`Fetching items from: ${url}`);
          
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            console.log('Received items data:', data);
            
            if (data.features && data.features.length > 0) {
              const items = data.features.slice(0, 10).map(item => {
                const itemData = {
                  id: item.id,
                  title: item.properties?.title || item.id,
                  geometry: item.geometry || null,
                  bbox: item.bbox || null
                };
                console.log(`Item ${itemData.id} geometry:`, itemData.geometry);
                return itemData;
              });
              
              console.log('Setting query items:', items);
              setQueryItems(items);
            } else {
              console.log('No features found in the response');
              setQueryItems([]);
            }
          } else {
            const errorText = await response.text();
            console.error(`Failed to fetch items (${response.status}):`, errorText);
            setQueryItems([]);
          }
        } catch (error) {
          console.error('Error fetching items:', error);
          setQueryItems([]);
        }
      };
      fetchItems();
    } else {
      console.log('No collection ID available to fetch items');
    }
  }, [collection]);

  if (!collection) return null;

  const bbox = collection.extent?.spatial?.bbox?.[0];
  const hasValidBbox = bbox && bbox.length === 4;

  const handleZoomToBbox = () => {
    if (hasValidBbox && onZoomToBbox) {
      onZoomToBbox(bbox);
    }
  };

  const handleDescriptionClick = () => {
    setIsDescriptionExpanded(!isDescriptionExpanded);
    if (isBoundingBoxVisible) {
      setIsBoundingBoxVisible(false);
    }
    if (isQueryItemsVisible) {
      setIsQueryItemsVisible(false);
    }
  };

  const handleBoundingBoxClick = () => {
    setIsBoundingBoxVisible(!isBoundingBoxVisible);
    if (isDescriptionExpanded) {
      setIsDescriptionExpanded(false);
    }
    if (isQueryItemsVisible) {
      setIsQueryItemsVisible(false);
    }
  };

  const handleQueryItemsClick = () => {
    const newIsExpanded = !isQueryItemsVisible;
    console.log('handleQueryItemsClick called, newIsExpanded:', newIsExpanded);
    
    // Update the expanded state
    setIsQueryItemsVisible(newIsExpanded);
    
    // Collapse other sections
    if (isDescriptionExpanded) setIsDescriptionExpanded(false);
    if (isBoundingBoxVisible) setIsBoundingBoxVisible(false);
    
    // Only proceed if we're expanding and have items
    if (newIsExpanded && queryItems.length > 0) {
      console.log('Query items expanded, items:', queryItems);
      
      // If we have items with bbox, zoom to the first one
      const firstItem = queryItems[0];
      if (firstItem?.bbox) {
        const bbox = firstItem.bbox;
        console.log('Zooming to first item bbox:', bbox);
        
        // Create and dispatch the zoom event
        const zoomEvent = new CustomEvent('zoomToBbox', { 
          detail: { 
            bbox,
            options: {
              padding: 50,
              maxZoom: 14,
              essential: true  // Make this animation essential
            }
          } 
        });
        
        // Log before dispatching
        console.log('Dispatching zoomToBbox event:', zoomEvent);
        window.dispatchEvent(zoomEvent);
      }
      
      // Always call onShowItemsOnMap when there are items
      if (onShowItemsOnMap) {
        console.log('Calling onShowItemsOnMap with items');
        onShowItemsOnMap(queryItems);
      }
    }
  };

  return (
    <>
      <div className="description" onClick={handleDescriptionClick}>
        <button 
          className="stac-expand-btn"
          title={isDescriptionExpanded ? "Hide details" : "Show details"}
        >
          <span className="expand-arrow">{isDescriptionExpanded ? '◀' : '▶'}</span>
          <span className="expand-label">Description</span>
        </button>
        {isDescriptionExpanded && (
          <div className="stac-details-expanded">
            <h4>{collection.title || collection.id}</h4>
            <p>{collection.description}</p>
          </div>
        )}
      </div>

      <div className="bounding-box" onClick={handleBoundingBoxClick}>
        <button 
          className="stac-expand-btn"
          title={isBoundingBoxVisible ? "Hide spatial extent" : "Show spatial extent"}
        >
          <span className="expand-arrow">{isBoundingBoxVisible ? '◀' : '▶'}</span>
          <span className="expand-label">Spatial Extent</span>
        </button>
        {isBoundingBoxVisible && hasValidBbox && (
          <div className="stac-details-expanded">
            <h4>Bounding Box</h4>
            <p>
              <strong>W:</strong> {bbox[0].toFixed(4)}°
              <strong> S:</strong> {bbox[1].toFixed(4)}°
              <strong> E:</strong> {bbox[2].toFixed(4)}°
              <strong> N:</strong> {bbox[3].toFixed(4)}°
            </p>
            <button 
              className="stac-zoom-btn"
              onClick={handleZoomToBbox}
            >
              Zoom to Area
            </button>
          </div>
        )}
      </div>
      
      <div className="query-items" onClick={handleQueryItemsClick}>
        <button 
          className="stac-expand-btn"
          title={isQueryItemsVisible ? "Hide query items" : "Show query items"}
        >
          <span className="expand-arrow">{isQueryItemsVisible ? '◀' : '▶'}</span>
          <span className="expand-label">Query Items</span>
        </button>
        {isQueryItemsVisible && (
          <div className="stac-details-expanded">
            <h4>Query Items</h4>
            {queryItems.length > 0 ? (
              <ul>
                {queryItems.map(item => (
                  <li key={item.id}>
                    {item.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No items found for this collection.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default StacCollectionDetails;
