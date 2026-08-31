export const LEAD_QUALITY_OPTIONS = ["Best", "Medium", "Poor"];
export const LEAD_QUALITY_CUSTOM = "Custom";

// Leads good enough to actively pursue — tracked on the /good_leads route.
export const GOOD_LEAD_QUALITIES = ["Best", "Medium"];

export const STATUS_OPTIONS = [
  "New",
  "First Message Sent",
  "Info Given",
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
