import React, { useState } from "react";
import "./Sender.css";

export default function Sender() {
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");
  const [cipher, setCipher] = useState("caesar");

  // cipher keys
  const [shift, setShift] = useState(3);
  const [a, setA] = useState(5);
  const [b, setB] = useState(8);
  const [vKey, setVKey] = useState("");
  const [pKey, setPKey] = useState("");
  const [railKey, setRailKey] = useState(2);

  const [splitSize, setSplitSize] = useState("");
  const [result, setResult] = useState([]);

  // ✅ Add receiver with keys
  const addUser = () => {
    if (!username) return;

    const user = { id: username, cipher };

    if (cipher === "caesar") user.shift = shift;
    if (cipher === "affine") {
      user.a = a;
      user.b = b;
    }
    if (cipher === "vigenere") {
      user.key = vKey;
    }

    // Playfair
    if (cipher === "playfair") {
      user.key1 = pKey;
    }

    // RailFence
    if (cipher === "RailFence") {
      user.key2 = railKey;
    }

    setUsers([...users, user]);

    // reset
    setUsername("");
    setVKey("");
    setPKey("");
  };

  // Send message
  const sendToBackend = async () => {
    const body = {
      message,
      users,
      split_size: splitSize ? Number(splitSize) : undefined
    };

    const getApiUrl = () => {
      let url = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
      // Fix for Render potential internal hostnames
      if (!url.includes("localhost") && !url.includes(".") && !url.includes(":")) {
        url += ".onrender.com";
      }
      return url.startsWith("http") ? url : `https://${url}`;
    };

    try {
      console.log("Sending to:", `${getApiUrl()}/multi-encrypt`);
      const res = await fetch(`${getApiUrl()}/multi-encrypt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server Error: ${res.status} ${errText}`);
      }

      const data = await res.json();
      setResult(data.results || []);
    } catch (err) {
      console.error("Send failed:", err);
      alert(`Failed to send to ${getApiUrl()}\n\nError: ${err.message}`);
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <h3>Receivers</h3>

        <input
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />

        <select value={cipher} onChange={e => setCipher(e.target.value)}>
          <option value="caesar">Caesar</option>
          <option value="affine">Affine</option>
          <option value="vigenere">Vigenere</option>
          <option value="playfair">PlayFair</option>
          <option value="RailFence">RailFence</option>
        </select>

        {/* 🔑 Cipher-specific inputs */}
        {cipher === "caesar" && (
          <input
            type="number"
            placeholder="Shift"
            value={shift}
            onChange={e => setShift(+e.target.value)}
          />
        )}

        {cipher === "affine" && (
          <>
            <input
              type="number"
              placeholder="a"
              value={a}
              onChange={e => setA(+e.target.value)}
            />
            <input
              type="number"
              placeholder="b"
              value={b}
              onChange={e => setB(+e.target.value)}
            />
          </>
        )}

        {cipher === "vigenere" && (
          <input
            placeholder="Vigenere Key"
            value={vKey}
            onChange={e => setVKey(e.target.value)}
          />
        )}

        {cipher === "playfair" && (
          <input
            placeholder="Playfair Key"
            value={pKey}
            onChange={e => setPKey(e.target.value)}
          />
        )}

        {cipher === "RailFence" && (
          <input
            type="number"
            placeholder="Rails"
            value={railKey}
            onChange={e => setRailKey(+e.target.value)}
          />
        )}

        <button onClick={addUser}>Add Receiver</button>

        <ul>
          {users.map((u, i) => (
            <li key={i}>
              {u.id} → {u.cipher}
            </li>
          ))}
        </ul>

        <input
          type="number"
          placeholder="Split Size"
          value={splitSize}
          onChange={e => setSplitSize(e.target.value)}
        />
      </aside>

      <main className="chat">
        <div className="chat-header">Secure Sender</div>

        <div className="chat-body">
          {result.map((r, i) => (
            <div key={i} className="bubble">
              <b>{r.user}</b>
              <pre>{r.ciphertext}</pre>
              <pre>{r.decrypted}</pre>
            </div>
          ))}
        </div>

        <div className="chat-input">
          <textarea
            placeholder="Type secret message..."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          <button onClick={sendToBackend}>Send</button>
        </div>
      </main>
    </div>
  );
}