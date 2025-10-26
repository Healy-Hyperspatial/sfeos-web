import React from 'react';
import { Form } from 'react-bootstrap';
import './MapStyleSelector.css';

const mapStyleTemplates = [
  { path: 'outdoor/style.json', label: 'Outdoor' },
  { path: 'streets/style.json', label: 'Streets' },
  { path: 'basic/style.json', label: 'Basic' },
  { path: 'darkmatter/style.json', label: 'Dark Matter' },
  { path: 'positron/style.json', label: 'Positron' },
  { path: 'pastel/style.json', label: 'Pastel' },
  { path: 'topo/style.json', label: 'Topo' },
  { path: 'hybrid/style.json', label: 'Hybrid' },
  { path: 'satellite/style.json', label: 'Satellite' },
  { path: 'voyager/style.json', label: 'Voyager' },
  { path: 'toner/style.json', label: 'Toner' },
  { path: 'backdrop/style.json', label: 'Backdrop' }
];

const getMapStyles = (apiKey) => {
  return mapStyleTemplates.map(style => ({
    ...style,
    value: `https://api.maptiler.com/maps/${style.path}?key=${apiKey}`
  }));
};

function MapStyleSelector({ value, onChange }) {
  const apiKey = process.env.REACT_APP_MAPTILER_KEY;
  const mapStyles = getMapStyles(apiKey);
  
  return (
    <div className="map-style-selector">
      <Form.Select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        aria-label="Select map style"
        size="sm"
      >
        {mapStyles.map((style) => (
          <option key={style.value} value={style.value}>
            {style.label}
          </option>
        ))}
      </Form.Select>
    </div>
  );
}

export default MapStyleSelector;
