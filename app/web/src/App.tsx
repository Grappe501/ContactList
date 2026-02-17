import React, { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import ContactsPage from "./pages/ContactsPage";
import ContactDetailPage from "./pages/ContactDetailPage";
import ImportsPage from "./pages/ImportsPage";
import DedupePage from "./pages/DedupePage";
import GatePage from "./pages/GatePage";
import { getPrivateKey, clearPrivateKey } from "./lib/privateKey";

export default function App() {
  const [unlocked, setUnlocked] = useState(Boolean(getPrivateKey()));

  useEffect(() => {
    setUnlocked(Boolean(getPrivateKey()));
  }, []);

  if (!unlocked) {
    return <GatePage onUnlocked={() => setUnlocked(true)} />;
  }

  return (
    <HashRouter>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
        <header style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 20 }}>ContactList</h1>
          <nav style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link to="/">Contacts</Link>
            <Link to="/imports">Imports</Link>
            <Link to="/dedupe">De-dupe</Link>
            <button
              style={{ marginLeft: 10 }}
              onClick={() => { clearPrivateKey(); window.location.reload(); }}
            >
              Logout
            </button>
          </nav>
        </header>

        <Routes>
          <Route path="/" element={<ContactsPage />} />
          <Route path="/imports" element={<ImportsPage />} />
          <Route path="/dedupe" element={<DedupePage />} />
          <Route path="/contacts/:id" element={<ContactDetailPage />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
