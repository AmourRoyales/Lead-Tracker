import { GoogleGenAI, Type } from "@google/genai";
import { PRODUCT_OPTIONS, STATUS_OPTIONS } from "./constants";

const MODEL = "gemini-3.5-flash-lite";

let client;
function getClient() {
  if (!client) {
    // Locally, auth comes from `gcloud auth application-default login` (ADC).
    // On a non-GCP host there's no ADC to find, so GOOGLE_APPLICATION_CREDENTIALS_JSON
    // (the full service account key JSON, as one env var) is used instead.
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    client = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION || "global",
      ...(credentialsJson && {
        googleAuthOptions: { credentials: JSON.parse(credentialsJson) },
      }),
    });
  }
  return client;
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    description: {
      type: Type.STRING,
      description:
        "A concise summary (2-5 sentences) of what the LEAD (the customer) is asking for or interested in — product, specs, budget hints, concerns, and any commitments already made to them. Do not restate our own boilerplate greeting/sales pitch.",
    },
    suggestedDate: {
      type: Type.STRING,
      nullable: true,
      description:
        "The date the lead's FIRST message in this conversation was sent, as YYYY-MM-DD, resolved using the reference 'today' date given in the prompt. Null if it truly cannot be determined.",
    },
    suggestedIdentified: {
      type: Type.STRING,
      nullable: true,
      description:
        "The lead's name, username, or handle as shown in the conversation (not our own business name). Null if not visible.",
    },
    suggestedProduct: {
      type: Type.STRING,
      enum: PRODUCT_OPTIONS,
      nullable: true,
      description:
        "Which product category the lead is asking about, chosen from the enum. Null if it doesn't clearly match one of these categories or can't be determined.",
    },
    suggestedIsNatural: {
      type: Type.BOOLEAN,
      nullable: true,
      description:
        "true if the lead explicitly asks about a NATURAL diamond; false if they explicitly ask about lab-grown; null if not mentioned or unclear. Do not guess — this business sells both.",
    },
    suggestedStatus: {
      type: Type.STRING,
      enum: STATUS_OPTIONS,
      nullable: true,
      description:
        `The current stage of this conversation — base this on how it stands at the END, not just anything that happened earlier. Check these rules IN ORDER and use the first one that matches: ` +
        `(1) "Quote Pending" — the lead has asked for a price/quote, or shared requirements (size, carat, metal, etc.) expecting one, and we have NOT yet given a specific number. This applies even if OUR most recent message says something like "let me check and share the quote" or "let me confirm and get back to you" — a promise to send a price is still a price we owe, not something the lead needs to follow up on. ` +
        `(2) "Left on Seen" — our latest message to the lead shows a visible "Seen"/"Read"/blue-checkmark indicator (common in WhatsApp/Instagram/Messenger screenshots) but the lead has not sent any reply since. ` +
        `(3) "Follow-up Needed" — after we gave a price or info, the LEAD (not us) went quiet/stopped responding with no visible seen/read indicator either way, so WE need to check back in with THEM. ` +
        `(4) "Quote Given" — our side HAS given a specific price/number, and the lead has replied since or the conversation doesn't show them going quiet. ` +
        `(5) "Info Given" — our side shared product details/specs, but no price was asked for or given yet. ` +
        `(6) "First Message Sent" — our side sent a first reply/greeting only, no specifics yet. ` +
        `(7) "New" — the lead messaged but our business has not replied at all yet. ` +
        `Null if none of these clearly fit.`,
    },
    suggestedQuote: {
      type: Type.NUMBER,
      nullable: true,
      description:
        "A specific numeric price/quote OUR side gave the lead in the conversation (plain number, no currency symbol). Null if no specific price was given.",
    },
  },
  required: ["description"],
};

function buildPrompt(todayISO) {
  return `You are helping a jewelry business (Jeni Diam, sells lab-grown & natural diamond jewelry) triage inbound Meta/WhatsApp/Instagram DM leads.

You will be given either pasted chat text or a screenshot of a chat/inbox. It contains a conversation between:
- OUR business side — may appear as "Jeni", "JENI", "JENI DIAM", "Tirth Radadiya", "Sent by Tirth Radadiya", or business greeting/pitch messages (e.g. "Welcome to JENI DIAM", "Your idea -> Free CAD Design -> ..."). These are usually on the right side / in a blue bubble in screenshots.
- THE LEAD (the customer) — everyone else in the conversation. This is who you should summarize.

Timestamps in the conversation may be absolute ("23 Aug 2026, 09:04") or relative to when the export/screenshot was taken ("Mon 20:32", "Sun 01:47", "Sunday 23:58", "Today", "Yesterday"). Today's date is ${todayISO}. Resolve relative timestamps against that reference date (the most recent matching weekday on or before today).

Read the conversation and return JSON matching the schema: a short description of what the lead wants (ignore our own sales pitch/boilerplate), the date of the lead's first message in this conversation (YYYY-MM-DD, or null if you can't tell), the lead's visible name/handle (or null), the product category being discussed, whether they asked about natural vs lab-grown, the conversation's current status/stage, and any specific price we already quoted them. Leave any field null rather than guessing if it isn't clearly shown.`;
}

export async function describeLead({ text, imageBase64, mimeType, todayISO }) {
  if (!text && !imageBase64) {
    throw new Error("Provide text or an image to describe");
  }

  const parts = [{ text: buildPrompt(todayISO) }];
  if (text) {
    parts.push({ text: `--- CONVERSATION TEXT ---\n${text}` });
  }
  if (imageBase64 && mimeType) {
    parts.push({ inlineData: { data: imageBase64, mimeType } });
  }

  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const raw = response.text;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Gemini returned a non-JSON response");
  }

  return {
    description: parsed.description || "",
    suggestedDate: parsed.suggestedDate || null,
    suggestedIdentified: parsed.suggestedIdentified || null,
    suggestedProduct: parsed.suggestedProduct || null,
    suggestedIsNatural:
      typeof parsed.suggestedIsNatural === "boolean" ? parsed.suggestedIsNatural : null,
    suggestedStatus: parsed.suggestedStatus || null,
    suggestedQuote: typeof parsed.suggestedQuote === "number" ? parsed.suggestedQuote : null,
  };
}
