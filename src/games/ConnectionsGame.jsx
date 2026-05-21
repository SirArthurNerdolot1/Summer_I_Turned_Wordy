import React, { useEffect, useMemo, useState } from "react";

const FALLBACK_SETS = [
  {
    title: "Everyday starters",
    hint: "Look for simple, familiar words that naturally belong together.",
    groups: [
      { title: "Fruit", words: ["PEAR", "PLUM", "FIG", "LIME"] },
      { title: "Light words", words: ["GLOW", "SHINE", "BEAM", "SPARK"] },
      { title: "School tools", words: ["BOOK", "NOTE", "PEN", "RULER"] },
      { title: "Movement", words: ["WALK", "RUN", "JOG", "SKIP"] },
    ],
  },
  {
    title: "Daily language",
    hint: "Choose the set that sounds like a clean, common category.",
    groups: [
      { title: "Agreement", words: ["YES", "YEP", "SURE", "OKAY"] },
      { title: "Travel", words: ["WALK", "RIDE", "DRIVE", "FLY"] },
      { title: "Things you read", words: ["BOOK", "MAP", "MENU", "SIGN"] },
      { title: "Sound words", words: ["BUZZ", "HUM", "WHIR", "CLANG"] },
    ],
  },
  {
    title: "Morning to night",
    hint: "Think about time of day, actions, and calm everyday words.",
    groups: [
      { title: "Time of day", words: ["DAWN", "MORNING", "NOON", "DUSK"] },
      { title: "Water actions", words: ["POUR", "RINSE", "WASH", "DRIP"] },
      { title: "Kitchen verbs", words: ["BAKE", "BOIL", "CHOP", "STIR"] },
      { title: "Quiet words", words: ["QUIET", "STILL", "PEACE", "SILENT"] },
    ],
  },
  {
    title: "Word map",
    hint: "The cleanest answer usually groups by purpose rather than meaning alone.",
    groups: [
      { title: "Shapes", words: ["CIRCLE", "SQUARE", "TRIANGLE", "LINE"] },
      { title: "Colors", words: ["RED", "BLUE", "GREEN", "GOLD"] },
      { title: "Weather", words: ["RAIN", "WIND", "FOG", "SNOW"] },
      { title: "Writing", words: ["WORD", "LETTER", "NOTE", "TEXT"] },
    ],
  },
];

const GROUP_THEMES = [
  {
    chip: "bg-sky-100 text-sky-900 border-sky-200",
    solved: "bg-sky-50 border-sky-200 text-sky-950",
  },
  {
    chip: "bg-emerald-100 text-emerald-900 border-emerald-200",
    solved: "bg-emerald-50 border-emerald-200 text-emerald-950",
  },
  {
    chip: "bg-amber-100 text-amber-900 border-amber-200",
    solved: "bg-amber-50 border-amber-200 text-amber-950",
  },
  {
    chip: "bg-rose-100 text-rose-900 border-rose-200",
    solved: "bg-rose-50 border-rose-200 text-rose-950",
  },
];

function getLocalDateKey(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function hashDateKey(dateKey) {
  return Array.from(String(dateKey)).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function seededRandom(seed) {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffle(items, seed) {
  const nextRandom = seededRandom(seed);
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function normalizeWords(words) {
  return Array.isArray(words)
    ? words
        .map((word) => String(word).trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 4)
    : [];
}

function normalizeGroup(rawGroup, index) {
  const title = String(rawGroup?.title || rawGroup?.label || rawGroup?.name || rawGroup?.category || `Group ${index + 1}`).trim();
  return {
    id: `group-${index}`,
    title,
    words: normalizeWords(rawGroup?.words || rawGroup?.items || rawGroup?.tiles),
  };
}

function chooseFallbackSet(dateKey) {
  return FALLBACK_SETS[hashDateKey(dateKey) % FALLBACK_SETS.length];
}

function buildDailyPuzzle(puzzle, dateKey) {
  const incomingGroups = Array.isArray(puzzle?.connectionsGroups)
    ? puzzle.connectionsGroups
    : Array.isArray(puzzle?.connections)
      ? puzzle.connections
      : null;

  if (incomingGroups && incomingGroups.length === 4) {
    const groups = incomingGroups.map((group, index) => normalizeGroup(group, index)).filter((group) => group.words.length === 4);
    const flatWords = groups.flatMap((group) => group.words);
    if (groups.length === 4 && new Set(flatWords).size >= 16) {
      return {
        source: "server",
        title: String(puzzle?.connectionsTitle || puzzle?.title || "Daily Connections").trim(),
        hint: String(puzzle?.connectionsHint || puzzle?.connectionsNote || "").trim(),
        groups,
      };
    }
  }

  const fallback = chooseFallbackSet(dateKey);
  return {
    source: "fallback",
    title: fallback.title,
    hint: fallback.hint,
    groups: fallback.groups.map((group, index) => normalizeGroup(group, index)),
  };
}

function sameWordSet(left, right) {
  if (left.length !== right.length) {
    return false;
  }
  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  return leftSorted.every((word, index) => word === rightSorted[index]);
}

export default function ConnectionsGame({ puzzle, addToast, onScoreChange, onComplete, dateKey }) {
  const [selectedWords, setSelectedWords] = useState([]);
  const [solvedGroupIds, setSolvedGroupIds] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [locked, setLocked] = useState(false);
  const [flashGroupId, setFlashGroupId] = useState("");

  const dailyKey = dateKey || getLocalDateKey();

  const dailyPuzzle = useMemo(() => buildDailyPuzzle(puzzle, dailyKey), [puzzle, dailyKey]);
  const puzzleSignature = useMemo(
    () => dailyPuzzle.groups.map((group) => `${group.id}:${group.title}:${group.words.join("|")}`).join("||"),
    [dailyPuzzle],
  );

  const allWords = useMemo(() => dailyPuzzle.groups.flatMap((group) => group.words), [dailyPuzzle]);

  useEffect(() => {
    setSelectedWords([]);
    setSolvedGroupIds([]);
    setMistakes(0);
    setLocked(false);
    setFlashGroupId("");
  }, [dailyKey, puzzleSignature]);

  useEffect(() => {
    if (!flashGroupId) {
      return undefined;
    }
    const timerId = window.setTimeout(() => setFlashGroupId(""), 900);
    return () => window.clearTimeout(timerId);
  }, [flashGroupId]);

  function toggleWord(word) {
    if (locked || solvedGroupIds.length === 4) {
      return;
    }
    setSelectedWords((current) => {
      if (current.includes(word)) {
        return current.filter((item) => item !== word);
      }
      if (current.length >= 4) {
        return current;
      }
      return [...current, word];
    });
  }

  function clearSelection() {
    if (locked) {
      return;
    }
    setSelectedWords([]);
  }

  function resetPuzzle() {
    setSelectedWords([]);
    setSolvedGroupIds([]);
    setMistakes(0);
    setLocked(false);
    setFlashGroupId("");
  }

  function revealSolution() {
    setLocked(true);
    setSelectedWords([]);
  }

  function submitSelection() {
    if (locked || selectedWords.length !== 4) {
      addToast?.("Pick exactly four words first.", "info");
      return;
    }

    const solvedGroup = dailyPuzzle.groups.find((group) => !solvedGroupIds.includes(group.id) && sameWordSet(group.words, selectedWords));

    if (solvedGroup) {
      const nextSolvedCount = solvedGroupIds.length + 1;
      setSolvedGroupIds((current) => [...current, solvedGroup.id]);
      setSelectedWords([]);
      setFlashGroupId(solvedGroup.id);
      onScoreChange?.(100);
      addToast?.(`Locked in: ${solvedGroup.title}`, "info");

      if (nextSolvedCount === 4) {
        setLocked(true);
        onComplete?.();
        addToast?.("Connections solved for today.", "info");
      }
      return;
    }

    const nextMistakes = mistakes + 1;
    setMistakes(nextMistakes);
    setSelectedWords([]);
    addToast?.(nextMistakes >= 4 ? "No strikes left. Review the solution below." : `Not quite. ${4 - nextMistakes} mistake${nextMistakes === 3 ? "" : "s"} left.`, "error");
    if (nextMistakes >= 4) {
      revealSolution();
    }
  }

  const solvedGroups = dailyPuzzle.groups.filter((group) => solvedGroupIds.includes(group.id));
  const unsolvedGroups = dailyPuzzle.groups.filter((group) => !solvedGroupIds.includes(group.id));

  return (
    <div className="animate-rise-in">
      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Daily Connections</div>
            <h3 className="mt-1 font-serif text-3xl text-zinc-950">{dailyPuzzle.title}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Pick four words that belong together, then submit the set. You get four mistakes, and each solved group stays locked in place.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs text-zinc-600 sm:w-[16rem]">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">Solved</div>
              <div className="mt-1 text-lg font-medium text-zinc-950">{solvedGroupIds.length}/4</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">Mistakes</div>
              <div className="mt-1 text-lg font-medium text-zinc-950">{mistakes}/4</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">Mode</div>
              <div className="mt-1 text-lg font-medium text-zinc-950">{dailyPuzzle.source === "server" ? "Live" : "Fallback"}</div>
            </div>
          </div>
        </div>

        {dailyPuzzle.hint ? <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">Hint: {dailyPuzzle.hint}</div> : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {allWords.map((word, index) => {
            const isSelected = selectedWords.includes(word);
            const solvedGroupIndex = dailyPuzzle.groups.findIndex((group) => solvedGroupIds.includes(group.id) && group.words.includes(word));
            const solvedTheme = solvedGroupIndex >= 0 ? GROUP_THEMES[solvedGroupIndex % GROUP_THEMES.length] : null;
            return (
              <button
                key={word}
                type="button"
                onClick={() => toggleWord(word)}
                disabled={locked || solvedGroupIndex >= 0}
                className={`min-h-16 rounded-2xl border px-3 py-3 text-center text-sm font-medium tracking-wide transition duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-100 ${
                  solvedTheme ? `${solvedTheme.solved} shadow-sm` : isSelected ? "border-zinc-950 bg-zinc-950 text-white shadow-lg shadow-zinc-200 scale-[1.02]" : "border-zinc-200 bg-white text-zinc-800"
                } ${flashGroupId && solvedGroupIndex >= 0 ? "animate-pop-in" : ""}`}
                style={{ animationDelay: `${index * 35}ms` }}
                aria-pressed={isSelected}
              >
                {word}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={submitSelection}
            disabled={locked || selectedWords.length !== 4}
            className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Submit group
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:-translate-y-0.5 hover:bg-zinc-50"
          >
            Clear selection
          </button>
          <button
            type="button"
            onClick={resetPuzzle}
            className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:-translate-y-0.5 hover:bg-zinc-50"
          >
            Reset board
          </button>
          <div className="text-sm text-zinc-500">
            {selectedWords.length === 0 ? "Select four words to test a set." : `${selectedWords.length}/4 selected.`}
          </div>
        </div>

        {solvedGroups.length ? (
          <div className="mt-6 grid gap-3">
            {solvedGroups.map((group, index) => {
              const theme = GROUP_THEMES[index % GROUP_THEMES.length];
              return (
                <div key={group.id} className={`rounded-2xl border px-4 py-3 ${theme.solved} animate-pop-in`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${theme.chip}`}>{group.title}</div>
                    <div className="text-xs text-zinc-500">Locked in</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.words.map((word) => (
                      <span key={word} className="rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-zinc-900 shadow-sm">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {locked && solvedGroupIds.length < 4 ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            The board is locked for today. Review the remaining sets below or come back tomorrow.
          </div>
        ) : null}

        {locked && solvedGroupIds.length < 4 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {unsolvedGroups.map((group, index) => {
              const theme = GROUP_THEMES[(index + solvedGroups.length) % GROUP_THEMES.length];
              return (
                <div key={group.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${theme.chip}`}>{group.title}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.words.map((word) => (
                      <span key={word} className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-700">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}