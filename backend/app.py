import json
import math
import uuid
from typing import Dict, List, Optional
from collections import Counter

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from classicalcipheres import (
    CaesarCipher,
    AffineCipher,
    VigenereCipher,
    PlayFair,
    RailFence
)

# =====================================================
# App setup
# =====================================================
app = FastAPI()

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Secret Sharing API is running. Use /multi-encrypt or Connect via WebSocket."}


# ✅ Active Users API
@app.get("/active-users")
def get_active_users():
    """Returns a list of connected usernames."""
    return {"users": list(connected_users.keys())}


# ✅ CORS (Fixed: wildcard origin cannot be combined with credentials=True)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False, # Must be False if origins is ["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

NULL = "\0"

# =====================================================
# WebSocket registry
# =====================================================
connected_users: Dict[str, WebSocket] = {}
pending_shares: Dict[str, List[dict]] = {}

# Session storage: session_id -> { "participants": [username], "shares": [ {user, share, ciphertext, entropy} ] }
reconstruction_sessions: Dict[str, dict] = {}

async def broadcast_to_session(session_id: str, payload: dict):
    session = reconstruction_sessions.get(session_id)
    if not session:
        return
    for username in session["participants"]:
        await send_to_user(username, payload)

async def send_to_user(username: str, payload: dict):
    username = username.lower()
    print(f"[DEBUG] Attempting to send to {username}")
    ws = connected_users.get(username)
    if ws:
        try:
            print(f"[DEBUG] User {username} found. Sending...")
            await ws.send_text(json.dumps(payload))
            print(f"[DEBUG] Sent to {username}")
        except Exception as e:
            print(f"[ERROR] Failed to send to {username}: {e}")
            connected_users.pop(username, None)
    else:
        print(f"[DEBUG] User {username} NOT found. Storing pending share.")
        pending_shares.setdefault(username, []).append(payload)

@app.websocket("/ws/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str):
    username = username.lower()
    await websocket.accept()
    connected_users[username] = websocket
    print(f"[DEBUG] User connected: {username}. Total users: {list(connected_users.keys())}")

    # Send pending messages if any
    if username in pending_shares:
        print(f"[DEBUG] Delivering pending shares to {username}")
        for msg in pending_shares[username]:
            await websocket.send_text(json.dumps(msg))
        pending_shares.pop(username)

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                mtype = msg.get("type")
                
                if mtype == "join_session":
                    sid = msg.get("session_id")
                    if sid in reconstruction_sessions:
                        if username not in reconstruction_sessions[sid]["participants"]:
                            reconstruction_sessions[sid]["participants"].append(username)
                        # Sync current state to the new joiner
                        await websocket.send_text(json.dumps({
                            "type": "session_update",
                            "session_id": sid,
                            "data": reconstruction_sessions[sid]
                        }))
                
                elif mtype == "submit_share":
                    sid = msg.get("session_id")
                    share_data = msg.get("share_data")
                    if sid in reconstruction_sessions:
                        # Append if this specific share content is not already there
                        # A user might have multiple shares for the same session now.
                        existing_shares = [s["ciphertext"] for s in reconstruction_sessions[sid]["shares"]]
                        if share_data["ciphertext"] not in existing_shares:
                            reconstruction_sessions[sid]["shares"].append(share_data)
                        
                        await broadcast_to_session(sid, {
                            "type": "session_update",
                            "session_id": sid,
                            "data": reconstruction_sessions[sid]
                        })

            except Exception as e:
                print(f"[ERROR] WS msg processing error: {e}")
    except WebSocketDisconnect:
        connected_users.pop(username, None)

# =====================================================
# Utility: Entropy
# =====================================================
def calculate_entropy(text: str) -> float:
    text = text.replace(NULL, "")
    if not text:
        return 0.0
    freq = Counter(text)
    total = len(text)
    return round(
        -sum((c / total) * math.log2(c / total) for c in freq.values()),
        4
    )

# =====================================================
# Utility: Secret Splitter
# =====================================================
def split_secret(secret: str, num_users: int) -> List[str]:
    size = math.ceil(len(secret) / num_users)
    padded = secret.ljust(size * num_users, NULL)
    return [
        padded[i * size:(i + 1) * size]
        for i in range(num_users)
    ]

# =====================================================
# Models
# =====================================================
class PerUserSpec(BaseModel):
    id: str
    cipher: str
    shift: Optional[int] = None
    a: Optional[int] = None
    b: Optional[int] = None
    key: Optional[str] = None
    key1: Optional[str] = None
    key2: Optional[int] = None

class MultiEncryptRequest(BaseModel):
    message: str
    users: List[PerUserSpec]
    split_size: Optional[int] = None

class ReconstructRequest(BaseModel):
    shares: List[str]

# =====================================================
# Multi Encrypt API
# =====================================================
@app.post("/multi-encrypt")
async def multi_encrypt(req: MultiEncryptRequest):
    if not req.users:
        raise HTTPException(status_code=400, detail="No users provided")

    session_id = str(uuid.uuid4())[:8]
    num_splits = req.split_size if req.split_size is not None else len(req.users)
    reconstruction_sessions[session_id] = {
        "participants": [],
        "shares": [],
        "total_expected": num_splits
    }

    shares = split_secret(req.message, num_splits)

    caesar = CaesarCipher()
    affine = AffineCipher()
    vigenere = VigenereCipher()

    results = []

    for i, share in enumerate(shares):
        user = req.users[i % len(req.users)]
        payload = {
            "user": user.id,
            "cipher": user.cipher,
            "share": share.replace(NULL, "")
        }

        try:
            if user.cipher == "caesar":
                shift = user.shift or 3
                ciphertext = caesar.encrypt(share, shift)
                decrypted = caesar.decrypt(ciphertext, shift)

            elif user.cipher == "affine":
                a = user.a or 5
                b = user.b or 8
                if math.gcd(a, 26) != 1:
                    raise ValueError("Invalid affine key")
                ciphertext = affine.encrypt(share, a, b)
                decrypted = affine.decrypt(ciphertext, a, b)

            elif user.cipher == "vigenere":
                if not user.key:
                    raise ValueError("Vigenere key required")
                ciphertext = vigenere.encrypt(share, user.key)
                decrypted = vigenere.decrypt(ciphertext, user.key)

            elif user.cipher == "playfair":
                if not user.key1:
                    raise ValueError("PlayFair key required")
                pf = PlayFair(user.key1)
                ciphertext = pf.encrypt(share)
                decrypted = pf.decrypt(ciphertext)

            elif user.cipher == "RailFence":
                if user.key2 is None:
                    raise ValueError("RailFence key required")
                rf = RailFence()
                ciphertext = rf.encrypt(share, user.key2)
                decrypted = rf.decrypt(ciphertext, user.key2)

            else:
                raise ValueError("Unsupported cipher")

            payload.update({
                "ciphertext": ciphertext.replace(NULL, ""),
                "decrypted": decrypted.replace(NULL, ""),
                "entropy": calculate_entropy(ciphertext)
            })

        except Exception as e:
            payload["error"] = str(e)

        results.append(payload)

        await send_to_user(user.id, {
            "type": "share",
            "session_id": session_id,
            "data": payload
        })

    return {
        "session_id": session_id,
        "total_users": len(req.users),
        "results": results
    }

# =====================================================
# Reconstruct API
# =====================================================
@app.post("/reconstruct")
def reconstruct(req: ReconstructRequest):
    if not req.shares:
        raise HTTPException(status_code=400, detail="No shares provided")

    combined = "".join(req.shares)
    return {
        "reconstructed_message": combined.replace(NULL, "")
    }
