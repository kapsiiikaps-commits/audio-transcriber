import React, { useRef, useState, useCallback } from 'react';
import './UploadZone.css';

const ACCEPTED = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm',
  'audio/flac', 'audio/aac', 'audio/x-m4a', 'video/mp4'];

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function UploadZone({ audioFile, onFileSelect, onUpload, onCancel, status, uploadProgress }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|mp4|webm|flac|aac|m4a)$/i)) {
      alert('Please select a valid audio file (mp3, wav, ogg, flac, aac, m4a, mp4, webm).');
      return;
    }
    onFileSelect(file);
  }, [onFileSelect]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const isUploading = status === 'uploading';

  return (
    <div className="card upload-card">
      <div className="card-title">◈ Audio Upload</div>

      <div
        className={`drop-zone ${dragging ? 'dragging' : ''} ${audioFile ? 'has-file' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !audioFile && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/mp4"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {!audioFile ? (
          <div className="drop-content">
            <div className="drop-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="19" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2"/>
                <path d="M20 12v12M14 18l6-6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 28h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="drop-text">Drop audio file here</div>
            <div className="drop-sub">or click to browse</div>
            <div className="drop-formats">MP3 · WAV · FLAC · AAC · OGG · M4A · MP4</div>
          </div>
        ) : (
          <div className="file-info">
            <div className="file-icon">🎵</div>
            <div className="file-details">
              <div className="file-name">{audioFile.name}</div>
              <div className="file-meta">
                <span>{formatBytes(audioFile.size)}</span>
                <span>·</span>
                <span>{audioFile.type || 'audio'}</span>
              </div>
            </div>
            <button
              className="file-remove"
              onClick={(e) => { e.stopPropagation(); onFileSelect(null); }}
              title="Remove file"
            >✕</button>
          </div>
        )}
      </div>

      {audioFile && !isUploading && (
        <div className="upload-row">
          <button
            className="btn-primary upload-btn"
            onClick={onUpload}
            disabled={isUploading}
          >
            ▲ TRANSCRIBE AUDIO
          </button>
          <button className="btn-ghost" onClick={() => inputRef.current?.click()}>
            ↻ Change
          </button>
        </div>
      )}

      {isUploading && (
        <div className="progress-section">
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
          <div className="progress-row">
            <span className="progress-label">Uploading & processing…</span>
            <span className="progress-pct">{uploadProgress}%</span>
            <button className="btn-ghost danger" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="upload-success">
          <span className="success-dot" /> Transcription complete
        </div>
      )}
    </div>
  );
}

export default UploadZone;
