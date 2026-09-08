import React from 'react';

const Loader = ({ fullScreen = false, message = "Loading..." }) => {
  const loaderContent = (
    <div className="flex-center" style={{ flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner"></div>
      <p className="text-brand" style={{ fontWeight: '600', animation: 'pulse 2s infinite' }}>{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fullscreen-overlay animate-fade-in">
        {loaderContent}
      </div>
    );
  }

  return (
    <div className="loader-container animate-fade-in" style={{ padding: '2rem' }}>
      {loaderContent}
    </div>
  );
};

export default Loader;
