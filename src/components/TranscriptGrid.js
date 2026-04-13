import React, { useState, useMemo } from 'react';
import './TranscriptGrid.css';

function TranscriptGrid({ data, status, rawResponse }) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [activeSpeaker, setActiveSpeaker] = useState('ALL');
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const speakers = useMemo(() => {
    const set = new Set(data.map(r => r.speaker).filter(s => s && s !== '—'));
    return ['ALL', ...Array.from(set)];
  }, [data]);

  const filtered = useMemo(() => {
    let rows = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.text.toLowerCase().includes(q) || r.speaker.toLowerCase().includes(q));
    }
    if (activeSpeaker !== 'ALL') {
      rows = rows.filter(r => r.speaker === activeSpeaker);
    }
    rows.sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [data, search, sortField, sortDir, activeSpeaker]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortIcon = (field) => {
    if (sortField !== field) return <span className="sort-idle">⇅</span>;
    return <span className="sort-active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const exportCSV = () => {
    const header = ['#', 'Start Time', 'End Time', 'Speaker', 'Confidence', 'Text'];
    const rows = filtered.map(r => [r.id, r.startTime, r.endTime, r.speaker, r.confidence, `"${r.text.replace(/"/g, '""')}"`]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSRT = () => {
    const srt = filtered.map((r, i) => (
      `${i + 1}\n${r.startTime.replace('.', ',')} --> ${r.endTime.replace('.', ',')}\n${r.text}\n`
    )).join('\n');
    const blob = new Blob([srt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.srt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyAll = () => {
    const text = filtered.map(r => `[${r.startTime}] ${r.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (status === 'idle') {
    return (
      <div className="card grid-card grid-empty">
        <div className="empty-state">
          <div className="empty-icon">▤</div>
          <div className="empty-title">Transcript Grid</div>
          <div className="empty-sub">Configure your API endpoint, select an audio file, and click Transcribe. Results will appear here with timecodes.</div>
        </div>
      </div>
    );
  }

  if (status === 'uploading') {
    return (
      <div className="card grid-card grid-empty">
        <div className="empty-state">
          <div className="empty-icon loading-spin">⟳</div>
          <div className="empty-title">Processing…</div>
          <div className="empty-sub">Waiting for API response.</div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="card grid-card grid-empty">
        <div className="empty-state error-state">
          <div className="empty-icon">✕</div>
          <div className="empty-title">Upload Failed</div>
          <div className="empty-sub">Check the API endpoint, key, and network. CORS must be enabled on the server.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card grid-card">
      <div className="grid-header">
        <div className="grid-title-row">
          <div className="card-title" style={{ marginBottom: 0 }}>▤ Transcript Results</div>
          <div className="grid-meta">
            <span className="meta-badge">{data.length} segments</span>
            {filtered.length !== data.length && (
              <span className="meta-badge filtered">{filtered.length} shown</span>
            )}
          </div>
        </div>

        <div className="grid-controls">
          <div className="search-wrap">
            <span className="search-icon">⌕</span>
            <input
              className="search-input"
              type="text"
              placeholder="Search transcript…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          {speakers.length > 2 && (
            <div className="speaker-filter">
              {speakers.map(s => (
                <button
                  key={s}
                  className={`speaker-btn ${activeSpeaker === s ? 'active' : ''}`}
                  onClick={() => setActiveSpeaker(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="export-row">
            <button className="btn-ghost" onClick={copyAll}>{copied ? '✓ Copied' : '⎘ Copy'}</button>
            <button className="btn-ghost" onClick={exportCSV}>↓ CSV</button>
            <button className="btn-ghost" onClick={exportSRT}>↓ SRT</button>
            {rawResponse && (
              <button className="btn-ghost" onClick={() => setShowRaw(!showRaw)}>
                {showRaw ? '▲ Hide Raw' : '{ } Raw JSON'}
              </button>
            )}
          </div>
        </div>
      </div>

      {showRaw && rawResponse && (
        <div className="raw-panel">
          <pre className="raw-json">{JSON.stringify(rawResponse, null, 2)}</pre>
        </div>
      )}

      <div className="table-wrap">
        <table className="transcript-table">
          <thead>
            <tr>
              <th className="th-num" onClick={() => handleSort('id')}># {sortIcon('id')}</th>
              <th onClick={() => handleSort('startTime')}>START {sortIcon('startTime')}</th>
              <th onClick={() => handleSort('endTime')}>END {sortIcon('endTime')}</th>
              <th onClick={() => handleSort('speaker')}>SPEAKER {sortIcon('speaker')}</th>
              <th onClick={() => handleSort('confidence')}>CONF. {sortIcon('confidence')}</th>
              <th onClick={() => handleSort('text')}>TRANSCRIPT {sortIcon('text')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="no-results">No results match your filter.</td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr key={row.id}>
                <td className="td-num">{row.id}</td>
                <td className="td-time">{row.startTime}</td>
                <td className="td-time">{row.endTime}</td>
                <td className="td-speaker">
                  {row.speaker !== '—' ? (
                    <span className="speaker-tag">{row.speaker}</span>
                  ) : '—'}
                </td>
                <td className="td-conf">
                  {row.confidence !== '—' ? (
                    <span className={`conf-badge ${getConfClass(row.confidence)}`}>
                      {row.confidence}
                    </span>
                  ) : '—'}
                </td>
                <td className="td-text">{highlightSearch(row.text, search)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getConfClass(conf) {
  const num = parseInt(conf);
  if (num >= 90) return 'conf-high';
  if (num >= 70) return 'conf-mid';
  return 'conf-low';
}

function highlightSearch(text, query) {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((p, i) =>
    regex.test(p) ? <mark key={i} className="highlight">{p}</mark> : p
  );
}

export default TranscriptGrid;
