import { useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import "./Chat.css";

export default function Receiver() {
  const { username } = useParams();
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("Disconnected");
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
            plaintext: msg.data.decrypted,
            ciphertext: msg.data.ciphertext,
            cipher: msg.data.cipher,
            entropy: msg.data.entropy
          }
        ]);
      }
    };

    wsRef.current = ws;
    return () => ws.close();
  }, [username]);

  return (
    <div className="chat">
      <div className="chat-header">
        Receiver: {username} <span style={{ fontSize: "0.8em", marginLeft: "10px", color: status === "Connected" ? "lightgreen" : "red" }}>({status})</span>
      </div>

      <div className="chat-body">
        {messages.map((m, i) => (
          <div key={i} className="bubble received">
            <small><b>Cipher:</b> {m.cipher}</small>
            <br />
            <small><b>Entropy:</b> {m.entropy}</small>
            <hr />
            <small>Encrypted:</small>
            <pre>{m.ciphertext}</pre>
            <small>Decrypted:</small>
            <b>{m.plaintext}</b>
          </div>
        ))}
      </div>
    </div>
  );
}