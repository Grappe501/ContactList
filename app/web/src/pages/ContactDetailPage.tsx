import React from "react";
import { useParams } from "react-router-dom";

export default function ContactDetailPage() {
  const { id } = useParams();
  return (
    <div>
      <h2>Contact Detail</h2>
      <p>Stub page. Contact ID: {id}</p>
      <p>Implemented in later overlays: canonical fields, tags, notes, sources, duplicates, merge.</p>
    </div>
  );
}
