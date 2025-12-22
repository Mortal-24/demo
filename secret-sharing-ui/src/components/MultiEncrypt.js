import React, { useState } from "react";

const getApiUrl = () => {
  const url = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
  return url.startsWith("http") ? url : `https://${url}`;
};
const API_BASE = getApiUrl();

export default function MultiEncrypt() {
  const [text, setText] = useState("");

  const [users, setUsers] = useState([]);
  const [userInput, setUserInput] = useState("");

  const [globalCipher, setGlobalCipher] = useState("caesar");
  const [globalShift, setGlobalShift] = useState(3);
  const [globalA, setGlobalA] = useState(5);
  const [globalB, setGlobalB] = useState(8);
  const [globalKey, setGlobalKey] = useState(""); // ✅ Vigenère key

  const [ciphertexts, setCiphertexts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---------------- ADD USER ----------------
  function addUser() {
    const id = userInput.trim();
    if (!id) return;

    if (users.find(u => u.id === id)) {
      setError("User already added");
      setTimeout(() => setError(""), 2000);
      return;
    }

    setUsers(prev => [
      ...prev,
      {
        id,
        cipher: "auto",
        shift: globalShift,
        a: globalA,
        b: globalB,
        key: globalKey
      }
    ]);

    setUserInput("");
  }

  function removeUser(id) {
    setUsers(prev => prev.filter(u => u.id !== id));
  }

  function updateUser(idx, field, value) {
    setUsers(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  }

  // ---------------- MULTI ENCRYPT ----------------
  async function handleMultiEncrypt() {
    if (!text) {
      setError("Enter plaintext");
      return;
    }
    if (users.length === 0) {
      setError("Add at least one user");
      return;
    }

    const payload = {
      text,
      global_cipher: globalCipher,
      global_shift: globalShift,
      global_a: globalA,
      global_b: globalB,
      global_key: globalKey,
      users: users.map(u => ({
        id: u.id,
        cipher: u.cipher,
        shift: u.shift,
        a: u.a,
        b: u.b,
        key: u.key
      }))
    };

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/multi-encrypt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Encrypt failed");
      const data = await res.json();
      setCiphertexts(data.ciphertexts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ---------------- DECRYPT TEST ----------------
  async function handleDecryptSingle(ct) {
    const payload = {
      text: ct.ciphertext,
      cipher: ct.cipher,
      shift: ct.params?.shift,
      a: ct.params?.a,
      b: ct.params?.b,
      key: ct.params?.key
    };

    try {
      const res = await fetch(`${API_BASE}/decrypt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      alert(`Decrypted for ${ct.user}: ${data.decrypted}`);
    } catch (err) {
      alert("Decrypt failed");
    }
  }

  // ---------------- UI ----------------
  return (
    <div className="container card">
      <h3>Sender — Multi Cipher Encrypt</h3>

      <textarea
        rows={4}
        cols={80}
        placeholder="Plaintext message"
        value={text}
        onChange={e => setText(e.target.value)}
      />

      {/* GLOBAL CIPHER */}
      <h4>Global Cipher</h4>
      <select value={globalCipher} onChange={e => setGlobalCipher(e.target.value)}>
        <option value="caesar">Caesar</option>
        <option value="affine">Affine</option>
        <option value="vigenere">Vigenère</option>
      </select>

      {globalCipher === "caesar" && (
        <input
          type="number"
          placeholder="Shift"
          value={globalShift}
          onChange={e => setGlobalShift(Number(e.target.value))}
        />
      )}

      {globalCipher === "affine" && (
        <>
          <input type="number" value={globalA} onChange={e => setGlobalA(Number(e.target.value))} placeholder="a" />
          <input type="number" value={globalB} onChange={e => setGlobalB(Number(e.target.value))} placeholder="b" />
        </>
      )}

      {globalCipher === "vigenere" && (
        <input
          type="text"
          placeholder="Vigenère Key"
          value={globalKey}
          onChange={e => setGlobalKey(e.target.value)}
        />
      )}

      <hr />

      {/* USERS */}
      <h4>Add Users</h4>
      <input
        placeholder="username"
        value={userInput}
        onChange={e => setUserInput(e.target.value)}
      />
      <button onClick={addUser}>Add</button>

      {users.map((u, idx) => (
        <div key={u.id} className="user-row">
          <strong>{u.id}</strong>

          <select value={u.cipher} onChange={e => updateUser(idx, "cipher", e.target.value)}>
            <option value="auto">auto</option>
            <option value="caesar">caesar</option>
            <option value="affine">affine</option>
            <option value="vigenere">vigenere</option>
          </select>

          {u.cipher === "caesar" && (
            <input
              type="number"
              value={u.shift}
              onChange={e => updateUser(idx, "shift", Number(e.target.value))}
              placeholder="shift"
            />
          )}

          {u.cipher === "affine" && (
            <>
              <input type="number" value={u.a} onChange={e => updateUser(idx, "a", Number(e.target.value))} placeholder="a" />
              <input type="number" value={u.b} onChange={e => updateUser(idx, "b", Number(e.target.value))} placeholder="b" />
            </>
          )}

          {u.cipher === "vigenere" && (
            <input
              type="text"
              value={u.key || ""}
              onChange={e => updateUser(idx, "key", e.target.value)}
              placeholder="key"
            />
          )}

          <button onClick={() => removeUser(u.id)}>Remove</button>
        </div>
      ))}

      <button onClick={handleMultiEncrypt} disabled={loading}>
        {loading ? "Encrypting..." : "Encrypt"}
      </button>

      {error && <div style={{ color: "red" }}>{error}</div>}

      {/* RESULTS */}
      <h4>Results</h4>
      {ciphertexts.map(ct => (
        <div key={ct.user} className="card">
          <strong>{ct.user}</strong> ({ct.cipher})
          <textarea readOnly rows={2} cols={80} value={ct.ciphertext} />
          <button onClick={() => handleDecryptSingle(ct)}>Decrypt (test)</button>
        </div>
      ))}
    </div>
  );
}
