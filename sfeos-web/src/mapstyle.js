// Map of all MapTiler built-in styles with their correct URLs
// Based on official MapTiler documentation - only includes styles that actually exist
// https://docs.maptiler.com/sdk-js/modules/MapStyle.html

export const MAP_STYLES = [
  // STREETS
  { id: 'streets', label: 'Streets' },
  { id: 'streets-dark', label: 'Streets Dark' },

  // OUTDOOR
  { id: 'outdoor', label: 'Outdoor' },

  // WINTER
  { id: 'winter', label: 'Winter' },

  // BASIC
  { id: 'basic', label: 'Basic' },
  { id: 'basic-dark', label: 'Basic Dark' },

  // BRIGHT
  { id: 'bright', label: 'Bright' },

  // TOPO
  { id: 'topo', label: 'Topo' },

  // TONER
  { id: 'toner', label: 'Toner' },
  { id: 'toner-lite', label: 'Toner Lite' },

  // DATAVIZ
  { id: 'dataviz', label: 'Data Viz' },
  { id: 'dataviz-dark', label: 'Data Viz Dark' },
  { id: 'dataviz-light', label: 'Data Viz Light' },

  // BACKDROP
  { id: 'backdrop', label: 'Backdrop' },
  { id: 'backdrop-dark', label: 'Backdrop Dark' },
  { id: 'backdrop-light', label: 'Backdrop Light' },

  // AQUARELLE
  { id: 'aquarelle', label: 'Aquarelle' },
  { id: 'aquarelle-dark', label: 'Aquarelle Dark' },
  { id: 'aquarelle-vivid', label: 'Aquarelle Vivid' },

  // LANDSCAPE
  { id: 'landscape', label: 'Landscape' },
  { id: 'landscape-dark', label: 'Landscape Dark' },
  { id: 'landscape-vivid', label: 'Landscape Vivid' },

  // No variants
  { id: 'satellite', label: 'Satellite' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'openstreetmap', label: 'OpenStreetMap' },
  { id: 'ocean', label: 'Ocean' },
];

/**
 * Get the full style URL with API key
 * @param {string} styleId - The style ID (e.g., 'streets-dark')
 * @param {string} apiKey - The MapTiler API key
 * @returns {string} Full style URL
 */
export const getStyleUrl = (styleId, apiKey) => {
  return `https://api.maptiler.com/maps/${styleId}/style.json?key=${apiKey}`;
};
