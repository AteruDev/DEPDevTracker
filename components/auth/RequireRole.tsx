"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getCurrentProfile, Profile, UserRole, roleHome } from "../../lib/auth";

export default function RequireRole({
  allow,
  children,
}: {
  allow: UserRole[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ok" | "denied">("checking");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const p = await getCurrentProfile();
      if (!active) return;

      if (!p || !allow.includes(p.role)) {
        setProfile(p);
        setStatus("denied");
        return;
      }

      setProfile(p);
      setStatus("ok");
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] text-[#6B6A63] text-sm">
        Checking access…
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6 bg-[#F8F9FA]">
        <p className="text-[#7A1219] font-medium">You don&apos;t have access to this page.</p>
        <button
          onClick={() => router.replace(profile ? roleHome(profile.role) : "/login")}
          className="text-[#0C2D5C] hover:underline text-sm"
        >
          Go to your dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}