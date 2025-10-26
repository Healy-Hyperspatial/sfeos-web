import React from 'react';
import './LogoOverlay.css';

const LogoOverlay = () => {
  return (
    <div className="logo-overlay">
      <img 
        src="/assets/sfeos-logo.png" 
        alt="SFEOS Logo"
        className="logo-image"
      />
    </div>
  );
};

export default LogoOverlay;
