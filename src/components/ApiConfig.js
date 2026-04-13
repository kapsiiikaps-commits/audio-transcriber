import React, { useState } from "react";
import "./ApiConfig.css";

function ApiConfig({ apiEndpoint, setApiEndpoint, apiKey, setApiKey }) {
  const [showKey, setShowKey] = useState(false);

  const presets = [
    {
      label: "Local .NET API",
      url: "https://localhost:61301/api/Transcription/upload",
    },
    {
      label: "Whisper (OpenAI)",
      url: "https://api.openai.com/v1/audio/transcriptions",
    },
    { label: "AssemblyAI", url: "https://api.assemblyai.com/v2/transcript" },
    { label: "Custom / Local", url: "http://localhost:8000/transcribe" },
  ];

  return (
    <div className="card api-config">
      <div className="card-title">⚙ API Configuration</div>

      <div className="preset-bar">
        {presets.map((p) => (
          <button
            key={p.label}
            className={`preset-btn ${apiEndpoint === p.url ? "active" : ""}`}
            onClick={() => setApiEndpoint(p.url)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="field">
        <label className="field-label">ENDPOINT URL</label>
        <input
          className="field-input"
          type="url"
          value={apiEndpoint}
          onChange={(e) => setApiEndpoint(e.target.value)}
          placeholder="https://api.example.com/transcribe"
          spellCheck={false}
        />
      </div>

      <div className="field">
        <label className="field-label">
          API KEY <span className="optional">(optional)</span>
        </label>
        <div className="input-row">
          <input
            className="field-input"
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Bearer token or API key"
            spellCheck={false}
          />
          <button
            className="toggle-btn"
            onClick={() => setShowKey(!showKey)}
            title="Toggle visibility"
          >
            {showKey ? "👁" : "🔒"}
          </button>
        </div>
        <div className="field-hint">
          Sent as <code>Authorization: Bearer &lt;key&gt;</code>
        </div>
      </div>

      <div className="api-note">
        <span className="note-icon">ℹ</span>
        File is sent as <code>multipart/form-data</code> with field name{" "}
        <code>audioFile</code>. Additional form fields: <code>caseId</code>,{" "}
        <code>depositionId</code>, <code>witnessName</code>,{" "}
        <code>language</code>.
      </div>
    </div>
  );
}

export default ApiConfig;
