import { NextResponse } from "next/server";
import { findByIdentified } from "@/lib/leads";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const identified = searchParams.get("identified") || "";
  try {
    const leads = await findByIdentified(identified);
    return NextResponse.json({ leads });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
