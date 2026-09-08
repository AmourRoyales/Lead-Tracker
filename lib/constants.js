export const LEAD_QUALITY_OPTIONS = ["Best", "Medium", "Poor", "Unqualified"];
export const LEAD_QUALITY_CUSTOM = "Custom";

// Leads good enough to actively pursue — tracked on the /good_leads route.
export const GOOD_LEAD_QUALITIES = ["Best", "Medium"];

export const STATUS_OPTIONS = [
  "New",
  "First Message Sent",
  "Info Given",
  "Ongoing",
  "Quote Pending",
  "Quote Given",
  "Left on Seen",
  "Follow-up Needed",
];

// Extra design/CAD stages only shown for Best/Medium leads, inserted between
// "Info Given" and "Quote Pending".
export const CAD_STATUS_OPTIONS = [
  "Requirements Sharing Pending",
  "Design Reference Shared",
  "Design Thinking In Progress",
  "CAD Design Pending",
  "CAD Design In Progress",
  "CAD Design Done",
];

export const STATUS_CUSTOM = "Custom";

// Statuses that mean "the ball is in our court" — flagged red so they stand
// out as high priority.
export const HIGH_PRIORITY_STATUSES = [
  "Quote Pending",
  "Requirements Sharing Pending",
  "Left on Seen",
];

export function statusOptionsFor(leadQuality) {
  if (GOOD_LEAD_QUALITIES.includes(leadQuality)) {
    return [
      "New",
      "First Message Sent",
      "Info Given",
      "Ongoing",
      ...CAD_STATUS_OPTIONS,
      "Quote Pending",
      "Quote Given",
      "Left on Seen",
      "Follow-up Needed",
    ];
  }
  return STATUS_OPTIONS;
}

export const PRODUCT_OPTIONS = [
  "Loose Diamond",
  "Ring",
  "Bracelet",
  "Earring",
  "Necklace",
];
export const PRODUCT_OTHER = "Other";

export const PLATFORM_OPTIONS = ["Messenger", "Instagram", "WhatsApp"];

export const DESCRIPTION_SOURCES = ["manual", "gemini"];

// Conversation-progress stage — how far the back-and-forth with a lead has
// gone, independent of lead quality/status. Tracked on its own pages
// (/first-message, /second-message, /quality-leads, /interested), not shown
// on the main leads table.
export const CONVERSATION_STAGE_OPTIONS = [
  "First Message",
  "Second Message",
  "Quality Leads",
  "Interested",
];

// Opt-out value — a lead can be left off all four stage pages entirely
// instead of always landing in one of them.
export const CONVERSATION_STAGE_NONE = "Uncategorized";

// Full picker list (what shows in the Add/Edit form and the per-row stage
// dropdown) — the four real stages plus the opt-out choice.
export const CONVERSATION_STAGE_SELECT_OPTIONS = [
  CONVERSATION_STAGE_NONE,
  ...CONVERSATION_STAGE_OPTIONS,
];

export const CONVERSATION_STAGE_ROUTES = {
  "First Message": "/first-message",
  "Second Message": "/second-message",
  "Quality Leads": "/quality-leads",
  "Interested": "/interested",
};
