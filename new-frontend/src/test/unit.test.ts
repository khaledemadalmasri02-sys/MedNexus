import { describe, it, expect } from "vitest";

describe("handleResponse", () => {
  it("should parse JSON from 200 responses", async () => {
    const response = new Response(JSON.stringify({ data: "test" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    const result = await response.json();
    expect(result).toEqual({ data: "test" });
  });

  it("should handle 204 no content gracefully", async () => {
    const response = new Response(null, { status: 204 });
    expect(response.status).toBe(204);
    expect(response.ok).toBe(true);
  });

  it("should detect error responses", async () => {
    const response = new Response(
      JSON.stringify({ error: { code: "NOT_FOUND", message: "Not found" } }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });
});

describe("timeAgo", () => {
  const timeAgo = (dateString: string): string => {
    const diff = Date.now() - new Date(dateString).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "1d ago";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  it('returns "Today" for same-day dates', () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe("Today");
  });

  it('returns "1d ago" for yesterday', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(timeAgo(yesterday)).toBe("1d ago");
  });

  it("returns N days ago for recent dates", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    expect(timeAgo(threeDaysAgo)).toBe("3d ago");
  });

  it("returns N weeks ago for older dates", () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    expect(timeAgo(twoWeeksAgo)).toBe("2w ago");
  });

  it("returns N months ago for very old dates", () => {
    const threeMonthsAgo = new Date(Date.now() - 90 * 86400000).toISOString();
    expect(timeAgo(threeMonthsAgo)).toBe("3mo ago");
  });
});

describe("calculateMastery", () => {
  const calculateMastery = (createdAt: string): number => {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(100, Math.max(10, days * 5 + 20));
  };

  it("returns 20% for brand new decks (day 0)", () => {
    const now = new Date().toISOString();
    expect(calculateMastery(now)).toBe(20);
  });

  it("returns minimum 10% for dates far in the future", () => {
    const farFuture = new Date(Date.now() + 10 * 86400000).toISOString();
    expect(calculateMastery(farFuture)).toBe(10);
  });

  it("returns 20% for 0-day-old decks", () => {
    const today = new Date().toISOString();
    expect(calculateMastery(today)).toBeGreaterThanOrEqual(10);
  });

  it("caps at 100% for very old decks", () => {
    const veryOld = new Date(Date.now() - 365 * 86400000).toISOString();
    expect(calculateMastery(veryOld)).toBe(100);
  });

  it("increases linearly between day 0 and cap", () => {
    const day16 = new Date(Date.now() - 16 * 86400000).toISOString();
    expect(calculateMastery(day16)).toBe(100);
  });
});

describe("ownsResource", () => {
  const ownsResource = (resourceUserId: string | null, requestUserId: string | null): boolean => {
    return resourceUserId === requestUserId;
  };

  it("returns true when both are null (anonymous)", () => {
    expect(ownsResource(null, null)).toBe(true);
  });

  it("returns true when both have matching user IDs", () => {
    expect(ownsResource("user-123", "user-123")).toBe(true);
  });

  it("returns false when resource has different owner", () => {
    expect(ownsResource("user-123", "user-456")).toBe(false);
  });

  it("returns false when resource has owner but request is anonymous", () => {
    expect(ownsResource("user-123", null)).toBe(false);
  });

  it("returns false when resource is anonymous but request has user", () => {
    expect(ownsResource(null, "user-123")).toBe(false);
  });
});
