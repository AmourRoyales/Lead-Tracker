import { MongoClient } from "mongodb";

const dbName = process.env.MONGODB_DB || "lead_tracker";

// Reuse the client across hot-reloads in dev (Next.js clears the module cache
// on every edit, but not globalThis), so we don't open a new connection pool
// on every file save. Connecting lazily (on first real use, not at import
// time) keeps `next build`'s page-data collection from failing when
// MONGODB_URI isn't set yet.
function getClientPromise() {
  if (!global._mongoClientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not set — add it to .env.local");
    }
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}

export async function getDb() {
  const client = await getClientPromise();
  return client.db(dbName);
}

// Indexes for the hot queries: every list is sorted by lead date, the stage
// pages filter on conversationStage, and the calendar/date filters range over
// leadDate. createIndexes is a no-op when they already exist; it runs once per
// server instance, in the background, so it never delays a request.
function ensureIndexes(col) {
  if (!global._leadIndexesPromise) {
    global._leadIndexesPromise = col
      .createIndexes([
        { key: { leadDate: -1, createdAt: -1 } },
        { key: { conversationStage: 1, leadDate: -1 } },
        { key: { leadQuality: 1, leadDate: -1 } },
      ])
      .catch((err) => {
        console.error("Failed to create lead indexes:", err);
        global._leadIndexesPromise = null;
      });
  }
}

export async function getLeadsCollection() {
  const db = await getDb();
  const col = db.collection("leads");
  ensureIndexes(col);
  return col;
}
