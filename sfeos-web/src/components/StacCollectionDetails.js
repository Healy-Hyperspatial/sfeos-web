import React, { useState, useEffect, useRef } from 'react';
import './StacCollectionDetails.css';
import './QueryItems.css';

function StacCollectionDetails({ collection, onZoomToBbox, onShowItemsOnMap }) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isBoundingBoxVisible, setIsBoundingBoxVisible] = useState(false);
  const [isQueryItemsVisible, setIsQueryItemsVisible] = useState(false);
  const [queryItems, setQueryItems] = useState([]);
  const [itemLimit, setItemLimit] = useState(10);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [isBboxModeOn, setIsBboxModeOn] = useState(false);
  const [numberReturned, setNumberReturned] = useState(null);
  const [numberMatched, setNumberMatched] = useState(null);
  const prevCollectionId = useRef(null);

  // Detect collection changes and reset state
  useEffect(() => {
    if (collection && collection.id && prevCollectionId.current !== collection.id) {
      console.log(`Collection changed to: ${collection.id}`);
      prevCollectionId.current = collection.id;
      // Reset state when collection changes
      setIsQueryItemsVisible(false);
      setItemLimit(10);
      setQueryItems([]);
      setSelectedItemId(null);
      setIsDescriptionExpanded(false);
      setIsBoundingBoxVisible(false);
    }
  }, [collection?.id]);

  // Fetch query items when the component mounts or collection changes
  useEffect(() => {
    if (collection && collection.id) {
      console.log(`Fetching items for collection: ${collection.id}`);
      // Fetch items from the collection using STAC API
      const fetchItems = async () => {
        try {
          const baseUrl = process.env.REACT_APP_STAC_API_BASE_URL || 'http://localhost:8080';
          const url = `${baseUrl}/collections/${collection.id}/items?limit=${itemLimit}`;
          console.log(`Fetching items from: ${url}`);
          
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            console.log('Received items data:', data);
            
            // Capture search result counts
            setNumberReturned(data.numberReturned || data.features?.length || 0);
            setNumberMatched(data.numberMatched || data.features?.length || 0);
            
            if (data.features && data.features.length > 0) {
              const items = data.features.slice(0, itemLimit).map(item => {
                // Determine thumbnail URL from assets or links
                let thumbnailUrl = null;
                let thumbnailType = null;
                try {
                  const assets = item.assets || {};
                  const assetsArr = Object.values(assets);

                  // 1) Prefer explicit assets.thumbnail if it's JPEG/PNG
                  if (assets.thumbnail && assets.thumbnail.href) {
                    thumbnailUrl = assets.thumbnail.href;
                    thumbnailType = assets.thumbnail.type || null;
                  }

                  // 2) Prefer any asset with role 'thumbnail' that is JPEG/PNG
                  if (!thumbnailUrl) {
                    const thumbAssetWeb = assetsArr.find(a => {
                      const roles = Array.isArray(a.roles) ? a.roles : [];
                      const type = (a.type || '').toLowerCase();
                      return roles.includes('thumbnail') && (type.startsWith('image/jpeg') || type.startsWith('image/png'));
                    });
                    if (thumbAssetWeb) {
                      thumbnailUrl = thumbAssetWeb.href;
                      thumbnailType = thumbAssetWeb.type || null;
                    }
                  }

                  // 3) If only TIFF thumbnail exists, use it as a last resort
                  if (!thumbnailUrl) {
                    const thumbAny = assetsArr.find(a => {
                      const roles = Array.isArray(a.roles) ? a.roles : [];
                      return roles.includes('thumbnail') && a.href;
                    });
                    if (thumbAny) {
                      thumbnailUrl = thumbAny.href;
                      thumbnailType = thumbAny.type || null;
                    }
                  }

                  // 4) Fallback to links with rel=thumbnail or rel=preview
                  if (!thumbnailUrl && Array.isArray(item.links)) {
                    const link = item.links.find(l => l.rel === 'thumbnail' || l.rel === 'preview');
                    if (link && link.href) {
                      thumbnailUrl = link.href;
                      thumbnailType = link.type || null;
                    }
                  }
                } catch (e) {
                  console.warn('Error extracting thumbnail from assets/links for item', item.id, e);
                }

                const itemData = {
                  id: item.id,
                  title: item.properties?.title || item.id,
                  geometry: item.geometry || null,
                  bbox: item.bbox || null,
                  thumbnailUrl,
                  thumbnailType,
                  datetime: item.properties?.datetime || item.properties?.start_datetime || null,
                  assetsCount: Object.keys(item.assets || {}).length
                };
                console.log(`Item ${itemData.id} geometry:`, itemData.geometry, 'thumbnail:', { url: thumbnailUrl, type: thumbnailType });
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
  }, [collection, itemLimit]);

  // Listen for bboxModeChanged event to update button state
  useEffect(() => {
    const handler = (event) => {
      const isOn = event?.detail?.isOn || false;
      setIsBboxModeOn(isOn);
    };
    window.addEventListener('bboxModeChanged', handler);
    return () => window.removeEventListener('bboxModeChanged', handler);
  }, []);

  // Listen for refetchQueryItems event to re-fetch with new limit
  useEffect(() => {
    const handler = async (event) => {
      try {
        const lim = Number(event?.detail?.limit);
        if (!Number.isFinite(lim) || lim <= 0) return;
        if (!collection || !collection.id) return;
        
        console.log('🔎 refetchQueryItems triggered with limit:', lim);
        const baseUrl = process.env.REACT_APP_STAC_API_BASE_URL || 'http://localhost:8080';
        const url = `${baseUrl}/collections/${collection.id}/items?limit=${lim}`;
        console.log('Fetching from:', url);
        
        const response = await fetch(url);
        console.log('Response status:', response.status, 'ok:', response.ok);
        if (response.ok) {
          const data = await response.json();
          console.log('Response data features count:', data.features?.length);
          
          // Capture search result counts
          setNumberReturned(data.numberReturned || data.features?.length || 0);
          setNumberMatched(data.numberMatched || data.features?.length || 0);
          
          if (data.features && data.features.length > 0) {
            console.log('Processing', data.features.length, 'features');
            const items = data.features.map(item => {
              let thumbnailUrl = null;
              let thumbnailType = null;
              try {
                const assets = item.assets || {};
                const assetsArr = Object.values(assets);
                if (assets.thumbnail && assets.thumbnail.href) {
                  thumbnailUrl = assets.thumbnail.href;
                  thumbnailType = assets.thumbnail.type || null;
                }
                if (!thumbnailUrl) {
                  const thumbAssetWeb = assetsArr.find(a => {
                    const roles = Array.isArray(a.roles) ? a.roles : [];
                    const type = (a.type || '').toLowerCase();
                    return roles.includes('thumbnail') && (type.startsWith('image/jpeg') || type.startsWith('image/png'));
                  });
                  if (thumbAssetWeb) {
                    thumbnailUrl = thumbAssetWeb.href;
                    thumbnailType = thumbAssetWeb.type || null;
                  }
                }
                if (!thumbnailUrl) {
                  const thumbAny = assetsArr.find(a => {
                    const roles = Array.isArray(a.roles) ? a.roles : [];
                    return roles.includes('thumbnail') && a.href;
                  });
                  if (thumbAny) {
                    thumbnailUrl = thumbAny.href;
                    thumbnailType = thumbAny.type || null;
                  }
                }
                if (!thumbnailUrl && Array.isArray(item.links)) {
                  const link = item.links.find(l => l.rel === 'thumbnail' || l.rel === 'preview');
                  if (link && link.href) {
                    thumbnailUrl = link.href;
                    thumbnailType = link.type || null;
                  }
                }
              } catch (e) {
                console.warn('Error extracting thumbnail:', e);
              }
              return {
                id: item.id,
                title: item.properties?.title || item.id,
                geometry: item.geometry || null,
                bbox: item.bbox || null,
                thumbnailUrl,
                thumbnailType,
                datetime: item.properties?.datetime || item.properties?.start_datetime || null,
                assetsCount: Object.keys(item.assets || {}).length
              };
            });
            console.log('🔎 Fetched', items.length, 'items');
            setQueryItems(items);
            setSelectedItemId(null);
            console.log('✅ Query items updated, now showing:', items.length);
            // Also update the map with the new items
            window.dispatchEvent(new CustomEvent('showItemsOnMap', { detail: { items } }));
          } else {
            console.warn('No features in response');
          }
        } else {
          console.error('Response not ok:', response.status);
        }
      } catch (err) {
        console.error('refetchQueryItems error:', err);
      }
    };
    window.addEventListener('refetchQueryItems', handler);
    return () => window.removeEventListener('refetchQueryItems', handler);
  }, [collection]);

  // Listen for showItemsOnMap event to capture search result counts
  useEffect(() => {
    const handler = (event) => {
      const numberReturned = event?.detail?.numberReturned;
      const numberMatched = event?.detail?.numberMatched;
      if (numberReturned !== undefined) {
        setNumberReturned(numberReturned);
      }
      if (numberMatched !== undefined) {
        setNumberMatched(numberMatched);
      }
    };
    window.addEventListener('showItemsOnMap', handler);
    return () => window.removeEventListener('showItemsOnMap', handler);
  }, []);

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
      
      // Calculate bounding box that encompasses all items
      let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
      let hasBbox = false;
      
      queryItems.forEach(item => {
        if (item.bbox && item.bbox.length === 4) {
          hasBbox = true;
          minLon = Math.min(minLon, item.bbox[0]);
          minLat = Math.min(minLat, item.bbox[1]);
          maxLon = Math.max(maxLon, item.bbox[2]);
          maxLat = Math.max(maxLat, item.bbox[3]);
        }
      });
      
      if (hasBbox) {
        const combinedBbox = [minLon, minLat, maxLon, maxLat];
        console.log('Zooming to combined bbox:', combinedBbox);
        
        // Create and dispatch the zoom event
        const zoomEvent = new CustomEvent('zoomToBbox', { 
          detail: { 
            bbox: combinedBbox,
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

  const handleItemClick = (item) => {
    console.log('Item clicked:', item);
    // Close any open overlays when selecting an item
    try {
      window.dispatchEvent(new CustomEvent('hideOverlays'));
    } catch (err) {
      console.warn('Failed to dispatch hideOverlays on item click:', err);
    }
    setSelectedItemId(item.id);
    
    // Show only this item on the map
    if (onShowItemsOnMap) {
      console.log('Showing single item on map:', item);
      onShowItemsOnMap([item]);
    }
    
    // Zoom to the item's bbox if available
    if (item.bbox) {
      const zoomEvent = new CustomEvent('zoomToBbox', { 
        detail: { 
          bbox: item.bbox,
          options: {
            padding: 50,
            maxZoom: 14,
            essential: true
          }
        } 
      });
      console.log('Zooming to item bbox:', item.bbox);
      window.dispatchEvent(zoomEvent);
    }

    // Show thumbnail overlay if available
    if (item.thumbnailUrl) {
      const thumbEvent = new CustomEvent('showItemThumbnail', {
        detail: {
          url: item.thumbnailUrl,
          title: item.title || item.id,
          type: item.thumbnailType || null
        }
      });
      console.log('Dispatching showItemThumbnail with URL:', item.thumbnailUrl);
      window.dispatchEvent(thumbEvent);
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
      
      <div className="query-items">
        <button 
          className="stac-expand-btn"
          title={isQueryItemsVisible ? "Hide query items" : "Show query items"}
          onClick={handleQueryItemsClick}
        >
          <span className="expand-arrow">{isQueryItemsVisible ? '◀' : '▶'}</span>
          <span className="expand-label">
            Query Items
            {(numberReturned !== null || numberMatched !== null) && (
              <span style={{ fontSize: '0.85em', marginLeft: '8px', color: '#666' }}>
                ({numberReturned !== null ? numberReturned : '?'}/{numberMatched !== null ? numberMatched : '?'})
              </span>
            )}
          </span>
        </button>
        {isQueryItemsVisible && (
          <div className="stac-details-expanded">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <h4 style={{ margin: '0 0 5px 0' }}>Query Items</h4>
                {(numberReturned !== null || numberMatched !== null) && (
                  <p style={{ margin: 0, fontSize: '0.85em', color: '#666' }}>
                    {numberReturned !== null && numberMatched !== null
                      ? `Returned: ${numberReturned} / Matched: ${numberMatched}`
                      : numberReturned !== null
                      ? `Returned: ${numberReturned}`
                      : numberMatched !== null
                      ? `Matched: ${numberMatched}`
                      : ''}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="search-btn"
                title="Search (bbox if drawn, else query items)"
                aria-label="Search"
                onClick={(e) => {
                  e.stopPropagation();
                  try {
                    window.dispatchEvent(new CustomEvent('runSearch', { detail: { limit: itemLimit } }));
                  } catch (err) {
                    console.warn('Failed to dispatch runSearch:', err);
                  }
                }}
              >
                🔎
              </button>
            </div>
            <div className="limit-input-container">
              <label htmlFor="item-limit">Limit:</label>
              <input 
                id="item-limit"
                type="number" 
                min="1" 
                max="200" 
                value={itemLimit} 
                onChange={(e) => {
                  const next = parseInt(e.target.value || '10', 10);
                  setItemLimit(next);
                  try {
                    window.dispatchEvent(new CustomEvent('itemLimitChanged', { detail: { limit: next } }));
                  } catch (err) {
                    console.warn('Failed to dispatch itemLimitChanged:', err);
                  }
                }} 
              />
              <button
                type="button"
                className={`bbox-btn ${isBboxModeOn ? 'bbox-on' : 'bbox-off'}`}
                title="Toggle BBox draw mode"
                aria-label="Toggle BBox draw mode"
                onClick={(e) => {
                  e.stopPropagation();
                  try {
                    window.dispatchEvent(new CustomEvent('toggleBboxSearch'));
                  } catch (err) {
                    console.warn('Failed to dispatch toggleBboxSearch:', err);
                  }
                }}
              >
                BBOX: {isBboxModeOn ? 'ON' : 'OFF'}
              </button>
            </div>
            {(() => { console.log('Rendering Query Items list with', queryItems.length, 'items'); return queryItems.length > 0; })() ? (
              <ul>
                {queryItems.map(item => (
                  <li 
                    key={item.id}
                    className={`item-list-item ${selectedItemId === item.id ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemClick(item);
                    }}
                  >
                    <span className="item-title">{item.title}</span>
                    <button
                      className="preview-btn"
                      title={item.thumbnailUrl ? 'Show thumbnail' : 'No thumbnail available'}
                      aria-label={item.thumbnailUrl ? 'Show thumbnail' : 'No thumbnail available'}
                      disabled={!item.thumbnailUrl}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.thumbnailUrl) {
                          const thumbEvent = new CustomEvent('showItemThumbnail', {
                            detail: {
                              url: item.thumbnailUrl,
                              title: item.title || item.id,
                              type: item.thumbnailType || null
                            }
                          });
                          window.dispatchEvent(thumbEvent);
                        }
                      }}
                    >
                      👁
                    </button>
                    <button
                      className="details-btn"
                      title="Show item details"
                      aria-label="Show item details"
                      onClick={(e) => {
                        e.stopPropagation();
                        const detailsEvent = new CustomEvent('showItemDetails', {
                          detail: {
                            id: item.id,
                            title: item.title,
                            datetime: item.datetime || null,
                            assetsCount: item.assetsCount || 0,
                            bbox: item.bbox || null
                          }
                        });
                        window.dispatchEvent(detailsEvent);
                      }}
                    >
                      📄
                    </button>
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
