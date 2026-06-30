import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen, fireEvent, waitFor } from "../test/test-utils";
import { DeckList } from "../components/library/DeckList";
import type { Deck, ExplanationProgress, ExplanationStats } from "../lib/api";

const mockDecks: Deck[] = [
  { id: 1, name: "Cardiology", description: "Heart stuff", parentId: null, kind: "deck" as const, userId: null, createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-07T00:00:00.000Z", cardCount: 42 },
  { id: 2, name: "Neurology", description: "Brain stuff", parentId: null, kind: "deck" as const, userId: null, createdAt: "2026-06-02T00:00:00.000Z", updatedAt: "2026-06-06T00:00:00.000Z", cardCount: 30 },
];

const glassStyle = {
  background: "var(--glass-card-bg)",
  border: "1px solid var(--glass-border)",
  backdropFilter: "blur(20px)",
};

function renderDeckList(props: Partial<{
  decks: Deck[];
  generatingDecks: Set<number>;
  explanationProgress: Record<number, ExplanationProgress>;
  explanationStats: Record<number, ExplanationStats>;
  onGenerateExplanations: ReturnType<typeof vi.fn>;
  onDelete: ReturnType<typeof vi.fn>;
}> = {}) {
  return renderWithProviders(
    <DeckList
      decks={props.decks ?? mockDecks}
      generatingDecks={props.generatingDecks ?? new Set()}
      explanationProgress={props.explanationProgress ?? {}}
      explanationStats={props.explanationStats ?? {}}
      onGenerateExplanations={props.onGenerateExplanations ?? vi.fn()}
      onDelete={props.onDelete ?? vi.fn().mockResolvedValue(undefined)}
      glassStyle={glassStyle}
    />
  );
}

describe("DeckList Component", () => {
  it("renders all deck names", () => {
    renderDeckList();
    expect(screen.getByText("Cardiology")).toBeInTheDocument();
    expect(screen.getByText("Neurology")).toBeInTheDocument();
  });

  it("renders card counts", () => {
    renderDeckList();
    expect(screen.getByText("42 cards")).toBeInTheDocument();
    expect(screen.getByText("30 cards")).toBeInTheDocument();
  });

  it("shows empty state when no decks", () => {
    renderWithProviders(
      <DeckList
        decks={[]}
        generatingDecks={new Set()}
        explanationProgress={{}}
        explanationStats={{}}
        onGenerateExplanations={vi.fn()}
        onDelete={vi.fn()}
        glassStyle={glassStyle}
      />
    );
    expect(screen.getByText(/No decks found/)).toBeInTheDocument();
  });

  it("shows AI Ready badge for decks with explanations", () => {
    const stats: Record<number, ExplanationStats> = {
      1: { total: 42, withExplanations: 42, withoutExplanations: 0 },
    };
    renderDeckList({ explanationStats: stats });
    expect(screen.getByText("AI Ready")).toBeInTheDocument();
  });

  it("shows progress bar when generating explanations", () => {
    const progress: Record<number, ExplanationProgress> = {
      1: { deckId: 1, total: 42, completed: 21, failed: 0, status: "running" },
    };
    renderDeckList({ generatingDecks: new Set([1]), explanationProgress: progress });
    expect(screen.getByText("Generating explanations... 21/42")).toBeInTheDocument();
  });

  it("calls onDelete when delete is confirmed", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    renderDeckList({ onDelete });
    const deleteButtons = screen.getAllByTitle("Delete deck");
    fireEvent.click(deleteButtons[0]);

    const confirmButton = screen.getByRole("button", { name: "Delete" });
    expect(confirmButton).toBeInTheDocument();
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith(1);
    });
  });

  it("cancels delete when Cancel is clicked", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    renderDeckList({ onDelete });
    const deleteButtons = screen.getAllByTitle("Delete deck");
    fireEvent.click(deleteButtons[0]);

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    expect(cancelButton).toBeInTheDocument();
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    });
  });

  it("calls onGenerateExplanations when generate button is clicked", () => {
    const onGenerate = vi.fn();
    renderDeckList({ onGenerateExplanations: onGenerate });
    const generateButtons = screen.getAllByTitle("Generate AI explanations");
    fireEvent.click(generateButtons[0]);
    expect(onGenerate).toHaveBeenCalledWith(1, expect.anything());
  });
});
