import type { Card } from "../db/schema";

export interface AnkiDeck {
  name: string;
  model: string;
  cards: AnkiCard[];
  fields: AnkiField[];
  templates: AnkiTemplate[];
}

export interface AnkiCard {
  deck: string;
  model: string;
  fields: Record<string, string>;
  tags?: string[];
  shuffle?: number;
  mod?: number;
  id?: number;
}

export interface AnkiField {
  Name: string;
  Order: number;
}

export interface AnkiTemplate {
  Name: string;
  Front: string;
  Back: string;
}

export const ANKI_MODELS: Record<string, { fields: AnkiField[]; templates: AnkiTemplate[] }> = {
  "Basic": {
    fields: [
      { Name: "Front", Order: 0 },
      { Name: "Back", Order: 1 },
    ],
    templates: [
      { Name: "Card 1", Front: "{{Front}}", Back: "{{Back}}" },
    ],
  },
  "Basic (and reverse)": {
    fields: [
      { Name: "Front", Order: 0 },
      { Name: "Back", Order: 1 },
    ],
    templates: [
      { Name: "Card 1", Front: "{{Front}}", Back: "{{Back}}" },
      { Name: "Card 2", Front: "{{Back}}", Back: "{{Front}}" },
    ],
  },
  "Cloze": {
    fields: [
      { Name: "Text", Order: 0 },
      { Name: "Extra", Order: 1 },
    ],
    templates: [
      { Name: "Cloze", Front: "{{cloze:Text}}", Back: "{{cloze:Text}}\n\n{{#Extra}}=== Extra ===\n{{Extra}}{{/Extra}}" },
    ],
  },
  "Vignette": {
    fields: [
      { Name: "Front", Order: 0 },
      { Name: "Back", Order: 1 },
      { Name: "Explanation", Order: 2 },
    ],
    templates: [
      { Name: "Card 1", Front: "{{Front}}", Back: "{{Back}}\n\n{{#Explanation}}=== Explanation ===\n{{Explanation}}{{/Explanation}}" },
    ],
  },
  "Mnemonic": {
    fields: [
      { Name: "Front", Order: 0 },
      { Name: "Mnemonic", Order: 1 },
      { Name: "Explanation", Order: 2 },
    ],
    templates: [
      { Name: "Card 1", Front: "{{Front}}", Back: "**Mnemonic:** {{Mnemonic}}\n\n{{#Explanation}}**Explanation:** {{Explanation}}{{/Explanation}}" },
    ],
  },
  "Compare Contrast": {
    fields: [
      { Name: "Front", Order: 0 },
      { Name: "Compare", Order: 1 },
      { Name: "Contrast", Order: 2 },
    ],
    templates: [
      { Name: "Card 1", Front: "{{Front}}", Back: "**Similarities:** {{Compare}}\n\n**Differences:** {{Contrast}}" },
    ],
  },
};

export class AnkiExportService {
  private deckName: string;

  constructor(deckName: string = "Medical Flashcards") {
    this.deckName = deckName;
  }

  generatePackage(cards: Card[], options?: {
    model?: string;
    tags?: string[];
    includeExplanation?: boolean;
  }): AnkiDeck {
    const modelName = options?.model || "Basic";
    const model = ANKI_MODELS[modelName] || ANKI_MODELS["Basic"];

    const ankiCards: AnkiCard[] = cards.map((card, index) => {
      const fields: Record<string, string> = {
        Front: this.sanitizeField(card.front || ""),
        Back: this.sanitizeField(card.back || ""),
      };

      if (this.shouldIncludeExtraFields(modelName)) {
        fields.Extra = this.sanitizeField(card.explanationFull || card.explanationBrief || "");
      }

      const tags: string[] = [];
      if (card.tags) {
        tags.push(...card.tags.split(",").map((t: string) => t.trim()).filter((t: string) => t.length > 0));
      }
      if (options?.tags) {
        tags.push(...options.tags);
      }

      return {
        deck: this.deckName,
        model: modelName,
        fields,
        tags: tags.length > 0 ? tags : undefined,
        mod: Math.floor(Date.now() / 1000),
        id: index + 1,
      };
    });

    return {
      name: this.deckName,
      model: modelName,
      cards: ankiCards,
      fields: model.fields,
      templates: model.templates,
    };
  }

  generateCollectionJson(deck: AnkiDeck): string {
    const collection = {
      decks: {
        [deck.name]: {
          name: deck.name,
          cnt: deck.cards.length,
          revcnt: deck.cards.length,
          lrnCnt: 0,
          dueCount: 0,
          search: deck.name,
          mod: Math.floor(Date.now() / 1000),
          id: Math.floor(Date.now() / 1000),
        },
      },
      models: {
        [deck.model]: {
          name: deck.model,
          type: "cloze",
          fields: deck.fields,
          templates: deck.templates,
          mod: Math.floor(Date.now() / 1000),
          id: 1,
          kind: 0,
          sortFieldType: 1,
          font: "Arial",
          fontSize: 14,
          version: 1,
          usn: -1,
        },
      },
      cards: deck.cards.map((card, index) => ({
        nid: index + 1,
        did: 1,
        fid: 1,
        faceflds: 0,
        flags: 0,
        mod: card.mod || Math.floor(Date.now() / 1000),
        usn: -1,
        ease: 2.5,
        ivl: 0,
        factor: 2500,
        repl: 0,
        type: 0,
        deck: 1,
        tags: card.tags || [],
      })),
      notes: deck.cards.map((card, index) => ({
        fields: Object.values(card.fields),
        tags: card.tags || [],
        nid: index + 1,
        mod: card.mod || Math.floor(Date.now() / 1000),
        usn: -1,
        id: index + 1,
        guid: this.generateGuid(card.fields),
      })),
    };

    return JSON.stringify(collection, null, 2);
  }

  generateApkg(cards: Card[], deckName: string = "Medical Flashcards"): string {
    const deck = this.generatePackage(cards, { model: "Basic" });
    const collectionJson = this.generateCollectionJson(deck);

    const header = "Anki2.1";
    const deckInfo = JSON.stringify({
      name: deck.name,
      cnt: deck.cards.length,
      mod: Math.floor(Date.now() / 1000),
    });

    return `${header}\n${deckInfo}\n${collectionJson}`;
  }

  private sanitizeField(text: string): string {
    return text
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private shouldIncludeExtraFields(modelName: string): boolean {
    return ["Cloze", "Vignette", "Mnemonic", "Compare Contrast"].includes(modelName);
  }

  private generateGuid(fields: Record<string, string>): string {
    const str = Object.values(fields).join("");
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

export function createAnkiExportService(deckName?: string): AnkiExportService {
  return new AnkiExportService(deckName);
}