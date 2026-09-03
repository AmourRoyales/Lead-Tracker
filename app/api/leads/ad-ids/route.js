import { NextResponse } from "next/server";
import { listAdIds } from "@/lib/leads";

export async function GET() {
  try {
    const adIds = await listAdIds();
    return NextResponse.json({ adIds });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
