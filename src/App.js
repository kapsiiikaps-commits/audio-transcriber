import React, { useState, useRef, useCallback } from "react";
import "./App.css";
import UploadZone from "./components/UploadZone";
import TranscriptGrid from "./components/TranscriptGrid";
import StatusBar from "./components/StatusBar";
import ChatWindow from "./components/ChatWindow";

function App() {
  const [apiEndpoint, setApiEndpoint] = useState(
    "https://localhost:61301/api/Transcription/upload",
  );
  const [apiKey, setApiKey] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [transcriptData, setTranscriptData] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | uploading | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [rawResponse, setRawResponse] = useState(null);
  const xhrRef = useRef(null);

  // Form fields for the transcription API
  const [caseId, setCaseId] = useState("");
  const [depositionId, setDepositionId] = useState("");
  const [witnessName, setWitnessName] = useState("");
  const [language, setLanguage] = useState("en-US");

  const handleFileSelect = useCallback((file) => {
    setAudioFile(file);
    setTranscriptData([]);
    setRawResponse(null);
    setStatus("idle");
    setErrorMsg("");
  }, []);

  const parseTranscriptResponse = (data) => {
    // Handle various common transcription API response formats
    // Format 1: { segments: [{start, end, text}] } (Whisper-style)
    if (data.segments && Array.isArray(data.segments)) {
      return data.segments.map((seg, i) => ({
        id: i + 1,
        startTime: formatTime(seg.start ?? seg.startTime ?? 0),
        endTime: formatTime(seg.end ?? seg.endTime ?? 0),
        text: seg.text ?? seg.transcript ?? "",
        confidence:
          seg.confidence != null ? `${Math.round(seg.confidence * 100)}%` : "—",
        speaker: seg.speaker ?? seg.speakerId ?? `—`,
      }));
    }

    // Format 2: { results: { transcripts, items } } (AWS Transcribe-style)
    if (data.results?.items) {
      const items = data.results.items.filter(
        (i) => i.type === "pronunciation",
      );
      return items.map((item, i) => ({
        id: i + 1,
        startTime: formatTime(parseFloat(item.start_time ?? 0)),
        endTime: formatTime(parseFloat(item.end_time ?? 0)),
        text: item.alternatives?.[0]?.content ?? "",
        confidence: item.alternatives?.[0]?.confidence
          ? `${Math.round(parseFloat(item.alternatives[0].confidence) * 100)}%`
          : "—",
        speaker: "—",
      }));
    }

    // Format 3: { words: [{word, start, end}] } (AssemblyAI-style)
    if (data.words && Array.isArray(data.words)) {
      return data.words.map((w, i) => ({
        id: i + 1,
        startTime: formatTime((w.start ?? 0) / 1000),
        endTime: formatTime((w.end ?? 0) / 1000),
        text: w.text ?? w.word ?? "",
        confidence:
          w.confidence != null ? `${Math.round(w.confidence * 100)}%` : "—",
        speaker: w.speaker ?? "—",
      }));
    }

    // Format 4: { utterances: [{start, end, text, speaker}] }
    if (data.utterances && Array.isArray(data.utterances)) {
      return data.utterances.map((u, i) => ({
        id: i + 1,
        startTime: formatTime((u.start ?? 0) / 1000),
        endTime: formatTime((u.end ?? 0) / 1000),
        text: u.text ?? "",
        confidence:
          u.confidence != null ? `${Math.round(u.confidence * 100)}%` : "—",
        speaker: u.speaker ?? "—",
      }));
    }

    // Format 5: flat { text, start_time, end_time } or array of such
    if (Array.isArray(data)) {
      return data.map((item, i) => ({
        id: i + 1,
        startTime: formatTime(
          item.start ?? item.start_time ?? item.startTime ?? 0,
        ),
        endTime: formatTime(item.end ?? item.end_time ?? item.endTime ?? 0),
        text:
          item.text ?? item.transcript ?? item.content ?? JSON.stringify(item),
        confidence:
          item.confidence != null
            ? `${Math.round(item.confidence * 100)}%`
            : "—",
        speaker: item.speaker ?? item.speakerId ?? "—",
      }));
    }

    // Fallback: show raw text
    const text =
      typeof data === "string"
        ? data
        : (data.text ?? data.transcript ?? JSON.stringify(data, null, 2));
    return [
      {
        id: 1,
        startTime: "00:00:00",
        endTime: "—",
        text: text,
        confidence: "—",
        speaker: "—",
      },
    ];
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds == null) return "00:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 100);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
  };

  const handleUpload = useCallback(async () => {
    if (!audioFile) return;
    if (!apiEndpoint.trim()) {
      setErrorMsg("Please enter an API endpoint URL.");
      setStatus("error");
      return;
    }

    // Validate required fields for the .NET API
    if (!caseId.trim()) {
      setErrorMsg("Case ID is required.");
      setStatus("error");
      return;
    }
    if (!depositionId.trim()) {
      setErrorMsg("Deposition ID is required.");
      setStatus("error");
      return;
    }

    setStatus("uploading");
    setUploadProgress(0);
    setErrorMsg("");
    setTranscriptData([]);
    setRawResponse(null);

    const formData = new FormData();
    formData.append("audioFile", audioFile);
    formData.append("caseId", caseId.trim());
    formData.append("depositionId", depositionId.trim());
    if (witnessName.trim()) {
      formData.append("witnessName", witnessName.trim());
    }
    formData.append("language", language);

    try {
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              setRawResponse(data);
              const parsed = parseTranscriptResponse(data);
              setTranscriptData(parsed);
              setStatus("success");
            } catch {
              // Non-JSON response — treat as plain text
              setRawResponse(xhr.responseText);
              setTranscriptData([
                {
                  id: 1,
                  startTime: "00:00:00",
                  endTime: "—",
                  text: xhr.responseText,
                  confidence: "—",
                  speaker: "—",
                },
              ]);
              setStatus("success");
            }
            resolve();
          } else {
            // Try to get error details from response
            let errorDetails = xhr.statusText;
            try {
              const errorData = JSON.parse(xhr.responseText);
              console.error("Server error response:", errorData);
              errorDetails =
                errorData.message ||
                errorData.error ||
                errorData.title ||
                errorData.detail ||
                JSON.stringify(errorData, null, 2);
            } catch {
              // If not JSON, use raw text
              if (xhr.responseText) {
                console.error(
                  "Server error response (text):",
                  xhr.responseText,
                );
                errorDetails = xhr.responseText.substring(0, 500);
              }
            }
            reject(new Error(`Server error ${xhr.status}: ${errorDetails}`));
          }
        });

        xhr.addEventListener("error", () =>
          reject(new Error("Network error. Check CORS and endpoint URL.")),
        );
        xhr.addEventListener("abort", () =>
          reject(new Error("Upload cancelled.")),
        );

        xhr.open("POST", apiEndpoint);
        if (apiKey.trim()) {
          xhr.setRequestHeader("Authorization", `Bearer ${apiKey.trim()}`);
        }
        xhr.send(formData);
      });
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  }, [
    audioFile,
    apiEndpoint,
    apiKey,
    caseId,
    depositionId,
    witnessName,
    language,
  ]);

  const handleCancel = () => {
    if (xhrRef.current) xhrRef.current.abort();
  };

  const handleReset = () => {
    setAudioFile(null);
    setTranscriptData([]);
    setRawResponse(null);
    setStatus("idle");
    setErrorMsg("");
    setUploadProgress(0);
  };

  const handleMockData = () => {
    const mockSegments = [
      {
        start: 0.0,
        end: 3.4,
        text: "Welcome to the audio transcription demo system.",
        confidence: 0.98,
        speaker: "Speaker 1",
      },
      {
        start: 3.5,
        end: 7.2,
        text: "This tool converts your audio files into timestamped text.",
        confidence: 0.95,
        speaker: "Speaker 1",
      },
      {
        start: 7.5,
        end: 11.8,
        text: "You can see each segment with its start and end time.",
        confidence: 0.97,
        speaker: "Speaker 2",
      },
      {
        start: 12.0,
        end: 15.3,
        text: "The confidence score shows how certain the model is.",
        confidence: 0.92,
        speaker: "Speaker 2",
      },
      {
        start: 15.6,
        end: 19.1,
        text: "Speaker diarization helps identify who is speaking.",
        confidence: 0.89,
        speaker: "Speaker 1",
      },
      {
        start: 19.4,
        end: 23.7,
        text: "All results are displayed in this interactive grid.",
        confidence: 0.96,
        speaker: "Speaker 1",
      },
      {
        start: 24.0,
        end: 28.2,
        text: "You can sort, filter and export the transcript data.",
        confidence: 0.94,
        speaker: "Speaker 2",
      },
      {
        start: 28.5,
        end: 32.0,
        text: "Upload your own audio file and configure the API above.",
        confidence: 0.91,
        speaker: "Speaker 2",
      },
    ];
    const parsed = parseTranscriptResponse({ segments: mockSegments });
    setTranscriptData(parsed);
    setStatus("success");
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">◈</span>
            <div>
              <div className="logo-title">AUDIOTRACE</div>
              <div className="logo-sub">TRANSCRIPTION INTERFACE</div>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="btn-ghost"
              onClick={handleMockData}
              title="Load sample data"
            >
              ▶ Demo Data
            </button>
            {(audioFile || transcriptData.length > 0) && (
              <button className="btn-ghost danger" onClick={handleReset}>
                ✕ Reset
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="top-panel">
          <div className="upload-column">
            <UploadZone
              audioFile={audioFile}
              onFileSelect={handleFileSelect}
              onUpload={handleUpload}
              onCancel={handleCancel}
              status={status}
              uploadProgress={uploadProgress}
            />
            <div className="card form-fields-card">
              <div className="card-title">◈ Transcription Details</div>
              <div className="field">
                <label className="field-label">
                  CASE ID <span className="required">*</span>
                </label>
                <input
                  className="field-input"
                  type="text"
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  placeholder="Enter case ID"
                  disabled={status === "uploading"}
                />
              </div>
              <div className="field">
                <label className="field-label">
                  DEPOSITION ID <span className="required">*</span>
                </label>
                <input
                  className="field-input"
                  type="text"
                  value={depositionId}
                  onChange={(e) => setDepositionId(e.target.value)}
                  placeholder="Enter deposition ID"
                  disabled={status === "uploading"}
                />
              </div>
              <div className="field">
                <label className="field-label">
                  WITNESS NAME <span className="optional">(optional)</span>
                </label>
                <input
                  className="field-input"
                  type="text"
                  value={witnessName}
                  onChange={(e) => setWitnessName(e.target.value)}
                  placeholder="Enter witness name"
                  disabled={status === "uploading"}
                />
              </div>
              <div className="field">
                <label className="field-label">LANGUAGE</label>
                <select
                  className="field-input"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={status === "uploading"}
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="es-ES">Spanish (Spain)</option>
                  <option value="es-MX">Spanish (Mexico)</option>
                  <option value="fr-FR">French</option>
                  <option value="de-DE">German</option>
                  <option value="it-IT">Italian</option>
                  <option value="pt-BR">Portuguese (Brazil)</option>
                  <option value="zh-CN">Chinese (Simplified)</option>
                  <option value="ja-JP">Japanese</option>
                  <option value="ko-KR">Korean</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <StatusBar
          status={status}
          errorMsg={errorMsg}
          uploadProgress={uploadProgress}
        />

        <TranscriptGrid
          data={transcriptData}
          status={status}
          rawResponse={rawResponse}
        />

        <div className="chat-section">
          <ChatWindow
            caseId={caseId}
            depositionId={depositionId}
            apiKey={apiKey}
          />
        </div>
      </main>

      <footer className="app-footer">
        <span>AUDIOTRACE v1.0</span>
        <span>·</span>
        <span>
          Supports Whisper · AWS Transcribe · AssemblyAI · Custom APIs
        </span>
      </footer>
    </div>
  );
}

export default App;
