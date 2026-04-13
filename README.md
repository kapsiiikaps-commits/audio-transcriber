# 🎵 AudioTrace — Audio Transcription Interface

A production-ready React application for uploading audio files to a transcription API and displaying timestamped results in an interactive grid.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm

### Installation

```bash
npm install
npm start
```

Opens on `http://localhost:3000`

---

## 🛠 Features

- **Drag & Drop Upload** — drag any audio file onto the upload zone
- **API Configuration** — set endpoint URL, API key, and choose from presets (OpenAI Whisper, AssemblyAI, Custom)
- **Auto-parsing** — handles multiple response formats automatically:
  - OpenAI Whisper (`segments[]`)
  - AWS Transcribe (`results.items[]`)
  - AssemblyAI (`words[]` / `utterances[]`)
  - Generic arrays and plain text
- **Interactive Grid** with:
  - Timecodes (HH:MM:SS.ms)
  - Speaker labels
  - Confidence scores
  - Sortable columns
  - Full-text search with highlighting
  - Speaker filtering
- **Export** — CSV and SRT subtitle formats
- **Raw JSON viewer** — inspect the raw API response
- **Demo Data** — try the UI without a real API

---

## 🔌 API Integration

Files are sent as `multipart/form-data` POST with field name `file`.

If you provide an API key, it's sent as:
```
Authorization: Bearer <your-key>
```

### Expected Response Formats

**Whisper-style:**
```json
{
  "segments": [
    { "start": 0.0, "end": 3.5, "text": "Hello world", "confidence": 0.98 }
  ]
}
```

**AssemblyAI-style:**
```json
{
  "words": [{ "start": 0, "end": 500, "text": "Hello", "confidence": 0.95 }],
  "utterances": [{ "start": 0, "end": 3500, "text": "Hello world", "speaker": "A" }]
}
```

**AWS Transcribe-style:**
```json
{
  "results": {
    "items": [
      { "type": "pronunciation", "start_time": "0.0", "end_time": "0.5",
        "alternatives": [{ "content": "Hello", "confidence": "0.99" }] }
    ]
  }
}
```

---

## 📁 Project Structure

```
src/
├── App.js                    # Main app, upload logic, state
├── App.css
├── index.js
├── index.css
└── components/
    ├── ApiConfig.js/.css     # Endpoint + API key config
    ├── UploadZone.js/.css    # Drag & drop file upload
    ├── StatusBar.js/.css     # Upload/error status
    └── TranscriptGrid.js/.css # Results table with search/export
```

---

## 📦 Building for Production

```bash
npm run build
```

Output in `/build` — ready to deploy to any static host.
