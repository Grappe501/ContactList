import type { HandlerEvent } from "@netlify/functions";
import { ApiError } from "../shared/errors";
import { signState, verifyState } from "../shared/state";
import { googlePeopleService, googleAuthUrl, exchangeCodeForTokens } from "../services/googlePeopleService";
import { requireEnv } from "../shared/env";

function query(event: HandlerEvent): URLSearchParams {
  return new URLSearchParams(event.rawQuery ?? "");
}

export async function googleStatus(_event: HandlerEvent) {
  return { status: 200, body: await googlePeopleService.status() };
}

export async function googleStart(_event: HandlerEvent) {
  const state = signState({ provider: "google" });
  const url = googleAuthUrl(state);
  return { status: 200, body: { auth_url: url } };
}

export async function googleCallback(event: HandlerEvent) {
  const sp = query(event);
  const code = sp.get("code");
  const state = sp.get("state");
  const err = sp.get("error");

  if (err) throw new ApiError(400, "UPSTREAM", `Google OAuth error: ${err}`);
  if (!code || !state) throw new ApiError(400, "VALIDATION_ERROR", "Missing code/state");

  try {
    verifyState(state);
  } catch (e: any) {
    throw new ApiError(400, "VALIDATION_ERROR", `Invalid state: ${String(e?.message ?? e)}`);
  }

  const tokens = await exchangeCodeForTokens(code);
  await googlePeopleService.saveTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    scope: tokens.scope,
  });

  const base = requireEnv("APP_BASE_URL").replace(/\/$/, "");
  return { status: 200, body: { connected: true, redirect_url: `${base}/#/imports` } };
}

export async function googleSync(event: HandlerEvent) {
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");
  const body = JSON.parse(event.body);
  if (!body?.source_label) throw new ApiError(400, "VALIDATION_ERROR", "source_label required");

  const out = await googlePeopleService.sync({
    source_label: body.source_label,
    donor_name: body.donor_name ?? null,
    donor_org: body.donor_org ?? null,
    operator_label: body.operator_label ?? "dashboard",
  });
  return { status: 200, body: out };
}
