import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getCorsHeaders(origin: string = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin") || "*";
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin") || "*";
  const headers = getCorsHeaders(origin);

  try {
    const body = await req.json();
    const { name, rating, comments } = body;

    if (!name || !rating) {
      return NextResponse.json(
        { error: "Name and rating are required." },
        { status: 400, headers }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Configuration error: Missing environment variables." },
        { status: 500, headers }
      );
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Resolve SAFAR account ID
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id, owner_user_id")
      .limit(1);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: "Configuration error: No account found." },
        { status: 500, headers }
      );
    }

    const accountId = accounts[0].id;

    // 2. Insert Feedback
    const { data: feedbackData, error: feedbackError } = await supabase
      .from("customer_feedback")
      .insert({
        account_id: accountId,
        customer_name: name.trim(),
        rating: parseInt(rating, 10),
        comments: comments ? comments.trim() : null,
        status: "pending",
        is_public: false
      })
      .select("id")
      .single();

    if (feedbackError) {
      console.error("Feedback Insert Error:", feedbackError);
      return NextResponse.json(
        { error: "Failed to save feedback." },
        { status: 500, headers }
      );
    }

    return NextResponse.json(
      { success: true, feedback_id: feedbackData.id },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Feedback processing error:", error);
    return NextResponse.json(
      { error: "Internal server error processing feedback." },
      { status: 500, headers }
    );
  }
}
