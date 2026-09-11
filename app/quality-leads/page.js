"use client";

import StagePage from "@/components/StagePage";
import { CLOSED_FOR_NOW_STATUS, QUALITY_LEADS_STAGE } from "@/lib/constants";

export default function QualityLeadsPage() {
  return (
    <StagePage
      stage={QUALITY_LEADS_STAGE}
      title="Quality Leads"
      description="A real structured back-and-forth — automatic message, our reply, lead replied, we replied, and the lead asked or said something else again. Leads set to “Closed for now” are hidden here."
      excludeStatus={CLOSED_FOR_NOW_STATUS}
    />
  );
}
