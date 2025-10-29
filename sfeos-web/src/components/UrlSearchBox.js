import React, { useState } from 'react';
import '../UrlSearchBox.css';

const UrlSearchBox = ({ initialUrl, onUpdate }) => {
  const [url, setUrl] = useState(initialUrl);

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(url);
  };

  return (
    <form className="url-search-box" onSubmit={handleSubmit}>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="STAC API URL"
      />
      <button type="submit">
        Update
      </button>
    </form>
  );
};

export default UrlSearchBox;
