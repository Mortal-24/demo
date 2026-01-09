import { useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import "./Chat.css";

export default function Receiver() {
  const { username } = useParams();
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("Disconnected");
  const [sessions, setSessions] = useState({}); // { sid: { shares: [], participants: [], total_expected: N } }
  const [reconstructed, setReconstructed] = useState({}); // { sid: message }
  const wsRef = useRef(null);

  useEffect(() => {
    // Helper to get WS url
    const getWsUrl = () => {
      if (process.env.REACT_APP_WS_URL) return process.env.REACT_APP_WS_URL;
      let apiUrl = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

      // Fix for Render potential internal hostnames
      if (!apiUrl.includes("localhost") && !apiUrl.includes(".") && !apiUrl.includes(":")) {
        apiUrl += ".onrender.com";
      }

      if (!apiUrl.startsWith("http")) {
        apiUrl = `https://${apiUrl}`;
      }
      return apiUrl.replace(/^http/, "ws");
    };

    const url = `${getWsUrl()}/ws/${username}`;
    console.log("Connecting to WS:", url);
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("WS Connected");
      setStatus("Connected");
    };

    ws.onerror = (e) => {
      console.error("WS Error:", e);
      setStatus("Error");
    };

    ws.onclose = () => {
      console.log("WS Closed");
      setStatus("Disconnected");
    };

    ws.onmessage = (e) => {
      console.log("WS Message:", e.data);
      const msg = JSON.parse(e.data);

      if (msg.type === "share") {
        setMessages((prev) => [
          ...prev,
          {
            from: "sender",
            session_id: msg.session_id,
            plaintext: msg.data.decrypted,
            ciphertext: msg.data.ciphertext,
            cipher: msg.data.cipher,
            entropy: msg.data.entropy
          }
        ]);
      }

      if (msg.type === "session_update") {
        setSessions((prev) => ({
          ...prev,
          [msg.session_id]: msg.data
        }));
      }
    };

    wsRef.current = ws;
    return () => ws.close();
  }, [username]);

  const joinSession = (sid) => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: "join_session",
        session_id: sid
      }));
    }
  };

  const shareMyPart = (sid, shareData) => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: "submit_share",
        session_id: sid,
        share_data: {
          user: username,
          plaintext: shareData.plaintext,
          ciphertext: shareData.ciphertext,
          entropy: shareData.entropy
        }
      }));
    }
  };

  const reconstructMessage = async (sid) => {
    const session = sessions[sid];
    if (!session) return;

    // Sort shares if needed, but for now just join
    const shares = session.shares.map(s => s.plaintext);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiUrl}/reconstruct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shares })
      });
      const data = await res.json();
      setReconstructed(prev => ({ ...prev, [sid]: data.reconstructed_message }));
    } catch (e) {
      console.error("Reconstruction failed", e);
    }
  };

  const getStrongestShare = (shares) => {
    if (!shares || shares.length === 0) return null;
    return shares.reduce((prev, current) => (prev.entropy > current.entropy) ? prev : current);
  };

  return (
    <div className="chat">
      <div className="chat-header">
        Receiver: {username} <span style={{ fontSize: "0.8em", marginLeft: "10px", color: status === "Connected" ? "lightgreen" : "red" }}>({status})</span>
      </div>

      <div className="chat-body">
        {messages.map((m, i) => (
          <div key={i} className="bubble received">
            <div className="msg-header">
              <small><b>Cipher:</b> {m.cipher}</small>
              <small><b>Session:</b> {m.session_id}</small>
            </div>
            <div className="entropy-bar">
              <div className="entropy-fill" style={{ width: `${(m.entropy / 5) * 100}%` }}></div>
            </div>
            <small><b>Entropy:</b> {m.entropy}</small>
            <hr />
            <small>Encrypted:</small>
            <pre>{m.ciphertext}</pre>
            <small>Decrypted:</small>
            <b>{m.plaintext}</b>

            <div className="actions">
              {!sessions[m.session_id] ? (
                <button className="btn-join" onClick={() => joinSession(m.session_id)}>Join Reconstruction Hub</button>
              ) : (
                <button className="btn-share" onClick={() => shareMyPart(m.session_id, m)}>Share My Part</button>
              )}
            </div>
          </div>
        ))}

        {Object.entries(sessions).map(([sid, session]) => (
          <div key={sid} className="reconstruction-hub">
            <h4>Reconstruction Hub: {sid}</h4>
            <div className="session-info">
              <span>Participants: {session.participants.join(", ")}</span>
              <span>Shares: {session.shares.length} / {session.total_expected}</span>
            </div>

            <div className="pooled-shares">
              {session.shares.map((s, idx) => {
                const strongest = getStrongestShare(session.shares);
                const isStrongest = strongest && strongest.user === s.user;
                return (
                  <div key={idx} className={`pooled-share-item ${isStrongest ? 'strongest' : ''}`}>
                    <b>{s.user}</b>: {s.plaintext}
                    {isStrongest && <span className="badge">Strongest (Entropy: {s.entropy})</span>}
                  </div>
                );
              })}
            </div>

            {reconstructed[sid] ? (
              <div className="reconstruction-result">
                <strong>Reconstructed Secret:</strong>
                <p>{reconstructed[sid]}</p>
              </div>
            ) : (
              <button
                className="btn-reconstruct"
                disabled={session.shares.length < session.total_expected}
                onClick={() => reconstructMessage(sid)}
              >
                {session.shares.length < session.total_expected
                  ? `Need ${session.total_expected - session.shares.length} more shares`
                  : "Reconstruct Message"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}