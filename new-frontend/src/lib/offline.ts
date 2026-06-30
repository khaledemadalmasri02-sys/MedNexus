// Offline support using IndexedDB

const DB_NAME = "ankigen-offline";
const DB_VERSION = 1;

// Store names
export const STORES = {
  DECKS: "decks",
  CARDS: "cards",
  GENERATIONS: "generations",
  QUEUE: "queue",
  SETTINGS: "settings",
} as const;

export interface OfflineDeck {
  id?: number;
  name: string;
  description?: string;
  parentId?: number | null;
  kind: "deck" | "qbank";
  createdAt: string;
  synced: boolean;
}

export interface OfflineCard {
  id?: number;
  deckId: number;
  front: string;
  back: string;
  tags?: string;
  cardType: string;
  choices?: string;
  correctIndex?: number;
  createdAt: string;
  synced: boolean;
}

export interface OfflineQueueItem {
  id: string;
  type: "generate" | "explain" | "extract";
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "completed" | "failed";
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// Open database connection
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.DECKS)) {
        db.createObjectStore(STORES.DECKS, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORES.CARDS)) {
        db.createObjectStore(STORES.CARDS, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORES.GENERATIONS)) {
        db.createObjectStore(STORES.GENERATIONS, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORES.QUEUE)) {
        db.createObjectStore(STORES.QUEUE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: "key" });
      }
    };
  });
}

// Generic CRUD operations
async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getById<T>(storeName: string, id: number | string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function put<T>(storeName: string, data: T): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(data);
  });
}

async function remove(storeName: string, id: number | string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Deck operations
export const offlineDecks = {
  getAll: () => getAll<OfflineDeck>(STORES.DECKS),
  getById: (id: number) => getById<OfflineDeck>(STORES.DECKS, id),
  save: (deck: OfflineDeck) => put(STORES.DECKS, { ...deck, synced: false }),
  delete: (id: number) => remove(STORES.DECKS, id),
  clear: () => clearStore(STORES.DECKS),
};

// Card operations
export const offlineCards = {
  getAll: () => getAll<OfflineCard>(STORES.CARDS),
  getByDeckId: async (deckId: number): Promise<OfflineCard[]> => {
    const all = await getAll<OfflineCard>(STORES.CARDS);
    return all.filter((c) => c.deckId === deckId);
  },
  getById: (id: number) => getById<OfflineCard>(STORES.CARDS, id),
  save: (card: OfflineCard) => put(STORES.CARDS, { ...card, synced: false }),
  saveMany: async (cards: OfflineCard[]) => {
    for (const card of cards) {
      await put(STORES.CARDS, { ...card, synced: false });
    }
  },
  delete: (id: number) => remove(STORES.CARDS, id),
  clear: () => clearStore(STORES.CARDS),
};

// Queue operations
export const offlineQueue = {
  getAll: () => getAll<OfflineQueueItem>(STORES.QUEUE),
  getById: (id: string) => getById<OfflineQueueItem>(STORES.QUEUE, id),
  getPending: async (): Promise<OfflineQueueItem[]> => {
    const all = await getAll<OfflineQueueItem>(STORES.QUEUE);
    return all.filter((item) => item.status === "pending");
  },
  save: (item: OfflineQueueItem) => put(STORES.QUEUE, item),
  update: async (id: string, updates: Partial<OfflineQueueItem>) => {
    const existing = await getById<OfflineQueueItem>(STORES.QUEUE, id);
    if (existing) {
      return put(STORES.QUEUE, { ...existing, ...updates, updatedAt: new Date().toISOString() });
    }
  },
  delete: (id: string) => remove(STORES.QUEUE, id),
  clear: () => clearStore(STORES.QUEUE),
  clearCompleted: async () => {
    const all = await getAll<OfflineQueueItem>(STORES.QUEUE);
    for (const item of all) {
      if (item.status === "completed" || item.status === "failed") {
        await remove(STORES.QUEUE, item.id);
      }
    }
  },
};

// Settings operations
export const offlineSettings = {
  get: async <T>(key: string, defaultValue: T): Promise<T> => {
    const result = await getById<{ key: string; value: T }>(STORES.SETTINGS, key);
    return result?.value ?? defaultValue;
  },
  set: async <T>(key: string, value: T) => {
    await put(STORES.SETTINGS, { key, value });
  },
};

// Online status detection
export function isOnline(): boolean {
  return navigator.onLine;
}

export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

// Sync offline data when back online
export async function syncWithServer(api: {
  decks: { create: (data: Record<string, unknown>) => Promise<{ id: number }> };
  cards: { create: (data: Record<string, unknown>) => Promise<{ id: number }> };
}): Promise<{ decksSynced: number; cardsSynced: number; errors: string[] }> {
  const errors: string[] = [];
  let decksSynced = 0;
  let cardsSynced = 0;

  try {
    // Sync decks
    const unsyncedDecks = (await offlineDecks.getAll()).filter((d) => !d.synced);
    for (const deck of unsyncedDecks) {
      try {
        const result = await api.decks.create({
          name: deck.name,
          description: deck.description,
          parentId: deck.parentId,
          kind: deck.kind,
        });
        deck.id = result.id;
        deck.synced = true;
        await offlineDecks.save(deck);
        decksSynced++;
      } catch (err) {
        errors.push(`Failed to sync deck "${deck.name}": ${(err as Error).message}`);
      }
    }

    // Sync cards
    const unsyncedCards = (await offlineCards.getAll()).filter((c) => !c.synced);
    for (const card of unsyncedCards) {
      try {
        await api.cards.create({
          deckId: card.deckId,
          front: card.front,
          back: card.back,
          tags: card.tags,
          cardType: card.cardType,
          choices: card.choices,
          correctIndex: card.correctIndex,
        });
        card.synced = true;
        await offlineCards.save(card);
        cardsSynced++;
      } catch (err) {
        errors.push(`Failed to sync card: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    errors.push(`Sync failed: ${(err as Error).message}`);
  }

  return { decksSynced, cardsSynced, errors };
}

// Process offline queue
export async function processOfflineQueue(api: {
  generate: (data: Record<string, unknown>) => Promise<unknown>;
  explain: (data: Record<string, unknown>) => Promise<unknown>;
}): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  const pendingItems = await offlineQueue.getPending();

  for (const item of pendingItems) {
    try {
      await offlineQueue.update(item.id, { status: "processing" });

      let result: unknown;
      switch (item.type) {
        case "generate":
          result = await api.generate(item.payload);
          break;
        case "explain":
          result = await api.explain(item.payload);
          break;
        default:
          throw new Error(`Unknown queue item type: ${item.type}`);
      }

      await offlineQueue.update(item.id, {
        status: "completed",
        result: result as Record<string, unknown>,
      });
      processed++;
    } catch (err) {
      await offlineQueue.update(item.id, {
        status: "failed",
        error: (err as Error).message,
      });
      failed++;
    }
  }

  return { processed, failed };
}

// Export all offline utilities
export default {
  decks: offlineDecks,
  cards: offlineCards,
  queue: offlineQueue,
  settings: offlineSettings,
  isOnline,
  onOnlineStatusChange,
  syncWithServer,
  processOfflineQueue,
};
