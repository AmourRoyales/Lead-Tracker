import { ObjectId } from "mongodb";
import { getLeadsCollection } from "./mongodb";
import { CONVERSATION_STAGE_OPTIONS, CONVERSATION_STAGE_SELECT_OPTIONS } from "./constants";

function serialize(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

export async function createLead(data) {
  const col = await getLeadsCollection();
  const now = new Date();
  const doc = {
    identified: data.identified.trim(),
    adId: data.adId ? data.adId.trim() : "",
    platform: data.platform,
    description: data.description || "",
    descriptionSource: data.descriptionSource || "manual",
    leadQuality: data.leadQuality,
    leadQualityCustom: data.leadQualityCustom || null,
    leadDate: data.leadDate, // "YYYY-MM-DD"
    product: data.product,
    productCustom: data.productCustom || null,
    isNatural: !!data.isNatural,
    quote: data.quote === "" || data.quote == null ? null : Number(data.quote),
    status: data.status || "New",
    statusCustom: data.statusCustom || null,
    lastMessageDate: data.lastMessageDate || null, // "YYYY-MM-DD" | null
    followUpMessage: data.followUpMessage || "", // drafted message to send at next follow-up
    highPriority: !!data.highPriority, // manually flagged to show at the top of /follow-up
    nextFollowUpDate: data.nextFollowUpDate || null, // "YYYY-MM-DD" | null
    conversationStage: CONVERSATION_STAGE_SELECT_OPTIONS.includes(data.conversationStage)
      ? data.conversationStage
      : CONVERSATION_STAGE_OPTIONS[0],
    createdAt: now,
    updatedAt: now,
  };
  const res = await col.insertOne(doc);
  return serialize({ _id: res.insertedId, ...doc });
}

export async function updateLead(id, updates) {
  if (!ObjectId.isValid(id)) return null;
  const col = await getLeadsCollection();
  const allowed = [
    "identified",
    "adId",
    "platform",
    "description",
    "descriptionSource",
    "leadQuality",
    "leadQualityCustom",
    "leadDate",
    "product",
    "productCustom",
    "isNatural",
    "quote",
    "status",
    "statusCustom",
    "lastMessageDate",
    "followUpMessage",
    "highPriority",
    "nextFollowUpDate",
    "conversationStage",
  ];
  const set = { updatedAt: new Date() };
  for (const key of allowed) {
    if (key in updates) {
      let value = updates[key];
      if (key === "quote") {
        value = value === "" || value == null ? null : Number(value);
      }
      if ((key === "identified" || key === "adId") && typeof value === "string") {
        value = value.trim();
      }
      if (key === "highPriority") {
        value = !!value;
      }
      if (key === "conversationStage" && !CONVERSATION_STAGE_SELECT_OPTIONS.includes(value)) {
        continue;
      }
      set[key] = value;
    }
  }
  const res = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: set },
    { returnDocument: "after" }
  );
  return serialize(res);
}

export async function deleteLead(id) {
  if (!ObjectId.isValid(id)) return;
  const col = await getLeadsCollection();
  await col.deleteOne({ _id: new ObjectId(id) });
}

export async function getLeadById(id) {
  if (!ObjectId.isValid(id)) return null;
  const col = await getLeadsCollection();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  return serialize(doc);
}

export async function findByIdentified(identified) {
  const col = await getLeadsCollection();
  const trimmed = identified.trim();
  if (!trimmed) return [];
  const docs = await col
    .find({ identified: { $regex: `^${escapeRegex(trimmed)}$`, $options: "i" } })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(serialize);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Fields the free-text search box matches against, beyond just description.
const SEARCH_FIELDS = [
  "identified",
  "adId",
  "description",
  "status",
  "statusCustom",
  "product",
  "productCustom",
  "platform",
  "leadQuality",
  "leadQualityCustom",
  "conversationStage",
];

// Counts how many times `term` occurs in `value` (case-insensitive), so
// leads with more/stronger matches can be ranked above leads that just
// barely matched once.
function countMatches(value, term) {
  if (value == null || term === "") return 0;
  const haystack = String(value).toLowerCase();
  const needle = term.toLowerCase();
  let count = 0;
  let from = 0;
  let idx;
  while ((idx = haystack.indexOf(needle, from)) !== -1) {
    count += 1;
    from = idx + needle.length;
  }
  return count;
}

function searchScore(doc, term) {
  let score = 0;
  for (const field of SEARCH_FIELDS) {
    score += countMatches(doc[field], term);
  }
  score += countMatches(doc.quote, term);
  return score;
}

export async function listAdIds() {
  const col = await getLeadsCollection();
  const ids = await col.distinct("adId", { adId: { $nin: [null, ""] } });
  return ids.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export async function listLeads(filters = {}) {
  const col = await getLeadsCollection();
  const query = {};

  if (filters.status) query.status = filters.status;
  if (filters.conversationStage) query.conversationStage = filters.conversationStage;
  if (filters.leadQuality) query.leadQuality = filters.leadQuality;
  if (filters.qualities) {
    const arr = Array.isArray(filters.qualities) ? filters.qualities : filters.qualities.split(",");
    query.leadQuality = { $in: arr };
  }
  if (filters.adId) query.adId = filters.adId;
  if (filters.product) query.product = filters.product;
  if (filters.platform) query.platform = filters.platform;
  if (filters.naturalOnly === "true" || filters.naturalOnly === true) {
    query.isNatural = true;
  }
  if (filters.noQuote === "true" || filters.noQuote === true) {
    query.quote = null;
  }
  if (filters.dateFrom || filters.dateTo) {
    query.leadDate = {};
    if (filters.dateFrom) query.leadDate.$gte = filters.dateFrom;
    if (filters.dateTo) query.leadDate.$lte = filters.dateTo;
  }
  const searchTerm = filters.search ? filters.search.trim() : "";
  if (searchTerm) {
    const re = { $regex: escapeRegex(searchTerm), $options: "i" };
    const orClauses = SEARCH_FIELDS.map((field) => ({ [field]: re }));
    const asNumber = Number(searchTerm);
    if (searchTerm !== "" && !Number.isNaN(asNumber)) {
      orClauses.push({ quote: asNumber });
    }
    query.$or = orClauses;
  }

  const docs = await col
    .find(query)
    .sort({ leadDate: -1, createdAt: -1 })
    .toArray();

  // With an active search, rank whichever leads matched the term the most
  // (across all searched fields, including repeats) above weaker matches,
  // instead of just the default date order.
  if (searchTerm) {
    docs.sort((a, b) => searchScore(b, searchTerm) - searchScore(a, searchTerm));
  }

  return docs.map(serialize);
}
