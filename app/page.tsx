"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { getCurrentProfile, roleHome } from "../lib/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const profile = await getCurrentProfile();
      router.replace(profile ? roleHome(profile.role) : "/login");
    })();
  }, [router]);

  return null;
}