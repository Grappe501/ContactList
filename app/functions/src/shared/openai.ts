import { requireEnv, optionalEnv } from "./env";
import { ApiError } from "./errors";

type ResponsesCreatePayload = {
  model: string;
  input: any;
  temperature?: number;
  response_format?: any;
};

export type OpenAIJsonResult<T> = { data: T; raw_text?: string; model: string };

function baseUrl(): string {
  return (optionalEnv("OPENAI_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/$/, "");
}

function apiKey(): string {
  return requireEnv("OPENAI_API_KEY");
}

async function postJson(path: string, payload: any): Promise<any> {
  const resp = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new ApiError(502, "UPSTREAM", `OpenAI error: ${resp.status} ${t}`);
  }

  return await resp.json();
}

/**
 * Call OpenAI Responses API and force JSON-schema output.
 * We parse the best available output text and then JSON.parse it.
 */
export async function openaiJson<T>(opts: {
  model: string;
  system: string;
  user: string;
  json_schema: { name: string; schema: any; strict?: boolean };
  temperature?: number;
}): Promise<OpenAIJsonResult<T>> {
  const payload: ResponsesCreatePayload = {
    model: opts.model,
    input: [
      { role: "system", content: [{ type: "text", text: opts.system }] },
      { role: "user", content: [{ type: "text", text: opts.user }] },
    ],
    temperature: opts.temperature ?? 0.2,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: opts.json_schema.name,
        schema: opts.json_schema.schema,
        strict: opts.json_schema.strict ?? true,
      },
    },
  };

  const data: any = await postJson("/responses", payload);

  // Best-effort extract output text across common Responses API shapes
  const outText: any =
    data?.output?.[0]?.content?.find((c: any) => c?.type === "output_text")?.text ??
    data?.output_text ??
    data?.choices?.[0]?.message?.content ??
    "";

  let parsed: any = null;
  try {
    parsed = typeof outText === "string" ? JSON.parse(outText) : outText;
  } catch {
    parsed = outText;
  }

  return { data: parsed as T, raw_text: typeof outText === "string" ? outText : JSON.stringify(outText), model: opts.model };
}
