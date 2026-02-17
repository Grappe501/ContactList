export type VCard = {
  fn?: string;
  n?: { last?: string; first?: string; middle?: string; prefix?: string; suffix?: string };
  emails: string[];
  tels: string[];
  org?: string;
  title?: string;
  url?: string;
  bday?: string;
  adr?: { street?: string; city?: string; region?: string; postal?: string; country?: string };
  note?: string;
  raw_lines: string[];
};

function unfoldLines(text: string): string[] {
  // vCard line unfolding: lines beginning with space or tab are continuations
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out.filter((l) => l.trim().length > 0);
}

function parseProp(line: string): { name: string; value: string } | null {
  const idx = line.indexOf(":");
  if (idx < 0) return null;
  const left = line.slice(0, idx);
  const value = line.slice(idx + 1).trim();
  const name = left.split(";")[0].trim().toUpperCase();
  return { name, value };
}

function splitN(value: string) {
  const parts = value.split(";");
  return {
    last: parts[0] || undefined,
    first: parts[1] || undefined,
    middle: parts[2] || undefined,
    prefix: parts[3] || undefined,
    suffix: parts[4] || undefined,
  };
}

function parseADR(value: string) {
  // ADR: POBOX;EXT;STREET;LOCALITY;REGION;POSTAL;COUNTRY
  const parts = value.split(";");
  return {
    street: parts[2] || undefined,
    city: parts[3] || undefined,
    region: parts[4] || undefined,
    postal: parts[5] || undefined,
    country: parts[6] || undefined,
  };
}

export function parseVcards(input: string): VCard[] {
  const lines = unfoldLines(input);
  const cards: VCard[] = [];
  let cur: string[] = [];
  for (const line of lines) {
    const upper = line.trim().toUpperCase();
    if (upper === "BEGIN:VCARD") {
      cur = [line];
      continue;
    }
    if (upper === "END:VCARD") {
      cur.push(line);
      cards.push(parseSingleCard(cur));
      cur = [];
      continue;
    }
    if (cur.length) cur.push(line);
  }
  // If file omitted END:VCARD (rare), ignore trailing.
  return cards;
}

function parseSingleCard(lines: string[]): VCard {
  const c: VCard = { emails: [], tels: [], raw_lines: lines };
  for (const line of lines) {
    const prop = parseProp(line);
    if (!prop) continue;
    const { name, value } = prop;
    switch (name) {
      case "FN":
        c.fn = value;
        break;
      case "N":
        c.n = splitN(value);
        break;
      case "EMAIL":
        if (value) c.emails.push(value);
        break;
      case "TEL":
        if (value) c.tels.push(value);
        break;
      case "ORG":
        c.org = value.replace(/\\,/g, ",");
        break;
      case "TITLE":
        c.title = value;
        break;
      case "URL":
        c.url = value;
        break;
      case "BDAY":
        c.bday = value;
        break;
      case "ADR":
        c.adr = parseADR(value);
        break;
      case "NOTE":
        c.note = value;
        break;
      default:
        break;
    }
  }
  return c;
}

export function decodeBase64ToUtf8(b64: string): string {
  return Buffer.from(b64, "base64").toString("utf8");
}
