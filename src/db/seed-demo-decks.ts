import { randomUUID } from "crypto";
import { db, decks, cards, articleJobs } from "./index.js";

interface SeedCard {
  front: string;
  back: string;
  tags: string;
}

const CELL_BIOLOGY_CARDS: SeedCard[] = [
  {
    front: "What are the four phases of mitosis in order?",
    back: "Prophase → Metaphase → Anaphase → Telophase (PMAT). Each phase has distinct chromosomal events.",
    tags: "Mitosis",
  },
  {
    front: "What happens during prophase?",
    back: "Chromatin condenses into visible chromosomes, the nuclear envelope breaks down, and the mitotic spindle begins to form.",
    tags: "Mitosis",
  },
  {
    front: "What is the metaphase plate?",
    back: "The central plane of the cell where chromosomes align during metaphase, attached to spindle fibers at their kinetochores.",
    tags: "Mitosis",
  },
  {
    front: "What triggers the separation of sister chromatids in anaphase?",
    back: "Anaphase-promoting complex (APC/C) activates separase, which cleaves cohesin proteins holding sister chromatids together.",
    tags: "Mitosis",
  },
  {
    front: "How does cytokinesis differ between animal and plant cells?",
    back: "Animal cells form a cleavage furrow via actin-myosin contractile ring; plant cells form a cell plate from Golgi-derived vesicles.",
    tags: "Mitosis",
  },
  {
    front: "What is the key outcome of meiosis I versus meiosis II?",
    back: "Meiosis I separates homologous chromosomes (reductional, 2n→n); meiosis II separates sister chromatids (equational, like mitosis).",
    tags: "Meiosis",
  },
  {
    front: "What is crossing over and when does it occur?",
    back: "Crossing over is the exchange of genetic material between non-sister chromatids of homologous chromosomes during prophase I of meiosis.",
    tags: "Meiosis",
  },
  {
    front: "What enzyme unwinds the DNA double helix at the replication fork?",
    back: "Helicase breaks the hydrogen bonds between base pairs, unwinding DNA bidirectionally at the replication fork.",
    tags: "DNA Replication",
  },
  {
    front: "Why is DNA synthesis described as semi-conservative?",
    back: "Each daughter DNA molecule consists of one original (parental) strand and one newly synthesized strand, as demonstrated by Meselson-Stahl.",
    tags: "DNA Replication",
  },
  {
    front: "What is the difference between leading and lagging strand synthesis?",
    back: "The leading strand is synthesized continuously 5'→3' toward the fork; the lagging strand is synthesized discontinuously as Okazaki fragments away from the fork.",
    tags: "DNA Replication",
  },
  {
    front: "Define transcription.",
    back: "Transcription is the synthesis of mRNA from a DNA template by RNA polymerase, producing a single-stranded RNA complementary to the template strand.",
    tags: "Transcription",
  },
  {
    front: "What is the role of the promoter in transcription?",
    back: "The promoter is a DNA sequence signaling the start of a gene where RNA polymerase and transcription factors bind to initiate transcription.",
    tags: "Transcription",
  },
  {
    front: "What is the central dogma of molecular biology?",
    back: "DNA → RNA → Protein. Genetic information flows from DNA via transcription to mRNA, then via translation to protein.",
    tags: "Translation",
  },
  {
    front: "Where does translation occur in eukaryotic cells?",
    back: "Translation occurs on ribosomes in the cytoplasm (free ribosomes) or on the rough endoplasmic reticulum (bound ribosomes).",
    tags: "Translation",
  },
  {
    front: "Define osmosis.",
    back: "Osmosis is the net movement of water molecules across a selectively permeable membrane from a region of lower solute concentration to higher solute concentration.",
    tags: "Osmosis",
  },
  {
    front: "What is the overall equation for photosynthesis?",
    back: "6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂. Carbon dioxide and water are converted to glucose and oxygen using light energy.",
    tags: "Photosynthesis",
  },
];

const MITOSIS_ARTICLE_OUTLINE = JSON.stringify({
  title: "Mitosis: The Elegant Choreography of Cell Division",
  sections: [
    { heading: "Introduction", level: 2 },
    { heading: "The Cell Cycle Context", level: 2 },
    { heading: "Phase-by-Phase Walkthrough", level: 2 },
    { heading: "Mathematical Model of Chromosome Segregation", level: 2 },
    { heading: "Regulation and Clinical Relevance", level: 2 },
    { heading: "Self-Quiz", level: 2 },
  ],
});

const MITOSIS_ARTICLE_CONTENT = `# Mitosis: The Elegant Choreatography of Cell Division

## Abstract

Mitosis is the process by which a eukaryotic cell divides its nucleus to produce two genetically identical daughter cells. This article walks through the cell cycle context, the four canonical phases (prophase, metaphase, anaphase, telophase), a mathematical view of chromosome dynamics, and the regulatory machinery that ensures fidelity. A five-question self-quiz is included to reinforce learning.

## The Cell Cycle Context

The cell cycle consists of interphase (G₁, S, G₂) and the M phase. Mitosis occupies the M phase and is followed by cytokinesis. The duration of mitosis varies, but the number of chromosomes is conserved: a diploid human cell with $2n = 46$ chromosomes produces two daughters each with $2n = 46$.

> **Takeaway:** Mitosis preserves ploidy. The chromosome count before and after division is identical — only the number of cells changes.

## Phase-by-Phase Walkthrough

During **prophase**, chromatin condenses and each chromosome appears as two sister chromatids joined at the centromere. In **metaphase**, chromosomes align at the metaphase plate. **Anaphase** separates sister chromatids toward opposite poles. **Telophase** reassembles nuclear envelopes around each set.

## Mathematical Model of Chromosome Segregation

If a cell has $k$ distinct chromosome pairs, the number of possible combinations of maternal/paternal chromosomes in gametes (after meiosis) is $2^k$. For humans, $k = 23$, giving $2^{23} \\approx 8.4 \\times 10^6$ combinations — not counting crossing over. The probability that two siblings inherit identical chromosome sets (ignoring recombination) is:

$$P(\\text{identical}) = \\left(\\frac{1}{2^{23}}\\right)^2 = 2^{-46} \\approx 1.4 \\times 10^{-14}$$

## Regulation and Clinical Relevance

Cyclin-dependent kinases (CDKs) and the anaphase-promoting complex (APC/C) govern transitions. Errors in segregation cause aneuploidy, a hallmark of many cancers. The spindle assembly checkpoint (SAC) prevents anaphase onset until all kinetochores are attached.

> **Takeaway:** The spindle assembly checkpoint is the cell's quality-control mechanism — unattached kinetochores emit a "wait" signal that inhibits APC/C.

## Self-Quiz

**Q1.** In which phase do sister chromatids separate?  
A) Prophase  B) Metaphase  C) **Anaphase**  D) Telophase

**Q2.** A human cell has $2n=46$ chromosomes. After mitosis, each daughter has:  
A) 23  B) **46**  C) 92  D) Variable

**Q3.** The metaphase plate is:  
A) The site of DNA replication  B) The central plane where chromosomes align  C) The contractile ring  D) The nuclear pore

**Q4.** Which enzyme cleaves cohesin to trigger anaphase?  
A) Helicase  B) Polymerase  C) **Separase**  D) Ligase

**Q5.** The number of possible chromosome combinations in human gametes (no crossing over) is:  
A) $2^{23}$  B) $23^2$  C) $46^2$  D) $2 \\times 23$
`;

function findDeckByName(name: string): { id: number } | undefined {
  const all = db.select({ id: decks.id, name: decks.name }).from(decks).all();
  return all.find((d) => d.name === name);
}

function cardExists(deckId: number, front: string): boolean {
  const existing = db.select({ id: cards.id, deckId: cards.deckId, front: cards.front })
    .from(cards)
    .all()
    .filter((c) => c.deckId === deckId && c.front === front);
  return existing.length > 0;
}

export function seedDemoDecks(): { deckId: number; cardsInserted: number; articleJobId: string } {
  let deck = findDeckByName("Cell Biology");
  let deckId: number;

  if (deck) {
    deckId = deck.id;
  } else {
    const created = db.insert(decks).values({
      name: "Cell Biology",
      description: "Demo deck covering mitosis, meiosis, DNA replication, transcription, translation, osmosis, and photosynthesis.",
      kind: "deck",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning().get();
    deckId = created.id;
  }

  let cardsInserted = 0;
  for (const card of CELL_BIOLOGY_CARDS) {
    if (cardExists(deckId, card.front)) continue;
    db.insert(cards).values({
      deckId,
      front: card.front,
      back: card.back,
      tags: card.tags,
      cardType: "basic",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).run();
    cardsInserted++;
  }

  // Seed one completed article job on Mitosis
  const existingJobs = db.select({ id: articleJobs.id, deckId: articleJobs.deckId, topic: articleJobs.topic })
    .from(articleJobs)
    .all()
    .filter((j) => j.deckId === deckId && j.topic === "Mitosis");
  let articleJobId: string;

  if (existingJobs.length > 0) {
    articleJobId = existingJobs[0].id;
  } else {
    const id = randomUUID();
    const now = new Date();
    db.insert(articleJobs).values({
      id,
      deckId,
      topic: "Mitosis",
      status: "completed",
      progress: 100,
      outline: MITOSIS_ARTICLE_OUTLINE,
      contentMarkdown: MITOSIS_ARTICLE_CONTENT,
      createdAt: now,
      updatedAt: now,
    }).run();
    articleJobId = id;
  }

  return { deckId, cardsInserted, articleJobId };
}

const result = seedDemoDecks();
console.log(`[seed:demo] Deck "Cell Biology" id=${result.deckId}, cards inserted=${result.cardsInserted}, article job id=${result.articleJobId}`);
