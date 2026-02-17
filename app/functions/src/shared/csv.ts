export type CsvParseOptions = {
  delimiter?: string; // default comma
  maxRows?: number; // default unlimited
};

export type CsvTable = {
  rows: string[][];
};

export function parseCsv(input: string, opts?: CsvParseOptions): CsvTable {
  const delimiter = opts?.delimiter ?? ",";
  const maxRows = opts?.maxRows ?? Number.POSITIVE_INFINITY;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Parse CSV with support for:
  // - quoted fields
  // - escaped quotes ("")
  // - commas/newlines inside quoted fields
  // - CRLF and LF line endings
  for (let i = 0; i < input.length; i++) {
    const c = input[i];

    if (inQuotes) {
      if (c === '"') {
        const next = input[i + 1];
        if (next === '"') {
          // escaped quote
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }

    if (c === delimiter) {
      row.push(field);
      field = "";
      continue;
    }

    if (c === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      if (rows.length >= maxRows) break;
      continue;
    }

    if (c === "\r") {
      // Ignore CR; if CRLF, the upcoming \n will close the row.
      continue;
    }

    field += c;
  }

  // Flush last field/row (even if input didn't end with newline)
  row.push(field);
  rows.push(row);

  // Remove trailing empty row if input ended with newline
  if (rows.length > 1) {
    const last = rows[rows.length - 1];
    if (last.length === 1 && last[0] === "" && input.endsWith("\n")) {
      rows.pop();
    }
  }

  return { rows };
}

export function decodeBase64ToUtf8(b64: string): string {
  // Node runtime available in Netlify Functions.
  return Buffer.from(b64, "base64").toString("utf8");
}
