import React from "react";
import type { SetURLSearchParams } from "react-router-dom";

export default function FilterPanel(props: {
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
}) {
  const q = props.searchParams.get("q") ?? "";
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
      <input
        placeholder="Search"
        value={q}
        onChange={(e) => {
          const next = new URLSearchParams(props.searchParams);
          if (e.target.value) next.set("q", e.target.value);
          else next.delete("q");
          props.setSearchParams(next);
        }}
      />
      <span style={{ color: "#666" }}>More filters added in later overlays.</span>
    </div>
  );
}
