interface RedisSession {
  sessionId: string;
  attemptId: number;
  stationId: number;
  patientProfileId: number;
  conversation: Array<{ role: string; content: string; timestamp: number }>;
  patientState: {
    emotion: string;
    trustLevel: number;
    revealedInfo: string[];
    symptoms: string[];
  };
  startTime: number;
  lastActivity: number;
  isActive: boolean;
  ttl?: number;
}

export class RedisClient {
  private redisUrl: string;

  constructor(redisUrl: string | undefined) {
    this.redisUrl = redisUrl || "redis://localhost:6379";
  }

  async getSession(sessionId: string): Promise<RedisSession | null> {
    try {
      const response = await fetch(`${this.redisUrl}/get/osce_session:${sessionId}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data as RedisSession;
    } catch {
      return null;
    }
  }

  async saveSession(session: RedisSession): Promise<boolean> {
    try {
      await fetch(`${this.redisUrl}/set/osce_session:${session.sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session),
      });
      return true;
    } catch {
      return false;
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.redisUrl}/del/osce_session:${sessionId}`, { method: "DELETE" });
      return response.ok;
    } catch {
      return false;
    }
  }

  async expireSession(sessionId: string, ttlSeconds: number): Promise<boolean> {
    try {
      await fetch(`${this.redisUrl}/expire/osce_session:${sessionId}:${ttlSeconds}`, { method: "POST" });
      return true;
    } catch {
      return false;
    }
  }

  async getSessionCount(): Promise<number> {
    try {
      const response = await fetch(`${this.redisUrl}/dbsize`);
      if (!response.ok) return 0;
      const data: { keys?: number } = await response.json();
      return data?.keys || 0;
    } catch {
      return 0;
    }
  }
}

let redisClient: RedisClient | null = null;

export function getRedisClient(redisUrl?: string): RedisClient {
  if (!redisClient && redisUrl) {
    redisClient = new RedisClient(redisUrl);
  }
  return redisClient || new RedisClient(redisUrl);
}

export function createRedisClient(redisUrl?: string): RedisClient {
  return new RedisClient(redisUrl);
}