import React, { useState } from "react";
import "./login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [sessionKey, setSessionKey] = useState("");

  const handleLogin = () => {
    if (!username || !role || !sessionKey) {
      alert("Please enter username, select role, and provide session key");
      return;
    }

    const url =
      role === "sender"
        ? `/sender/${username}?key=${sessionKey}`
        : `/receiver/${username}?key=${sessionKey}`;

    window.open(url, "_blank", "noopener,noreferrer");
    window.location.reload();
  };

  return (
    <div className="login-page">
      <video autoPlay loop muted className="bg-video" playsInline>
        <source src="/videos/video1.mp4" type="video/mp4" />
      </video>

      <div className="login-container">
        <h1>Multi-User Secret Sharing System</h1>
        <p className="subtitle">Using Combined Classical Ciphers</p>

        <input
          type="text"
          placeholder="Enter Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Select Role</option>
          <option value="sender">Sender</option>
          <option value="receiver">Receiver</option>
        </select>

        {(role === "sender" || role === "receiver") && (
          <input
            type="password"
            placeholder="Enter Session Key"
            value={sessionKey}
            onChange={(e) => setSessionKey(e.target.value)}
          />
        )}

        <button onClick={handleLogin}>Login</button>
      </div>
    </div>
  );
}