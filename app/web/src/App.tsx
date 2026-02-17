import React, { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import ContactsPage from "./pages/ContactsPage";
import ContactDetailPage from "./pages/ContactDetailPage";
import ImportsPage from "./pages/ImportsPage";
import DedupePage from "./pages/DedupePage";
import LoginPage from "./pages/LoginPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import { supabase } from "./lib/supabaseClient";
import { signOut } from "./lib/auth";

export default function App() {
  const [authed, setAuthed] = useState<boolean>(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(Boolean(session));
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  if (!authed) return <LoginPage />;

  return (
    <HashRouter>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
        <header style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 20 }}>ContactList</h1>
          <nav style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link to="/">Contacts</Link>
            <Link to="/imports">Imports</Link>
            <Link to="/dedupe">De-dupe</Link>
            <Link to="/admin/users">Admin</Link>
            <button style={{ marginLeft: 10 }} onClick={() => { signOut().then(() => window.location.reload()); }}>
              Sign out
            </button>
          </nav>
        </header>

        <Routes>
          <Route path="/" element={<ContactsPage />} />
          <Route path="/imports" element={<ImportsPage />} />
          <Route path="/dedupe" element={<DedupePage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/contacts/:id" element={<ContactDetailPage />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
