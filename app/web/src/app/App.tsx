import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import LoginPage from "../pages/LoginPage";
import Routes from "./routes";
import { Link } from "react-router-dom";

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <div style={{ padding: 40 }}>Checking authentication…</div>;

  if (!session) {
    return <LoginPage />;
  }

  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <strong>ContactList</strong>
        <nav style={{ display: "flex", gap: 10 }}>
          <Link to="/contacts">Contacts</Link>
          <Link to="/imports">Imports</Link>
          <Link to="/tags">Tags</Link>
          <Link to="/activity">Activity</Link>
          <Link to="/settings">Settings</Link>
        </nav>
        <button
          style={{ marginLeft: "auto" }}
          onClick={() => supabase.auth.signOut()}
        >
          Sign out
        </button>
      </header>
      <main style={{ marginTop: 16 }}>
        <Routes />
      </main>
    </div>
  );
}
