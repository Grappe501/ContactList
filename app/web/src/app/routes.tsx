import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ContactsPage from "../pages/ContactsPage";
import ContactDetailPage from "../pages/ContactDetailPage";
import ImportsPage from "../pages/ImportsPage";
import TagsPage from "../pages/TagsPage";
import ActivityPage from "../pages/ActivityPage";
import SettingsPage from "../pages/SettingsPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/contacts" replace />} />
      <Route path="/contacts" element={<ContactsPage />} />
      <Route path="/contacts/:id" element={<ContactDetailPage />} />
      <Route path="/imports" element={<ImportsPage />} />
      <Route path="/tags" element={<TagsPage />} />
      <Route path="/activity" element={<ActivityPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<div>Not found</div>} />
    </Routes>
  );
}
