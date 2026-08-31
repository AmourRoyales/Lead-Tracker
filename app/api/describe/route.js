import { NextResponse } from "next/server";
import { describeLead } from "@/lib/gemini";
import { todayIST } from "@/lib/date";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text, imageBase64, mimeType } = body || {};
  if (!text && !imageBase64) {
    return NextResponse.json(
      { error: "Provide pasted text or a screenshot" },
      { status: 400 }
    );
  }

  try {
    const result = await describeLead({
      text,
      imageBase64,
      mimeType,
      todayISO: todayIST(),
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
