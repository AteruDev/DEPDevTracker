import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Mirrors the fields on the "New Document" form. Keep this in sync with
// components/tracker/DocumentModal.tsx's DocForm type.
const responseSchema = {
  type: "object",
  properties: {
    document_no: { type: "string", nullable: true },
    category: { type: "string", nullable: true },
    email_subject: { type: "string", nullable: true },
    recipients: { type: "string", nullable: true },
    sector_division: { type: "string", nullable: true },
    drafted_by: { type: "string", nullable: true },
    email_address: { type: "string", nullable: true },
    remarks: { type: "string", nullable: true },
  },
};

const PROMPT = `You are reading a scanned or digital government office memo/letter for the
Regional Development Council. Extract the following fields if present in the document.
If a field genuinely isn't in the document, return null for it rather than guessing.

- document_no: the document/reference number (e.g. "RDC-NIR-2026-09-155")
- category: one of "Letter", "Memo", "Resolution", or "Other" based on the document type
- email_subject: the subject line or the main title/subject of the letter
- recipients: who the document is addressed to (names/offices)
- sector_division: the sector or division that authored it, if stated
- drafted_by: the name of the person who drafted or signed it
- email_address: any email address mentioned for the recipient or sender
- remarks: any handwritten notes, annotations, or special instructions visible on the document

Return only the JSON object matching the schema — no extra commentary.`;

const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const ALLOWED_ROLES = ["secretariat"]; // only roles that can use "Scan Document"

// Confirms the caller is a signed-in user with an allowed role. The browser sends
// its Supabase access token in the Authorization header; Supabase validates it.
async function authorize(req: NextRequest): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const deny = (status: number, error: string) => ({
    ok: false as const,
    res: NextResponse.json({ error }, { status }),
  });

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return deny(401, "Please sign in to scan documents.");

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) return deny(401, "Your session has expired. Please sign in again.");

  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    return deny(403, "Your account isn't allowed to scan documents.");
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorize(req);
    if (!auth.ok) return auth.res;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
    }

    const MAX_BYTES = 15 * 1024 * 1024; // 15MB — comfortable for a scanned letter/memo
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Please upload something under 15MB." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF, PNG, JPG or WEBP." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: file.type || "application/pdf", data: base64 } },
            { text: PROMPT },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json(
        { error: "The model didn't return any extracted data." },
        { status: 502 }
      );
    }

    const extracted = JSON.parse(text);

    // The scanned file is NOT stored. Attachments are links pasted by the user.
    return NextResponse.json({ extracted });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("Document extraction failed:", err);
    return NextResponse.json(
      { error: err?.message || "Extraction failed. Please try again or enter details manually." },
      { status: 500 }
    );
  }
}