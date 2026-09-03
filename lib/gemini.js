import { GoogleGenAI, Type } from "@google/genai";
import {
  CONVERSATION_STAGE_OPTIONS,
  LEAD_QUALITY_OPTIONS,
  PRODUCT_OPTIONS,
  STATUS_OPTIONS,
} from "./constants";
import { weekdayNameFromISO } from "./date";

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
    suggestedLastMessageDate: {
      type: Type.STRING,
      nullable: true,
      description:
        "The date of the LAST message anywhere in this conversation — from either side, whichever was sent most recently — as YYYY-MM-DD, resolved using the reference 'today' date given in the prompt. This is about the most recent visible timestamp in the whole conversation, not the lead's first message. Null if it truly cannot be determined.",
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
        `(5) "Ongoing" — we are actively conversing back and forth over MULTIPLE exchanges (the lead keeps replying and we keep replying, sustained live engagement), but no specific price has been asked for or given yet — this is a currently-active conversation, not just a single reply. ` +
        `(6) "Info Given" — our side shared product details/specs in reply to the lead, but the back-and-forth hasn't gone beyond that one exchange yet, and no price was asked for or given. ` +
        `(7) "First Message Sent" — our side sent a first reply/greeting only, no specifics yet. ` +
        `(8) "New" — the lead messaged but our business has not replied at all yet. ` +
        `Null if none of these clearly fit.`,
    },
    suggestedQuote: {
      type: Type.NUMBER,
      nullable: true,
      description:
        "A specific numeric price/quote OUR side gave the lead in the conversation (plain number, no currency symbol). Null if no specific price was given.",
    },
    suggestedLeadQuality: {
      type: Type.STRING,
      enum: LEAD_QUALITY_OPTIONS,
      nullable: true,
      description:
        `How promising this lead looks, judged ONLY on the LEAD's own messages (ignore how much WE said or offered — our eagerness doesn't make the lead better). ` +
        `"Best" — the lead stated CONCRETE specifics of what they want (a carat/size/cut/metal/budget, a specific product from an ad plus a real requirement, or a direct price ask tied to specifics), OR the lead has sent multiple substantive messages back and forth showing sustained engagement (not just one-word acks). A generic capability/policy question alone does NOT qualify, even if phrased as a request — e.g. "Can I customize my own ring?", "Do you ship worldwide?", "Is this available in gold?" are all vague, not Best, unless the lead follows up with actual specifics. ` +
        `"Medium" — the lead replied to something we asked, but only briefly (a single word/short phrase, e.g. a size, a "yes", a one-line answer) without elaborating or adding new specifics of their own. ` +
        `"Poor" — the lead's message(s) are limited to a vague/generic question or reaction with no concrete specifics and no further engagement from them — e.g. just replied to an ad, asked "can I customize?" or similar, and never said anything more specific afterward, regardless of how much we offered or asked in response. ` +
        `Null if there isn't enough signal to judge.`,
    },
    suggestedConversationStage: {
      type: Type.STRING,
      enum: CONVERSATION_STAGE_OPTIONS,
      nullable: true,
      description:
        `Classify how far this conversation's back-and-forth STRUCTURE has progressed — this is about the shape/depth of the exchange, not lead quality or intent. Check these rules IN ORDER from most advanced to least, and use the first one that matches: ` +
        `(1) "Interested" — the conversation has gone back and forth across MANY separate exchanges, well beyond a single question-and-answer round — the lead has messaged multiple distinct times over the course of the conversation, showing sustained back-and-forth. ` +
        `(2) "Quality Leads" — the conversation shows this shape: an automatic/template message, then our reply, then the lead replied, then we replied again, and then the LEAD said or asked something ELSE (a second, distinct message from them) — i.e. at least two separate lead messages with our replies interleaved, a real structured back-and-forth, but not yet the extended exchange of "Interested". ` +
        `(3) "Second Message" — after an automatic/template message and our reply, the lead sent their FIRST genuine reply showing they want to continue the conversation — this is the lead's first real engagement beyond the initial automated exchange — but it hasn't gone any further than that one reply yet. ` +
        `(4) "First Message" — only the initial automated/template message and, at most, one reply layered on top of it exist so far. This STILL counts as "First Message" (not "Second Message") in these cases: the automatic message repeats again after our reply (auto → our reply → auto again, with no genuine reply from the lead in between); OR the very first automated message was sent by US and the lead has replied to it exactly once, whether that reply was typed manually or was itself an automated/away reply — a single reply sitting on top of a template message is still just the first-contact stage, not real engagement yet. ` +
        `Null if the conversation structure is unclear.`,
    },
  },
  required: ["description"],
};

function buildPrompt(todayISO) {
  const todayWeekday = weekdayNameFromISO(todayISO);
  return `You are helping a jewelry business (Jeni Diam, sells lab-grown & natural diamond jewelry) triage inbound Meta/WhatsApp/Instagram DM leads.

You will be given either pasted chat text or a screenshot of a chat/inbox. It contains a conversation between:
- OUR business side — may appear as "Jeni", "JENI", "JENI DIAM", "Tirth Radadiya", "Sent by Tirth Radadiya", or business greeting/pitch messages (e.g. "Welcome to JENI DIAM", "Your idea -> Free CAD Design -> ..."). These are usually on the right side / in a blue bubble in screenshots.
- THE LEAD (the customer) — everyone else in the conversation. This is who you should summarize.

Timestamps in the conversation may be absolute ("23 Aug 2026, 09:04") or relative to when the export/screenshot was taken ("Mon 20:32", "Sun 01:47", "Sunday 23:58", "Today", "Yesterday"). Meta/WhatsApp/Instagram show a BARE WEEKDAY NAME with no date attached ONLY for messages sent within the last 6 days — anything older than that always shows an explicit date instead. This means a bare weekday name can NEVER be more than 6 days before the reference date — it always refers to the CLOSEST matching day at or before the reference date, never one week (or more) earlier than that.

Today is ${todayWeekday}, ${todayISO} — use this as the reference "now". Resolve each relative timestamp to the nearest matching day at or before that reference date, counting back AT MOST 6 days. For example, if today is Thursday and a message is labeled just "Wednesday" (no date), that message is from YESTERDAY — one day before today — NOT the Wednesday of the week before. Likewise "Monday" when today is Thursday means 3 days ago, not 10. "Today" is the reference date itself; "Yesterday" is one day before it.

Read the conversation and return JSON matching the schema: a short description of what the lead wants (ignore our own sales pitch/boilerplate), the date of the lead's first message in this conversation (YYYY-MM-DD, or null if you can't tell), the date of the LAST message in the conversation from either side (YYYY-MM-DD, or null), the lead's visible name/handle (or null), the product category being discussed, whether they asked about natural vs lab-grown, the conversation's current status/stage, any specific price we already quoted them, how promising the lead looks based on their own messages, and how far the conversation's back-and-forth structure has progressed. Leave any field null rather than guessing if it isn't clearly shown.`;
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
    suggestedLastMessageDate: parsed.suggestedLastMessageDate || null,
    suggestedIdentified: parsed.suggestedIdentified || null,
    suggestedProduct: parsed.suggestedProduct || null,
    suggestedIsNatural:
      typeof parsed.suggestedIsNatural === "boolean" ? parsed.suggestedIsNatural : null,
    suggestedStatus: parsed.suggestedStatus || null,
    suggestedQuote: typeof parsed.suggestedQuote === "number" ? parsed.suggestedQuote : null,
    suggestedLeadQuality: parsed.suggestedLeadQuality || null,
    suggestedConversationStage: parsed.suggestedConversationStage || null,
  };
}
