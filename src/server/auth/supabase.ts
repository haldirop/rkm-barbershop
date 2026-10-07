import "server-only";
import { cookies } from "next/headers";
import { supabaseConfig } from "@/server/config";
import { createSupabaseAdminClient, createSupabaseAuthClient } from "./supabase-client";

/** Supabase client for the current request; reads and (where allowed) writes the session cookies. */
export async function supabaseServer() {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase is niet geconfigureerd (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY).");
  const store = await cookies();
  return createSupabaseAuthClient(config, {
    getAll: () => store.getAll(),
    setAll: (list) => {
      try {
        for (const { name, value, options } of list) store.set(name, value, options);
      } catch {
        // Server Components cannot set cookies; proxy.ts refreshes the session instead.
      }
    },
  });
}

/** Admin client (secret key). Null when SUPABASE_SECRET_KEY is not configured. */
export function supabaseAdmin() {
  const config = supabaseConfig();
  return config ? createSupabaseAdminClient(config) : null;
}
