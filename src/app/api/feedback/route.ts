import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      service_request_id,
      rating,
      timeliness_rating,
      quality_rating,
      comments,
      would_recommend,
    } = body;

    if (!service_request_id || !rating) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("customer_feedback")
      .insert([
        {
          service_request_id,
          rating,
          timeliness_rating,
          quality_rating,
          comments,
          would_recommend,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error inserting feedback:", error);
      return NextResponse.json(
        { error: "Failed to submit feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error("Feedback submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
