import React, { useState, useRef, useEffect } from "react";
import "./ChatWindow.css";

function ChatWindow({ caseId, depositionId, apiKey }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [contextChunks, setContextChunks] = useState(5);
  const [semanticConfig, setSemanticConfig] = useState("");
  const [useSemanticSearch, setUseSemanticSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    const question = inputValue.trim();
    if (!question || isLoading) return;

    // Validate required fields
    if (!caseId || !depositionId) {
      alert(
        "Please enter Case ID and Deposition ID in the form above before asking questions.",
      );
      return;
    }

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      type: "user",
      text: question,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const requestBody = {
        question: question,
        caseId: caseId,
        depositionId: depositionId,
        contextChunks: contextChunks,
      };

      // Only include semanticConfiguration if enabled and provided
      if (useSemanticSearch && semanticConfig.trim()) {
        requestBody.semanticConfiguration = semanticConfig.trim();
      }

      const response = await fetch(
        "https://localhost:61301/api/search/retrieve-and-answer",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        let errorMsg = `Error ${response.status}: ${response.statusText}`;
        let errorDetails = null;
        try {
          const errorData = await response.json();
          errorDetails = errorData;
          errorMsg =
            errorData.message ||
            errorData.error ||
            errorData.detail ||
            errorData.title ||
            errorMsg;

          // Specific handling for Azure OpenAI deployment errors
          if (
            errorMsg.includes("DeploymentNotFound") ||
            errorMsg.includes("deployment for this resource does not exist") ||
            (response.status === 404 &&
              errorMsg.includes("invalid_request_error"))
          ) {
            errorMsg = "Azure OpenAI Deployment Not Found\n\n" + errorMsg;
            errorMsg +=
              "\n\n🔧 Backend Configuration Issue:\n" +
              "• Check your Azure OpenAI deployment name in appsettings.json\n" +
              "• Verify the deployment exists in your Azure OpenAI resource\n" +
              "• Ensure the deployment name matches exactly (case-sensitive)\n" +
              "• Common deployment names: 'gpt-4', 'gpt-35-turbo', 'text-embedding-ada-002'\n" +
              "• If just created, wait 5 minutes before trying again";
          }

          // Specific handling for semantic configuration errors
          else if (
            errorMsg.includes("semanticConfiguration") ||
            errorMsg.includes("semantic configurations")
          ) {
            errorMsg +=
              "\n\nTip: This error occurs when semantic search is not configured on your Azure AI Search index. Try disabling 'Use Semantic Search' in settings, or configure a semantic configuration on your search index.";
          }
        } catch {
          const errorText = await response.text();
          if (errorText) {
            errorMsg = errorText.substring(0, 500);
            errorDetails = errorText;
          }
        }
        const error = new Error(errorMsg);
        error.details = errorDetails;
        throw error;
      }

      const data = await response.json();

      // Extract answer from response (adjust based on your API response structure)
      const answerText =
        data.answer ||
        data.response ||
        data.text ||
        JSON.stringify(data, null, 2);

      const assistantMessage = {
        id: Date.now() + 1,
        type: "assistant",
        text: answerText,
        timestamp: new Date().toLocaleTimeString(),
        metadata: data.metadata || data.sources || null,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: "error",
        text: error.message || "Failed to get response from the server.",
        timestamp: new Date().toLocaleTimeString(),
        errorDetails: error.details || null,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Clear all chat messages?")) {
      setMessages([]);
    }
  };

  return (
    <div className="card chat-window">
      <div className="chat-header">
        <div className="chat-title">
          <span className="chat-icon">💬</span>
          <span>AI Assistant</span>
        </div>
        <div className="chat-header-actions">
          <button
            className="icon-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            ⚙
          </button>
          <button
            className="icon-btn"
            onClick={handleClearChat}
            title="Clear chat"
            disabled={messages.length === 0}
          >
            🗑
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="chat-settings">
          <div className="setting-field">
            <label className="setting-label checkbox-label">
              <input
                type="checkbox"
                checked={useSemanticSearch}
                onChange={(e) => setUseSemanticSearch(e.target.checked)}
                className="setting-checkbox"
              />
              Use Semantic Search
            </label>
          </div>

          {useSemanticSearch && (
            <div className="setting-field">
              <label className="setting-label">Semantic Config Name:</label>
              <input
                type="text"
                value={semanticConfig}
                onChange={(e) => setSemanticConfig(e.target.value)}
                className="setting-input"
                placeholder="e.g., default"
              />
              <span className="setting-hint">
                Name of the semantic configuration in your Azure AI Search index
              </span>
            </div>
          )}

          <div className="setting-field">
            <label className="setting-label">Context Chunks:</label>
            <input
              type="number"
              min="0"
              max="20"
              value={contextChunks}
              onChange={(e) => setContextChunks(parseInt(e.target.value) || 0)}
              className="setting-input"
            />
            <span className="setting-hint">
              Number of context chunks to retrieve
            </span>
          </div>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="empty-icon">💡</div>
            <div className="empty-text">
              Ask a question about your transcription
            </div>
            <div className="empty-hint">
              Make sure Case ID and Deposition ID are filled in above
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`chat-message ${msg.type}`}>
              <div className="message-header">
                <span className="message-sender">
                  {msg.type === "user"
                    ? "You"
                    : msg.type === "error"
                      ? "Error"
                      : "AI Assistant"}
                </span>
                <span className="message-time">{msg.timestamp}</span>
              </div>
              <div className="message-content">
                {msg.text}
                {msg.metadata && (
                  <div className="message-metadata">
                    <details>
                      <summary>Sources & Metadata</summary>
                      <pre>{JSON.stringify(msg.metadata, null, 2)}</pre>
                    </details>
                  </div>
                )}
                {msg.errorDetails && (
                  <div className="message-metadata error-details">
                    <details>
                      <summary>Technical Details</summary>
                      <pre>
                        {typeof msg.errorDetails === "string"
                          ? msg.errorDetails
                          : JSON.stringify(msg.errorDetails, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="chat-message assistant loading">
            <div className="message-header">
              <span className="message-sender">AI Assistant</span>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Ask a question..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          rows={1}
        />
        <button
          className="chat-send-btn"
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading}
          title="Send message (Enter)"
        >
          {isLoading ? "⏳" : "➤"}
        </button>
      </div>
    </div>
  );
}

export default ChatWindow;
