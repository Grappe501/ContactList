import React, { useState } from "react";
import { apiPost } from "../../lib/api";

type Preview = {
  card_count: number;
  sample_cards: any[];
  mapping_note: string;
};

export default function ImportWizardVcard() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceLabel, setSourceLabel] = useState("vCard Import");
  const [donorName, setDonorName] = useState<string>("");
  const [donorOrg, setDonorOrg] = useState<string>("");
  const [preview, setPreview] = useState<Preview | null>(null);
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
    const res = await apiPost<Preview>("/imports/vcard/preview", {
      file_name: file.name,
      vcard_base64: b64,
      source_label: sourceLabel,
    });
    setPreview(res);
    setStatus("Preview ready.");
  }

  async function doCommit() {
    if (!file) return;
    setStatus("Committing…");
    const b64 = await readFileAsBase64(file);
    const res = await apiPost<any>("/imports/vcard/commit", {
      file_name: file.name,
      vcard_base64: b64,
      source_type: "vcard",
      source_label: sourceLabel,
      donor_name: donorName || null,
      donor_org: donorOrg || null,
      operator_label: "dashboard",
      defaults: { country: "USA" },
    });
    setStatus(`Committed: batch ${res.batch_id} (${res.processed_count}/${res.record_count})`);
  }

  return (
    <section style={{ border: "1px solid #ddd", padding: 12 }}>
      <h3>vCard Import</h3>

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

        <input type="file" accept=".vcf,text/vcard,text/x-vcard" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={!file} onClick={doPreview}>Preview</button>
          <button disabled={!file} onClick={doCommit}>Commit Import</button>
          <span style={{ color: "#666" }}>{status}</span>
        </div>
      </div>

      {preview ? (
        <div style={{ marginTop: 12 }}>
          <h4>Preview</h4>
          <p style={{ color: "#666" }}>{preview.mapping_note}</p>
          <p>Cards: {preview.card_count}</p>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(preview.sample_cards, null, 2)}</pre>
        </div>
      ) : null}
    </section>
  );
}
