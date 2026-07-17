/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { studypilotRoutes } from "../routes/studypilot";
import { cards } from "../db/index";
import * as aiModule from "../lib/ai";
import {
  buildExplanationHeuristic,
  ingestText,
  clusterModules,
  orderModules,
} from "./planner";

// In-memory fake of the drizzle db surface used by the ingest route.
function makeFakeDb() {
  const cardValues: any[] = [];
  const db: any = {
    cardValues,
    _deckId: 1,
    query: { cards: { findFirst: async () => null } },
    insert: (table: any) => ({
      values: (rows: any) => ({
        returning: async () => {
          if (table === cards) {
            const arr = Array.isArray(rows) ? rows : [rows];
            cardValues.push(...arr);
            return arr.map((_, i) => ({ id: i + 1 }));
          }
          return [{ id: db._deckId++ }];
        },
      }),
    }),
    update: () => ({ set: () => ({ where: async () => [{ id: 1 }] }) }),
  };
  return db;
}

const FAKE_ENV: any = {
  NODE_ENV: "test",
  LOCAL_AI_URL: "http://localhost:1234/v1",
  AI_TEXT_MODEL: "local/test",
};

function makeApp(aiThrows: boolean) {
  const db = makeFakeDb();
  vi.spyOn(aiModule, "createAIService").mockImplementation(() => {
    if (aiThrows) {
      return {
        generateCards: async () => {
          throw new Error("fetch failed: AI unavailable (ECONNREFUSED)");
        },
        explainCard: async () => {
          throw new Error("fetch failed: AI unavailable");
        },
      } as any;
    }
    return {
      generateCards: async () => [
        { front: "What is osmosis?", back: "Movement of water across a semipermeable membrane.", tags: ["osmosis"] },
      ],
      explainCard: async () => "**Osmosis** is the diffusion of water.",
    } as any;
  });

  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("db", db);
    c.set("user", { id: "u1" });
    await next();
  });
  app.route("/", studypilotRoutes);
  return { app, db };
}

const post = (app: Hono, env: any, body: any) =>
  app.request("/studypilot/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, env);

describe("StudyPilot AI fallback", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("falls back to heuristics and returns usedAi:false when AI is down", async () => {
    const { app } = makeApp(true);
    const res = await post(app, FAKE_ENV, {
      source: "text",
      text: "Osmosis is the movement of water across a semipermeable membrane. Photosynthesis converts light into glucose.",
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.usedAi).toBe(false);
    expect(body.cardCount).toBeGreaterThan(0);
    expect(body.modules.length).toBeGreaterThan(0);
  });

  it("uses AI and marks usedAi:true when the model responds", async () => {
    const { app } = makeApp(false);
    const res = await post(app, FAKE_ENV, {
      source: "text",
      text: "Osmosis is the movement of water across a semipermeable membrane.",
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.usedAi).toBe(true);
    expect(body.cardCount).toBeGreaterThan(0);
  });

  it("buildExplanationHeuristic produces an offline explanation string", () => {
    const text = buildExplanationHeuristic({ front: "Q", back: "A", aiFront: "Q", aiBack: "A" });
    expect(text.toLowerCase()).toContain("offline");
    expect(text).toContain("Q");
  });

  it("planner still splits heuristic text into cards", () => {
    const cl = ingestText("Mitochondria produce ATP. Define mitochondria and its role in the cell.");
    expect(cl.length).toBeGreaterThan(0);
    const clusters = orderModules(clusterModules(cl));
    expect(clusters.reduce((s, c) => s + c.cards.length, 0)).toBe(cl.length);
  });
});
