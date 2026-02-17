import { supabase } from "./supabaseClient";

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
