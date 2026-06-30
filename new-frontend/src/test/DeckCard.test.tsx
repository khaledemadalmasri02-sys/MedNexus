import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen, fireEvent, waitFor } from "../test/test-utils";
import { DeckCard } from "../components/library/DeckList";
import type { Deck, ExplanationProgress, ExplanationStats } from "../lib/api";
import * as api from "../lib/api";

void waitFor;

const mockDeck: Deck = {
  id: 1,
  name: "Test Deck",
  description: "A test deck",
  parentId: null,
  kind: "deck",
  userId: null,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-07T00:00:00.000Z",
  cardCount: 42,
};

const glassStyle = {
  background: "var(--glass-card-bg)",
  border: "1px solid var(--glass-border)",
  backdropFilter: "blur(20px)",
};

describe("DeckCard", () => {
  const defaultProps = {
    deck: mockDeck,
    index: 0,
    deckProgress: undefined as api.DeckProgress | undefined,
    isGenerating: false,
    progress: undefined as ExplanationProgress | undefined,
    stats: undefined as ExplanationStats | undefined,
    hasExplanations: false,
    onGenerate: vi.fn(),
    onDelete: vi.fn(),
    onDeleteRequest: vi.fn(),
    onCancelDelete: vi.fn(),
    isDeleteConfirm: false,
    glassStyle,
  };

  it("renders deck name and card count", () => {
    renderWithProviders(<DeckCard {...defaultProps} />);
    expect(screen.getByText("Test Deck")).toBeInTheDocument();
    expect(screen.getByText("42 cards")).toBeInTheDocument();
  });

  it("shows AI Ready badge when explanations exist", () => {
    renderWithProviders(<DeckCard {...defaultProps} hasExplanations={true} stats={{ total: 42, withExplanations: 42, withoutExplanations: 0 }} />);
    expect(screen.getByText("AI Ready")).toBeInTheDocument();
  });

  it("calls onDeleteRequest when trash button is clicked", () => {
    const onDeleteRequest = vi.fn();
    renderWithProviders(<DeckCard {...defaultProps} onDeleteRequest={onDeleteRequest} />);
    const deleteButton = screen.getByTitle("Delete deck");
    fireEvent.click(deleteButton);
    expect(onDeleteRequest).toHaveBeenCalledWith(1);
  });

  it("shows delete confirmation dialog when isDeleteConfirm is true", () => {
    renderWithProviders(<DeckCard {...defaultProps} isDeleteConfirm={true} />);
    expect(screen.getByText(/Delete.*Test Deck/)).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("does not show delete confirmation by default", () => {
    renderWithProviders(<DeckCard {...defaultProps} />);
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
  });

  it("calls onCancelDelete when Cancel is clicked in confirm dialog", () => {
    const onCancelDelete = vi.fn();
    renderWithProviders(<DeckCard {...defaultProps} isDeleteConfirm={true} onCancelDelete={onCancelDelete} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancelDelete).toHaveBeenCalled();
  });

  it("calls onDelete when Delete is clicked in confirm dialog", () => {
    const onDelete = vi.fn();
    renderWithProviders(<DeckCard {...defaultProps} isDeleteConfirm={true} onDelete={onDelete} />);
    fireEvent.click(screen.getByText("Delete"));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it("calls onGenerate when generate button is clicked", () => {
    const onGenerate = vi.fn();
    renderWithProviders(<DeckCard {...defaultProps} onGenerate={onGenerate} />);
    const generateButton = screen.getByTitle("Generate AI explanations");
    fireEvent.click(generateButton);
    expect(onGenerate).toHaveBeenCalledWith(1, expect.anything());
  });

  it("shows progress bar when generating", () => {
    const progress: ExplanationProgress = {
      deckId: 1,
      total: 42,
      completed: 21,
      failed: 0,
      status: "running",
    };
    renderWithProviders(<DeckCard {...defaultProps} isGenerating={true} progress={progress} />);
    expect(screen.getByText("Generating explanations... 21/42")).toBeInTheDocument();
  });

  it("renders mastery percentage", () => {
    renderWithProviders(<DeckCard {...defaultProps} deckProgress={{ ...defaultProps.deckProgress, masteryPct: 75 } as api.DeckProgress} />);
    expect(screen.getByText("75")).toBeInTheDocument();
  });

  it("renders time ago", () => {
    renderWithProviders(<DeckCard {...defaultProps} />);
    expect(screen.getByText(/ago|Today/)).toBeInTheDocument();
  });
});
