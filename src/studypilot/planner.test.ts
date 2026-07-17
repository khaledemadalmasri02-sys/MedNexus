import { describe, it, expect } from "vitest";
import {
  ingestText,
  clusterModules,
  orderModules,
  buildSchedule,
  detectType,
  detectDifficulty,
} from "./planner";

function fakeCards(n: number): string {
  const topics = ["mitochondria", "photosynthesis", "cell membrane", "dna replication", "enzyme kinetics"];
  const sentences: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = topics[i % topics.length];
    sentences.push(
      `${t.charAt(0).toUpperCase()}${t.slice(1)} is a key concept in biology. ` +
        `Define ${t} and explain its role. It is important for the cell to regulate ${t} activity.`
    );
  }
  return sentences.join("\n\n");
}

describe("StudyPilot planner", () => {
  it("detects card types", () => {
    expect(detectType("Define osmosis.")).toBe("definition");
    expect(detectType("Force = mass × acceleration. Derive the formula for kinetic energy.")).toBe("formula");
    expect(detectType("A patient presents with fever. Calculate the dosage.")).toBe("problem");
  });

  it("detects difficulty from keywords", () => {
    expect(detectDifficulty("Define the term cell.")).toBe("easy");
    expect(detectDifficulty("Prove and derive the complex theorem of relativity and analyze it.")).toBe("hard");
  });

  it("splits, clusters, and orders 20 fake cards without dropping any", () => {
    const text = fakeCards(20);
    const cards = ingestText(text);
    expect(cards.length).toBe(20);

    const clusters = orderModules(clusterModules(cards));
    const totalClustered = clusters.reduce((s, c) => s + c.cards.length, 0);
    expect(totalClustered).toBe(20); // no card dropped
    expect(clusters.length).toBeGreaterThan(0);

    // ordered easy -> hard
    const rank = { easy: 0, medium: 1, hard: 2 } as Record<string, number>;
    for (let i = 1; i < clusters.length; i++) {
      const prev = rank[clusters[i - 1].difficulty];
      const cur = rank[clusters[i].difficulty];
      expect(cur).toBeGreaterThanOrEqual(prev);
    }
  });

  it("improved clustering keeps every card and respects the module cap", () => {
    // 60 cards spread over many unrelated micro-topics → should not explode into
    // 60 singleton modules, and must never drop a card.
    const topics = Array.from({ length: 30 }, (_, i) => `topic${i}`);
    const sentences: string[] = [];
    for (let i = 0; i < 60; i++) {
      const t = topics[i % topics.length];
      sentences.push(`Define ${t} and explain its role in the body. It is regulated by the cell.`);
    }
    const cards = ingestText(sentences.join("\n\n"));
    const clusters = orderModules(clusterModules(cards));
    const total = clusters.reduce((s, c) => s + c.cards.length, 0);
    expect(total).toBe(cards.length); // no card dropped
    expect(clusters.length).toBeLessThanOrEqual(12); // MAX_MODULES
    expect(clusters.length).toBeGreaterThan(0);
  });

  it("builds a schedule that covers all cards before the deadline", () => {
    const text = fakeCards(20);
    const cards = ingestText(text);
    const clusters = orderModules(clusterModules(cards));
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 5);
    const { days, totalCards } = buildSchedule(clusters, 30, deadline);

    expect(totalCards).toBe(20);
    expect(days.length).toBeGreaterThan(0);
    const scheduled = days.reduce((s, d) => s + d.cardCount, 0);
    expect(scheduled).toBe(20); // all cards placed

    const lastDay = days[days.length - 1];
    const lastDate = new Date(lastDay.date + "T00:00:00");
    expect(lastDate.getTime()).toBeLessThanOrEqual(deadline.getTime());
  });
});
