import React from "react";
import ImportWizardCsv from "../components/import/ImportWizardCsv";
import ImportWizardVcard from "../components/import/ImportWizardVcard";
import ImportGoogle from "../components/import/ImportGoogle";

export default function ImportsPage() {
  return (
    <div>
      <h2>Imports</h2>
      <p>Import from CSV, vCard, or Google. Each import stores provenance (WHERE it came from).</p>
      <div style={{ display: "grid", gap: 16 }}>
        <ImportWizardCsv />
        <ImportWizardVcard />
        <ImportGoogle />
      </div>
    </div>
  );
}
