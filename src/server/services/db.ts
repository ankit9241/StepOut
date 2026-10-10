import { MongoClient, type Db } from "mongodb";
import { config } from "../config";

export type DbStatus = "connected" | "unconfigured" | "disconnected";

let client: MongoClient | null = null;
let dbInstance: Db | null = null;
let connecting = false;

function maskUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    if (parsed.password) {
      parsed.password = "****";
    }
    return parsed.toString();
  } catch {
    return uri.replace(/:([^@]+)@/, ":****@");
  }
}

export async function getDb(): Promise<Db | null> {
  if (!config.MONGODB_URI) {
    return null;
  }

  if (dbInstance) {
    return dbInstance;
  }

  if (connecting) {
    // Wait briefly if another request is establishing connection
    await new Promise((res) => setTimeout(res, 200));
    return dbInstance;
  }

  try {
    connecting = true;
    client = new MongoClient(config.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    await client.connect();
    dbInstance = client.db(config.MONGODB_DB_NAME);
    console.log(
      `[DB] Connected to MongoDB database: ${config.MONGODB_DB_NAME} (${maskUri(config.MONGODB_URI)})`,
    );
    return dbInstance;
  } catch (err) {
    console.error(
      "[DB] MongoDB connection failed:",
      err instanceof Error ? err.message : String(err),
    );
    client = null;
    dbInstance = null;
    return null;
  } finally {
    connecting = false;
  }
}

export async function checkDbHealth(): Promise<DbStatus> {
  if (!config.MONGODB_URI) {
    return "unconfigured";
  }

  try {
    const db = await getDb();
    if (!db) return "disconnected";
    await db.command({ ping: 1 });
    return "connected";
  } catch {
    return "disconnected";
  }
}

export async function saveChallengeGeneration(data: Record<string, unknown>): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.collection("challenges").insertOne({
      ...data,
      savedAt: new Date(),
    });
  } catch (err) {
    console.error(
      "[DB] Failed to persist challenge record:",
      err instanceof Error ? err.message : String(err),
    );
  }
}

export async function saveReflectionEntry(data: Record<string, unknown>): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    // Privacy: never store raw observation or reflection text; preserve only operational metrics
    const sanitizedRecord = {
      challengeTitle: data["challengeTitle"],
      observationLength:
        typeof data["observation"] === "string"
          ? data["observation"].length
          : typeof data["observationLength"] === "number"
            ? data["observationLength"]
            : 0,
      source: data["source"] || "builtin",
      savedAt: new Date(),
    };
    await db.collection("reflections").insertOne(sanitizedRecord);
  } catch (err) {
    console.error(
      "[DB] Failed to persist reflection record:",
      err instanceof Error ? err.message : String(err),
    );
  }
}

export async function closeDb(): Promise<void> {
  if (client) {
    try {
      await client.close();
      console.log("[DB] MongoDB connection closed.");
    } catch (err) {
      console.error("[DB] Error closing MongoDB client:", err);
    } finally {
      client = null;
      dbInstance = null;
    }
  }
}
