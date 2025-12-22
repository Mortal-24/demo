import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Login";
import Sender from "./Sender";
import Receiver from "./Receiver";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/sender/:username" element={<Sender />} />
        <Route path="/receiver/:username" element={<Receiver />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
