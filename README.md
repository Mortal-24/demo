# Multi-User Secret Sharing System

A secure secret sharing application using combined classical ciphers (Caesar, Affine, Vigenère, Playfair, RailFence).
Built with **FastAPI** (Backend) and **React** (Frontend).

## 🚀 Features
- **Multi-User Encryption**: Split a secret message among multiple users with different ciphers.
- **Real-time Delivery**: Receivers get their shares instantly via WebSockets.
- **Secure Architecture**: Backend handles all cryptographic operations.
- **Auto-Deployment**: "Infrastructure as Code" using Render Blueprints.

## 🛠️ Tech Stack
-   **Backend**: Python, FastAPI, WebSockets
-   **Frontend**: React, React Router
-   **Deployment**: Render (Docker/Native)

---

## ☁️ Deployment (Recommended)

This project is configured for **one-click deployment** on Render.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Mortal-24/demo)

### How to Deploy
1.  Click the **Deploy to Render** button above.
2.  Log in to Render.
3.  Click **Apply**.
4.  Render will automatically:
    -   Build the Python Backend.
    -   Build the React Frontend.
    -   Link them together (Frontend will automatically know the Backend's URL).

---

## 💻 Local Development

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload
# Running on http://127.0.0.1:8000
```

### 2. Frontend
```bash
cd secret-sharing-ui
# Create .env file
echo "REACT_APP_API_URL=http://127.0.0.1:8000" > .env
npm install
npm start
# Running on http://localhost:3000
```
