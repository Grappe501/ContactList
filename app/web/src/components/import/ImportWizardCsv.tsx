import React, { useState } from "react";
import { apiPost } from "../../lib/api";

type Preview = {
  headers: string[];
  sample_rows: Record<string, string>[];
  mapping_suggestion: Record<string, string | null>;
  supported_canonical_fields: string[];
  column_profile: Record<string, any>;
  delimiter: string;
  has_header: boolean;
};

const CANON_ORDER = [
  "full_name","first_name","middle_name","last_name","suffix",
  "primary_email","primary_phone","street","street2","city","state","postal_code","country",
  "company","title","organization","website","birthday"
];

export default function ImportWizardCsv() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceLabel, setSourceLabel] = useState("CSV Import");
  const [donorName, setDonorName] = useState<string>("");
  const [donorOrg, setDonorOrg] = useState<string>("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [status, setStatus] = useState<string>("");

  async function readFileAsBase64(f: File): Promise<string> {
    const buf = await f.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  async function doPreview() {
    if (!file) return;
    setStatus("Previewing…");
    const b64 = await readFileAsBase64(file);
    const res = await apiPost<Preview>("/imports/csv/preview", {
      file_name: file.name,
      csv_base64: b64,
      has_header: true,
      delimiter: ",",
      source_label: sourceLabel,
    });
    setPreview(res);
    setMapping(res.mapping_suggestion ?? {});
    setStatus("Preview ready.");
  }

  async function doCommit() {
    if (!file || !preview) return;
    setStatus("Committing…");
    const b64 = await readFileAsBase64(file);
    const res = await apiPost<any>("/imports/csv/commit", {
      file_name: file.name,
      csv_base64: b64,
      has_header: true,
      delimiter: preview.delimiter,
      source_type: "csv",
      source_label: sourceLabel,
      donor_name: donorName || null,
      donor_org: donorOrg || null,
      operator_label: "dashboard",
      mapping,
      defaults: { country: "USA" },
    });
    setStatus(`Committed: batch ${res.batch_id} (${res.processed_count}/${res.record_count})`);
  }

  return (
    <section style={{ border: "1px solid #ddd", padding: 12 }}>
      <h3>CSV Import</h3>

      <div style={{ display: "grid", gap: 8 }}>
        <label>
          Source label (WHERE it came from):
          <input value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} />
        </label>
        <label>
          Donated contacts from (name):
          <input value={donorName} onChange={(e) => setDonorName(e.target.value)} />
        </label>
        <label>
          Donated contacts from (org):
          <input value={donorOrg} onChange={(e) => setDonorOrg(e.target.value)} />
        </label>

        <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={!file} onClick={doPreview}>Preview</button>
          <button disabled={!file || !preview} onClick={doCommit}>Commit Import</button>
          <span style={{ color: "#666" }}>{status}</span>
        </div>
      </div>

      {preview ? (
        <div style={{ marginTop: 12 }}>
          <h4>Mapping</h4>
          <p style={{ color: "#666" }}>
            Choose which CSV column maps to each canonical field. Unmapped columns will be saved to metadata.custom_fields.
          </p>
          <div style={{ display: "grid", gap: 6 }}>
            {CANON_ORDER.map((field) => (
              <label key={field} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ width: 150 }}>{field}</span>
                <select
                  value={mapping[field] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value || null }))}
                >
                  <option value="">(ignore)</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <h4 style={{ marginTop: 12 }}>Sample Rows</h4>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(preview.sample_rows.slice(0, 5), null, 2)}</pre>
        </div>
      ) : null}
    </section>
  );
}
