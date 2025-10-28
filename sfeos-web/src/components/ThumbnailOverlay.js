import React from 'react';
import './ThumbnailOverlay.css';

function ThumbnailOverlay({ url, title, type, onClose }) {
  if (!url) return null;

  const lowerType = (type || '').toLowerCase();
  const isWebImage = lowerType.startsWith('image/jpeg') || lowerType.startsWith('image/png') || /\.(jpg|jpeg|png)(\?|$)/i.test(url);

  return (
    <div className="thumbnail-overlay" role="dialog" aria-label="Item thumbnail">
      <div className="thumbnail-card">
        <div className="thumbnail-header">
          <div className="thumbnail-title" title={title}>{title}</div>
          <button className="thumbnail-close" onClick={onClose} aria-label="Close thumbnail">✕</button>
        </div>
        <div className="thumbnail-body">
          {isWebImage ? (
            <img src={url} alt={title || 'Item thumbnail'} className="thumbnail-image" />
          ) : (
            <div style={{ padding: '10px', fontSize: '0.8rem', color: '#333' }}>
              <div style={{ marginBottom: '8px' }}>Thumbnail is not a web-friendly image type{type ? ` (${type})` : ''}.</div>
              <a href={url} target="_blank" rel="noreferrer" className="thumbnail-download-btn">Open/Download</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ThumbnailOverlay;
