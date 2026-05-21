import React, { useEffect, useMemo, useRef, useState } from "react";
import MiniCrosswordGrid, {
  createEmptyGrid,
  gridToWords,
  normalizeGrid,
} from "../components/MiniCrosswordGrid";

const DEFAULT_ACROSS_CLUES = [
  'Across 1: "The thing here sounds like hiss with a T" (4)',
  'Across 2: "To possess, in a simple hidden-style clue" (4)',
  'Across 3: "Hidden inside arrIVAN" (4)',
  'Across 4: "Past tense of send" (4)',
];

const DEFAULT_DOWN_CLUES = [
  'Down 1: "The thing here sounds like hiss with a T" (4)',
  'Down 2: "To possess, in a simple hidden-style clue" (4)',
  'Down 3: "Hidden inside arrIVAN" (4)',
  'Down 4: "Past tense of send" (4)',
];

function normalizeWordList(words, fallbackWords) {
  const source = Array.isArray(words) ? words : [];
  const fallback = Array.isArray(fallbackWords) ? fallbackWords : [];
  return Array.from({ length: 4 }, (_, index) =>
    String(source[index] ?? fallback[index] ?? "").trim().toUpperCase().slice(0, 4),
  );
}

function normalizeClueTexts(source, fallback, label) {
  const list = Array.isArray(source) ? source : [];
  const fallbackList = Array.isArray(fallback) ? fallback : [];

  return Array.from({ length: 4 }, (_, index) =>
    String(list[index] ?? fallbackList[index] ?? `${label} ${index + 1}`).trim(),
  );
}

function normalizeEntryList(entries, fallbackWords, fallbackClues, label) {
  const list = Array.isArray(entries) ? entries : [];
  const wordFallback = Array.isArray(fallbackWords) ? fallbackWords : [];
  const clueFallback = Array.isArray(fallbackClues) ? fallbackClues : [];

  return Array.from({ length: 4 }, (_, index) => {
    const entry = list[index] && typeof list[index] === "object" ? list[index] : {};
    return {
      answer: String(entry.answer ?? entry.solution ?? entry.word ?? wordFallback[index] ?? "")
        .trim()
        .toUpperCase()
        .slice(0, 4),
      clue: String(entry.clue ?? entry.text ?? clueFallback[index] ?? `${label} ${index + 1}`).trim(),
    };
  });
}

function clueItems(texts, prefix) {
  return texts.map((text, index) => ({
    id: `${prefix}${index + 1}`,
    text,
  }));
}

export default function ClearCryptics({
  onSolve,
  addToast,
  solutionWords,
  cluesData,
  dailyHint,
  puzzle,
}) {
  const initialPuzzle = useMemo(() => {
    const fallbackRows = Array.isArray(solutionWords) && solutionWords.length === 4
      ? solutionWords
      : ["THIS", "HAVE", "IVAN", "SENT"];
    const miniCryptic = puzzle?.miniCryptic && typeof puzzle.miniCryptic === "object" ? puzzle.miniCryptic : {};
    const sourceGrid = Array.isArray(miniCryptic.grid) && miniCryptic.grid.length ? miniCryptic.grid : fallbackRows;
    const solutionGrid = normalizeGrid(sourceGrid);
    const derivedWords = gridToWords(solutionGrid);
    const legacyClues = Array.isArray(cluesData) ? cluesData : [];

    const acrossEntries = normalizeEntryList(
      miniCryptic.across || miniCryptic.clues?.across,
      derivedWords.across.length === 4 ? derivedWords.across : fallbackRows,
      legacyClues.slice(0, 4),
      "Across",
    );
    const downFallbackClues = legacyClues.length >= 8 ? legacyClues.slice(4, 8) : legacyClues.slice(0, 4);
    const downEntries = normalizeEntryList(
      miniCryptic.down || miniCryptic.clues?.down,
      derivedWords.down.length === 4 ? derivedWords.down : derivedWords.across,
      downFallbackClues,
      "Down",
    );

    return {
      acrossWords: acrossEntries.map((entry) => entry.answer),
      downWords: downEntries.map((entry) => entry.answer),
      clues: {
        across: clueItems(acrossEntries.map((entry) => entry.clue), "A"),
        down: clueItems(downEntries.map((entry) => entry.clue), "D"),
      },
    };
  }, [cluesData, puzzle, solutionWords]);

  const [grid, setGrid] = useState(() => createEmptyGrid());
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 });
  const [direction, setDirection] = useState("across");
  const [solved, setSolved] = useState(false);
  const solvedOnce = useRef(false);

  const currentWords = useMemo(() => gridToWords(grid), [grid]);

  useEffect(() => {
    const rowsSolved = currentWords.across.every((word, index) => word === initialPuzzle.acrossWords[index]);
    const columnsSolved = currentWords.down.every((word, index) => word === initialPuzzle.downWords[index]);

    if (!rowsSolved || !columnsSolved || solvedOnce.current) {
      return;
    }

    solvedOnce.current = true;
    setSolved(true);
    onSolve?.();
    addToast("Cryptics solved! +300 pts — streak increased.", "info");
  }, [addToast, currentWords.across, currentWords.down, initialPuzzle.acrossWords, initialPuzzle.downWords, onSolve]);

  const reset = () => {
    solvedOnce.current = false;
    setGrid(createEmptyGrid());
    setActiveCell({ row: 0, col: 0 });
    setDirection("across");
    setSolved(false);
  };

  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] animate-rise-in">
      <div className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Crossword</div>
            <div className="mt-1 font-serif text-2xl text-zinc-950">Fill the 4x4 grid</div>
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-medium ${solved ? "bg-emerald-100 text-emerald-800" : "bg-sky-50 text-sky-800"}`}>
            {solved ? "Solved" : direction === "across" ? "Across" : "Down"}
          </div>
        </div>

        <MiniCrosswordGrid
          value={grid}
          onChange={setGrid}
          activeCell={activeCell}
          onActiveCellChange={setActiveCell}
          direction={direction}
          onDirectionChange={setDirection}
        />

        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => setDirection((current) => (current === "across" ? "down" : "across"))}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Toggle direction
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Reset grid
          </button>
        </div>

        {dailyHint ? (
          <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            Hint: {dailyHint}
          </p>
        ) : null}

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Current entries</div>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <div className="font-medium text-zinc-900">Across</div>
              <div className="mt-2 space-y-1 text-zinc-600">
                {currentWords.across.map((word, index) => (
                  <div key={`across-${index}`} className={index === activeCell.row ? "font-medium text-zinc-950" : ""}>
                    {index + 1}. {word || "____"}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="font-medium text-zinc-900">Down</div>
              <div className="mt-2 space-y-1 text-zinc-600">
                {currentWords.down.map((word, index) => (
                  <div key={`down-${index}`} className={index === activeCell.col ? "font-medium text-zinc-950" : ""}>
                    {index + 1}. {word || "____"}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Clues</div>
              <div className="mt-1 font-serif text-2xl text-zinc-950">Across and down</div>
            </div>
            <div className="text-xs text-zinc-500">Use Enter or repeated clicks to flip direction</div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-semibold text-zinc-900">Across</div>
              <div className="mt-3 space-y-3">
                {initialPuzzle.clues.across.map((clue, index) => (
                  <div
                    key={clue.id}
                    className={`rounded-xl border px-3 py-2 transition ${
                      index === activeCell.row
                        ? "border-sky-300 bg-sky-50"
                        : "border-transparent bg-white"
                    }`}
                  >
                    <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {clue.id}
                    </div>
                    <div className="mt-1 text-sm text-zinc-700">{clue.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-semibold text-zinc-900">Down</div>
              <div className="mt-3 space-y-3">
                {initialPuzzle.clues.down.map((clue, index) => (
                  <div
                    key={clue.id}
                    className={`rounded-xl border px-3 py-2 transition ${
                      index === activeCell.col
                        ? "border-amber-300 bg-amber-50"
                        : "border-transparent bg-white"
                    }`}
                  >
                    <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {clue.id}
                    </div>
                    <div className="mt-1 text-sm text-zinc-700">{clue.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-lg">
          <div className="text-sm text-zinc-600">Controls</div>
          <div className="mt-3 text-sm text-zinc-600">
            Click a cell to select it, click again to switch between across and down, then use the arrow keys to move.
          </div>
        </div>
      </div>
    </div>
  );
}
