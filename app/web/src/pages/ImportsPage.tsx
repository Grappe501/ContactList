import React from "react";
import ImportWizardCsv from "../components/import/ImportWizardCsv";
import ImportWizardVcard from "../components/import/ImportWizardVcard";
import ImportGoogle from "../components/import/ImportGoogle";

export default function ImportsPage() {
  return (
    <div>
      <h2>Imports</h2>
      <p>Stub wizards. Implemented in later overlays.</p>
      <div style={{ display: "grid", gap: 16 }}>
        <ImportWizardCsv />
        <ImportWizardVcard />
        <ImportGoogle />
      </div>
    </div>
  );
}
