import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// This is a PUBLIC endpoint — no user auth required.
// It is called from the public-facing website (safar-rouge.vercel.app).
// We use the service role key so we can insert leads without a logged-in user.
// The account_id is resolved from the SAFAR_ACCOUNT_ID env variable
// (set once in Vercel to the owner's Supabase account UUID).

export async function POST(request: Request) {
  try {
    // CORS preflight is handled by Next.js OPTIONS; actual requests
    // from the static site need CORS headers on the response.
    const origin = request.headers.get("origin") ?? "*";

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const body = await request.json();
    const { name, phone, email, service_interest, source = "website" } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required." },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      );
    }

    const accountId = process.env.SAFAR_ACCOUNT_ID;
    if (!accountId) {
      console.error("SAFAR_ACCOUNT_ID env var is not set.");
      return NextResponse.json(
        { error: "Server configuration error." },
        {
          status: 500,
          headers: { "Access-Control-Allow-Origin": origin },
        }
      );
    }

    const { error } = await supabase.from("leads").insert([
      {
        account_id: accountId,
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() ?? null,
        service_interest: service_interest?.trim() ?? null,
        source,
        status: "new",
      },
    ]);

    if (error) {
      console.error("Lead insert error:", error);
      return NextResponse.json(
        { error: "Failed to save lead." },
        {
          status: 500,
          headers: { "Access-Control-Allow-Origin": origin },
        }
      );
    }

    return NextResponse.json(
      { success: true, message: "Thank you! We'll be in touch soon." },
      {
        status: 201,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (err) {
    console.error("Public lead API error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// Handle CORS preflight requests from the static website
export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin") ?? "*";
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
