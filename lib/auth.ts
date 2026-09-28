import { supabase } from "./supabase";

export type UserRole = "ard" | "rd" | "secretariat";

export type Profile = {
  id: string;
  full_name: string | null;
  role: UserRole;
};

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function sendPasswordReset(email: string) {
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error || !data) return null;
  return data as Profile;
}

export function roleHome(role: UserRole): string {
  if (role === "ard") return "/ard";
  if (role === "rd") return "/rd";
  return "/sec";
}

export const ROLE_LABEL: Record<UserRole, string> = {
  ard: "ARD",
  rd: "RD",
  secretariat: "Secretariat",
};