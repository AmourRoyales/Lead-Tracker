import { NextResponse } from "next/server";
import { createLead, listLeads } from "@/lib/leads";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filters = {
    status: searchParams.get("status") || undefined,
    conversationStage: searchParams.get("conversationStage") || undefined,
    leadQuality: searchParams.get("leadQuality") || undefined,
    qualities: searchParams.get("qualities") || undefined,
    product: searchParams.get("product") || undefined,
    platform: searchParams.get("platform") || undefined,
    naturalOnly: searchParams.get("naturalOnly") || undefined,
    noQuote: searchParams.get("noQuote") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    search: searchParams.get("search") || undefined,
  };
  try {
    const leads = await listLeads(filters);
    return NextResponse.json({ leads });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.identified || !body.identified.trim()) {
    return NextResponse.json({ error: "Identified is required" }, { status: 400 });
  }
  if (!body.platform) {
    return NextResponse.json({ error: "Platform is required" }, { status: 400 });
  }
  if (!body.leadDate) {
    return NextResponse.json({ error: "Lead date is required" }, { status: 400 });
  }
  if (!body.leadQuality) {
    return NextResponse.json({ error: "Lead quality is required" }, { status: 400 });
  }
  if (!body.product) {
    return NextResponse.json({ error: "Product is required" }, { status: 400 });
  }

  try {
    const lead = await createLead(body);
    return NextResponse.json({ lead }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
