import React, { useState, useEffect, useRef } from 'react';
import './StacCollectionDetails.css';
import './QueryItems.css';

function StacCollectionDetails({ collection, onZoomToBbox, onShowItemsOnMap, stacApiUrl }) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isBoundingBoxVisible, setIsBoundingBoxVisible] = useState(false);
  const [isTemporalExtentVisible, setIsTemporalExtentVisible] = useState(false);
  const [isQueryItemsVisible, setIsQueryItemsVisible] = useState(false);
  const [queryItems, setQueryItems] = useState([]);
  const [itemLimit, setItemLimit] = useState(10);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [isBboxModeOn, setIsBboxModeOn] = useState(false);
  const [numberReturned, setNumberReturned] = useState(null);
  const [numberMatched, setNumberMatched] = useState(null);
  const [visibleThumbnailItemId, setVisibleThumbnailItemId] = useState(null);
  const [isDatetimePickerOpen, setIsDatetimePickerOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedDatetimeFilter, setAppliedDatetimeFilter] = useState('');
  const prevCollectionId = useRef(null);
  const stacApiUrlRef = useRef(stacApiUrl);
  const itemLimitRef = useRef(itemLimit);
  const appliedDatetimeFilterRef = useRef('');

  useEffect(() => {
    stacApiUrlRef.current = stacApiUrl;
  }, [stacApiUrl]);

  useEffect(() => {
    itemLimitRef.current = itemLimit;
  }, [itemLimit]);

  useEffect(() => {
    appliedDatetimeFilterRef.current = appliedDatetimeFilter;
  }, [appliedDatetimeFilter]);

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
  }, [collection, stacApiUrl]);

  // Fetch query items when the component mounts or collection changes
  useEffect(() => {
    if (collection && collection.id) {
      console.log(`Fetching items for collection: ${collection.id}`);
      // Fetch items from the collection using STAC API
      const fetchItems = async () => {
        try {
          const baseUrl = stacApiUrlRef.current || process.env.REACT_APP_STAC_API_BASE_URL || 'http://localhost:8080';
          const currentLimit = itemLimitRef.current;
          const datetimeFilter = appliedDatetimeFilterRef.current;
          const url = buildItemsUrl(baseUrl, collection.id, currentLimit, datetimeFilter);
          console.log(`Fetching items from: ${url}`);
          
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            console.log('Received items data:', data);
            
            // Capture search result counts
            setNumberReturned(data.numberReturned || data.features?.length || 0);
            setNumberMatched(data.numberMatched || data.features?.length || 0);
            
            if (data.features && data.features.length > 0) {
              const limit = itemLimitRef.current;
              const items = data.features.slice(0, limit).map(item => {
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
  }, [collection]);

  // Listen for bboxModeChanged event to update button state
  useEffect(() => {
    const handler = (event) => {
      const isOn = event?.detail?.isOn || false;
      setIsBboxModeOn(isOn);
    };
    window.addEventListener('bboxModeChanged', handler);
    return () => window.removeEventListener('bboxModeChanged', handler);
  }, []);

  // Listen for resetStacCollectionDetails event to reset state
  useEffect(() => {
    const handler = () => {
      console.log('🔄 Resetting StacCollectionDetails');
      setIsQueryItemsVisible(false);
      setQueryItems([]);
      setSelectedItemId(null);
      setNumberReturned(null);
      setNumberMatched(null);
      setItemLimit(10);
    };
    window.addEventListener('resetStacCollectionDetails', handler);
    return () => window.removeEventListener('resetStacCollectionDetails', handler);
  }, []);

  // Listen for refetchQueryItems event to re-fetch with new limit
  useEffect(() => {
    const handler = async (event) => {
      try {
        const lim = Number(event?.detail?.limit);
        if (!Number.isFinite(lim) || lim <= 0) return;
        if (!collection || !collection.id) return;
        
        console.log('🔎 refetchQueryItems triggered with limit:', lim);
        const baseUrl = stacApiUrlRef.current || process.env.REACT_APP_STAC_API_BASE_URL || 'http://localhost:8080';
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

  // Helper function to build API URL with datetime filter
  const buildItemsUrl = (baseUrl, collectionId, limit, datetimeFilter) => {
    let url = `${baseUrl}/collections/${collectionId}/items?limit=${limit}`;
    if (datetimeFilter) {
      url += `&datetime=${encodeURIComponent(datetimeFilter)}`;
    }
    return url;
  };

  // Helper function to process items from API response
  const processItems = (features) => {
    return features.map(item => {
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
  };

  if (!collection) return null;

  const bbox = collection.extent?.spatial?.bbox?.[0];
  const hasValidBbox = bbox && bbox.length === 4;

  // Extract temporal extent
  const temporalExtent = collection.extent?.temporal?.interval?.[0];
  const hasValidTemporalExtent = temporalExtent && temporalExtent.length === 2;
  const startTime = temporalExtent?.[0];
  const endTime = temporalExtent?.[1];

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
    if (isTemporalExtentVisible) {
      setIsTemporalExtentVisible(false);
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
    if (isTemporalExtentVisible) {
      setIsTemporalExtentVisible(false);
    }
    if (isQueryItemsVisible) {
      setIsQueryItemsVisible(false);
    }
  };

  const handleTemporalExtentClick = () => {
    setIsTemporalExtentVisible(!isTemporalExtentVisible);
    if (isDescriptionExpanded) {
      setIsDescriptionExpanded(false);
    }
    if (isBoundingBoxVisible) {
      setIsBoundingBoxVisible(false);
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
      window.dispatchEvent(new CustomEvent('hideMapThumbnail'));
    } catch (err) {
      console.warn('Failed to dispatch hideOverlays on item click:', err);
    }
    setSelectedItemId(item.id);
    setVisibleThumbnailItemId(null);
    
    // Show only this item on the map
    if (onShowItemsOnMap) {
      console.log('Showing single item on map:', item);
      onShowItemsOnMap([item]);
    }
    
    // Zoom to the item's bbox if available with better zoom level
    if (item.bbox) {
      const zoomEvent = new CustomEvent('zoomToBbox', { 
        detail: { 
          bbox: item.bbox,
          options: {
            padding: 50,
            maxZoom: 18,
            essential: true
          }
        } 
      });
      console.log('Zooming to item bbox:', item.bbox);
      window.dispatchEvent(zoomEvent);
    }
  };

  const handleEyeButtonClick = (e, item) => {
    e.stopPropagation();
    
    // Toggle thumbnail visibility for this item
    if (visibleThumbnailItemId === item.id) {
      // Hide thumbnail
      setVisibleThumbnailItemId(null);
      window.dispatchEvent(new CustomEvent('hideOverlays'));
      window.dispatchEvent(new CustomEvent('hideMapThumbnail'));
      // Show all items again
      if (onShowItemsOnMap) {
        console.log('Showing all query items on map');
        onShowItemsOnMap(queryItems);
      }
    } else {
      // Show thumbnail
      setVisibleThumbnailItemId(item.id);
      
      // Hide item geometries on the map by dispatching empty items event
      const hideGeometriesEvent = new CustomEvent('showItemsOnMap', {
        detail: { items: [] }
      });
      console.log('Hiding item geometries for thumbnail overlay');
      window.dispatchEvent(hideGeometriesEvent);
      
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

      // Show thumbnail on map if available and has geometry
      if (item.thumbnailUrl && item.geometry) {
        const mapThumbEvent = new CustomEvent('showMapThumbnail', {
          detail: {
            geometry: item.geometry,
            url: item.thumbnailUrl,
            title: item.title || item.id,
            type: item.thumbnailType || null
          }
        });
        console.log('Dispatching showMapThumbnail with geometry:', item.geometry);
        window.dispatchEvent(mapThumbEvent);
      }
    }
  };

  return (
    <>
      {hasValidTemporalExtent && (
        <div className="temporal-extent" onClick={handleTemporalExtentClick}>
          <button 
            className="stac-expand-btn"
            title={isTemporalExtentVisible ? "Hide temporal extent" : "Show temporal extent"}
          >
            <span className="expand-arrow">{isTemporalExtentVisible ? '◀' : '▶'}</span>
            <span className="expand-label">
              Temporal Range
              {startTime && endTime && (
                <span className="temporal-range-bracket">
                  ({new Date(startTime).toLocaleDateString()} / {new Date(endTime).toLocaleDateString()})
                </span>
              )}
            </span>
          </button>
          {isTemporalExtentVisible && (
            <div className="stac-details-expanded temporal-extent-expanded">
              <div className="temporal-extent-content">
                <div className="temporal-extent-item">
                  <span className="temporal-extent-key">Start:</span>
                  <span className="temporal-extent-value">{new Date(startTime).toLocaleString()}</span>
                </div>
                <div className="temporal-extent-item">
                  <span className="temporal-extent-key">End:</span>
                  <span className="temporal-extent-value">{new Date(endTime).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
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
              <button
                type="button"
                className={`datetime-btn ${appliedDatetimeFilter ? 'datetime-active' : 'datetime-inactive'}`}
                title={appliedDatetimeFilter ? `Filter active: ${appliedDatetimeFilter}` : "Filter by datetime"}
                aria-label={appliedDatetimeFilter ? `Filter active: ${appliedDatetimeFilter}` : "Filter by datetime"}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDatetimePickerOpen(!isDatetimePickerOpen);
                }}
              >
                📅
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
                      className={`preview-btn ${visibleThumbnailItemId === item.id ? 'active' : ''}`}
                      title={item.thumbnailUrl ? (visibleThumbnailItemId === item.id ? 'Hide thumbnail' : 'Show thumbnail') : 'No thumbnail available'}
                      aria-label={item.thumbnailUrl ? (visibleThumbnailItemId === item.id ? 'Hide thumbnail' : 'Show thumbnail') : 'No thumbnail available'}
                      disabled={!item.thumbnailUrl}
                      onClick={(e) => handleEyeButtonClick(e, item)}
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
      {isDatetimePickerOpen && (
        <div className="datetime-filter-box">
          <div className="datetime-filter-header">
            <h3>Filter by Date</h3>
            <button 
              className="datetime-filter-close"
              onClick={() => setIsDatetimePickerOpen(false)}
              aria-label="Close datetime filter"
            >
              ✕
            </button>
          </div>
          <div className="datetime-filter-content">
            <div className="datetime-filter-group">
              <label htmlFor="start-date">Start Date:</label>
              <input
                id="start-date"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="datetime-filter-group">
              <label htmlFor="end-date">End Date:</label>
              <input
                id="end-date"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="datetime-filter-buttons">
              <button
                type="button"
                className="datetime-apply-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  // Build datetime filter string in STAC format: start/end
                  // Convert datetime-local format to ISO 8601 with Z suffix
                  const formatDatetime = (dt) => {
                    if (!dt) return null;
                    // datetime-local format: "2025-01-15T10:30" -> ISO 8601: "2025-01-15T10:30:00Z"
                    return dt.includes('T') ? `${dt}:00Z` : `${dt}T00:00:00Z`;
                  };
                  
                  let datetimeFilter = '';
                  const formattedStart = formatDatetime(startDate);
                  const formattedEnd = formatDatetime(endDate);
                  
                  if (formattedStart && formattedEnd) {
                    datetimeFilter = `${formattedStart}/${formattedEnd}`;
                  } else if (formattedStart) {
                    datetimeFilter = `${formattedStart}/..`;
                  } else if (formattedEnd) {
                    datetimeFilter = `../${formattedEnd}`;
                  }
                  
                  console.log('Datetime filter applied:', { startDate, endDate, formattedStart, formattedEnd, datetimeFilter });
                  setAppliedDatetimeFilter(datetimeFilter);
                  setIsDatetimePickerOpen(false);
                  
                  // Trigger refetch with the new datetime filter
                  if (collection && collection.id) {
                    const baseUrl = stacApiUrlRef.current || process.env.REACT_APP_STAC_API_BASE_URL || 'http://localhost:8080';
                    const url = buildItemsUrl(baseUrl, collection.id, itemLimitRef.current, datetimeFilter);
                    console.log('Fetching items with datetime filter from:', url);
                    
                    fetch(url)
                      .then(response => {
                        if (response.ok) {
                          return response.json();
                        } else {
                          return response.text().then(text => {
                            throw new Error(`Failed to fetch: ${response.status} - ${text}`);
                          });
                        }
                      })
                      .then(data => {
                        console.log('Received filtered items data:', data);
                        setNumberReturned(data.numberReturned || data.features?.length || 0);
                        setNumberMatched(data.numberMatched || data.features?.length || 0);
                        
                        if (data.features && data.features.length > 0) {
                          const items = processItems(data.features);
                          console.log('Setting filtered query items:', items);
                          setQueryItems(items);
                          setSelectedItemId(null);
                          
                          // Show filtered items on map
                          if (onShowItemsOnMap) {
                            console.log('Showing filtered items on map');
                            onShowItemsOnMap(items);
                          }
                        } else {
                          console.log('No features found in filtered response');
                          setQueryItems([]);
                          // Clear map when no items match
                          if (onShowItemsOnMap) {
                            onShowItemsOnMap([]);
                          }
                        }
                      })
                      .catch(error => {
                        console.error('Error fetching filtered items:', error);
                        setQueryItems([]);
                      });
                  }
                }}
              >
                Apply
              </button>
              <button
                type="button"
                className="datetime-clear-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setStartDate('');
                  setEndDate('');
                  setAppliedDatetimeFilter('');
                  
                  // Trigger refetch without datetime filter
                  if (collection && collection.id) {
                    const baseUrl = stacApiUrlRef.current || process.env.REACT_APP_STAC_API_BASE_URL || 'http://localhost:8080';
                    const url = buildItemsUrl(baseUrl, collection.id, itemLimitRef.current, '');
                    console.log('Fetching items without datetime filter from:', url);
                    
                    fetch(url)
                      .then(response => {
                        if (response.ok) {
                          return response.json();
                        } else {
                          return response.text().then(text => {
                            throw new Error(`Failed to fetch: ${response.status} - ${text}`);
                          });
                        }
                      })
                      .then(data => {
                        console.log('Received unfiltered items data:', data);
                        setNumberReturned(data.numberReturned || data.features?.length || 0);
                        setNumberMatched(data.numberMatched || data.features?.length || 0);
                        
                        if (data.features && data.features.length > 0) {
                          const items = processItems(data.features);
                          console.log('Setting unfiltered query items:', items);
                          setQueryItems(items);
                          setSelectedItemId(null);
                          
                          // Show unfiltered items on map
                          if (onShowItemsOnMap) {
                            console.log('Showing unfiltered items on map');
                            onShowItemsOnMap(items);
                          }
                        } else {
                          console.log('No features found in unfiltered response');
                          setQueryItems([]);
                          // Clear map when no items match
                          if (onShowItemsOnMap) {
                            onShowItemsOnMap([]);
                          }
                        }
                      })
                      .catch(error => {
                        console.error('Error fetching unfiltered items:', error);
                        setQueryItems([]);
                      });
                  }
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default StacCollectionDetails;
