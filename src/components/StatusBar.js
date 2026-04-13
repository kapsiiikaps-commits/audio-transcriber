import React from 'react';
import './StatusBar.css';

function StatusBar({ status, errorMsg }) {
  if (status === 'idle') return null;

  const configs = {
    uploading: { cls: 'uploading', icon: '⟳', text: 'Sending audio to API endpoint…' },
    success:   { cls: 'success',   icon: '✓', text: 'Transcription received and parsed successfully.' },
    error:     { cls: 'error',     icon: '✕', text: errorMsg || 'An error occurred.' },
  };

  const cfg = configs[status];
  if (!cfg) return null;

  return (
    <div className={`status-bar status-${cfg.cls}`}>
      <span className="status-icon">{cfg.icon}</span>
      <span className="status-text">{cfg.text}</span>
    </div>
  );
}

export default StatusBar;
