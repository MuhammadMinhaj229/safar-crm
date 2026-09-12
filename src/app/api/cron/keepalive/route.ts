import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const renderUrl = "https://safar-social.onrender.com"; // The Postiz URL to ping
    const res = await fetch(renderUrl);
    
    if (res.ok) {
      return NextResponse.json({ success: true, message: "Pinged Render successfully" });
    } else {
      return NextResponse.json({ success: false, status: res.status }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
