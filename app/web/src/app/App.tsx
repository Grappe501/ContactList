import React from "react";
import { Link } from "react-router-dom";
import Routes from "./routes";

export default function App() {
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
      </header>
      <main style={{ marginTop: 16 }}>
        <Routes />
      </main>
    </div>
  );
}
