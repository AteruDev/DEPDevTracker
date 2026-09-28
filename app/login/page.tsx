"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { signIn, signOut, sendPasswordReset, getCurrentProfile, roleHome } from "../../lib/auth";
import AuthShell from "../../components/auth/AuthShell";
import {
  TextField,
  PasswordField,
  PrimaryButton,
  TextButton,
  ErrorNote,
  SuccessNote,
} from "../../components/auth/AuthFields";

const NO_PROFILE_MESSAGE =
  "We couldn't load your account, so you've been signed out. Try signing in again. If it keeps happening, ask the Secretariat to check that your account has a role assigned.";

function friendlyAuthMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid")) return "That email and password don't match. Check both and try again.";
  if (m.includes("not confirmed")) return "This account isn't confirmed yet. Ask the Secretariat to confirm it.";
  if (m.includes("fetch") || m.includes("network")) {
    return "Can't reach the server. Check your connection and try again.";
  }
  if (m.includes("rate") || m.includes("too many")) return "Too many attempts. Wait a minute, then try again.";
  return "We couldn't sign you in. Try again, and contact the Secretariat if it keeps happening.";
}

function Heading({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return (
    <>
      <p className="text-[15px] text-[#5B6472]">{kicker}</p>
      <h1 className="font-display mt-2 text-[34px] font-semibold leading-[1.08] tracking-[-0.01em] text-[#0C2D5C] md:text-[40px]">
        {title}
      </h1>
      <p className="mt-3 max-w-[32ch] text-base leading-relaxed text-[#4A5568]">{children}</p>
    </>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [checkingSession, setCheckingSession] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [capsOn, setCapsOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState(false);
  const [loading, setLoading] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // If already signed in, skip the login screen entirely.
  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (active) setCheckingSession(false);
        return;
      }

      const profile = await getCurrentProfile();
      if (!active) return;

      if (profile) {
        router.replace(roleHome(profile.role));
        return;
      }

      // Signed in but no usable profile. Sending them onward would bounce
      // straight back here, so sign out and say why.
      await signOut();
      if (!active) return;
      setError(NO_PROFILE_MESSAGE);
      setCheckingSession(false);
    })();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setFieldError(false);

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      setFieldError(true);
      return;
    }

    setLoading(true);
    const { error: signInError } = await signIn(email.trim(), password);

    if (signInError) {
      setLoading(false);
      const message = friendlyAuthMessage(signInError.message);
      setError(message);
      setFieldError(signInError.message.toLowerCase().includes("invalid"));
      return;
    }

    const profile = await getCurrentProfile();
    if (!profile) {
      await signOut();
      setLoading(false);
      setError(NO_PROFILE_MESSAGE);
      return;
    }

    // Stay in the loading state until the navigation completes.
    router.replace(roleHome(profile.role));
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (resetLoading) return;
    setResetError(null);

    if (!resetEmail.trim()) {
      setResetError("Enter the email address for your account.");
      return;
    }

    setResetLoading(true);
    const { error: resetRequestError } = await sendPasswordReset(resetEmail.trim());
    setResetLoading(false);

    // Only surface failures that aren't about whether the account exists,
    // so this form can't be used to check who has an account.
    if (resetRequestError) {
      const m = resetRequestError.message.toLowerCase();
      if (m.includes("fetch") || m.includes("network")) {
        setResetError("Can't reach the server. Check your connection and try again.");
        return;
      }
      if (m.includes("rate") || m.includes("too many") || m.includes("seconds")) {
        setResetError("A reset link was requested a moment ago. Wait a few minutes before asking for another.");
        return;
      }
    }
    setResetSent(true);
  }

  function openReset() {
    setResetEmail(email);
    setResetSent(false);
    setResetError(null);
    setMode("reset");
  }

  function backToSignIn() {
    setError(null);
    setFieldError(false);
    setMode("signin");
  }

  return (
    <AuthShell>
      {!checkingSession &&
        (mode === "signin" ? (
          <>
            <Heading kicker="Regional Development Council, Negros Island Region" title="Document Tracker">
              Follow every outgoing document from draft to transmittal.
            </Heading>

            <form onSubmit={handleSubmit} noValidate className="mt-9 space-y-5">
              <TextField
                label="Email"
                type="email"
                name="email"
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                placeholder="name@depdev.gov.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                invalid={fieldError}
              />

              <PasswordField
                label="Password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => setCapsOn(e.getModifierState("CapsLock"))}
                onKeyUp={(e) => setCapsOn(e.getModifierState("CapsLock"))}
                onBlur={() => setCapsOn(false)}
                invalid={fieldError}
                hint={capsOn ? <p className="mt-1.5 text-[13px] text-[#8A5A00]">Caps Lock is on.</p> : null}
              />

              {error && <ErrorNote>{error}</ErrorNote>}

              <PrimaryButton type="submit" loading={loading} loadingLabel="Signing in…">
                Sign in
              </PrimaryButton>
            </form>

            <div className="mt-5">
              <TextButton onClick={openReset}>Forgot your password?</TextButton>
            </div>

            <p className="mt-10 border-t border-[#E4E1D8] pt-5 text-[13px] leading-relaxed text-[#5B6472]">
              For RDC-NIR staff. Accounts are issued by the Secretariat — if you need access, ask them.
            </p>
          </>
        ) : (
          <>
            <Heading kicker="Document Tracker" title="Reset your password">
              Enter your account email and we&apos;ll send a link to choose a new password.
            </Heading>

            {resetSent ? (
              <div className="mt-9 space-y-6">
                <SuccessNote>
                  If an account exists for {resetEmail.trim()}, a reset link is on its way. It can take a
                  few minutes to arrive.
                </SuccessNote>
                <TextButton onClick={backToSignIn}>Back to sign in</TextButton>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} noValidate className="mt-9 space-y-5">
                <TextField
                  label="Email"
                  type="email"
                  name="email"
                  autoComplete="username"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus
                  placeholder="name@depdev.gov.ph"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />

                {resetError && <ErrorNote>{resetError}</ErrorNote>}

                <PrimaryButton type="submit" loading={resetLoading} loadingLabel="Sending…">
                  Send reset link
                </PrimaryButton>

                <div>
                  <TextButton onClick={backToSignIn}>Back to sign in</TextButton>
                </div>
              </form>
            )}
          </>
        ))}
    </AuthShell>
  );
}