import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsContent } from "@/components/auth/SettingsContent";

export default async function KanbanSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const userInfo = {
    name: (user.user_metadata?.full_name as string) ?? user.email ?? "",
    email: user.email ?? "",
  };

  return <SettingsContent user={userInfo} />;
}
