import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Resolve the authenticated user's id for use in the data layer.
 *
 * Auth is resolved only at the entry boundary (Server Actions and Server
 * Component pages); the id is then passed explicitly into services and the DAL,
 * which stay auth-agnostic.
 *
 * If there is no session, this redirects to the login page. `redirect()` throws
 * a `NEXT_REDIRECT` control-flow error and never returns — do NOT wrap calls to
 * this in a broad try/catch that would swallow it.
 */
export async function getCurrentUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return user.id;
}
