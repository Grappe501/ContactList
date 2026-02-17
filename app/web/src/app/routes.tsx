import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ContactsPage from "../pages/ContactsPage";
import ContactDetailPage from "../pages/ContactDetailPage";
import ImportsPage from "../pages/ImportsPage";
import TagsPage from "../pages/TagsPage";
import ActivityPage from "../pages/ActivityPage";
import SettingsPage from "../pages/SettingsPage";
import LoginPage from "../pages/LoginPage";
import RequireAuth from "./RequireAuth";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/contacts" replace />} />

      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
      <Route
        path="/contacts"
        element={
          <RequireAuth>
            <ContactsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/contacts/:id"
        element={
          <RequireAuth>
            <ContactDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/imports"
        element={
          <RequireAuth>
            <ImportsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/tags"
        element={
          <RequireAuth>
            <TagsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/activity"
        element={
          <RequireAuth>
            <ActivityPage />
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        }
      />

      <Route path="*" element={<div>Not found</div>} />
    </Routes>
  );
}
