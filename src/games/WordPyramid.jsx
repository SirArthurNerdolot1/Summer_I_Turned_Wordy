import React, { useEffect, useMemo, useState } from "react";
import { getFeedback as defaultGetFeedback } from "../utils/wordUtils";

export default function WordPyramid({ targets, onScoreChange, onComplete, initialLevel = 0, addToast }) {
  const [level, setLevel] = useState(initialLevel);
  const [guesses, setGuesses] = useState([]);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [keyColors, setKeyColors] = useState({});
  const [currentInput, setCurrentInput] = useState("");
  const [solvedFlash, setSolvedFlash] = useState(false);

  useEffect(() => {
    setGuesses([]); setAttempts(0); setKeyColors({}); setCurrentInput(""); setLocked(false); setSolvedFlash(false);
  }, [level]);

  useEffect(() => {
    function onKey(e) {
      if (locked) return;
      const k = e.key;
      if (/^[a-zA-Z]$/.test(k)) {
        setCurrentInput((s) => (s + k.toUpperCase()).slice(0, targets[level].length));
      } else if (k === "Backspace") {
        setCurrentInput((s) => s.slice(0, -1));
      } else if (k === "Enter") {
        submit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, currentInput, level, targets]);

  async function submit() {
    const target = targets[level].toUpperCase();
    const guess = currentInput.toUpperCase();
    if (guess.length !== target.length) { addToast(`Guess must be ${target.length} letters`, "info"); return; }
    setLocked(true);
    try {
      const resp = await fetch(`https://api.datamuse.com/words?sp=${guess.toLowerCase()}&max=1`);
      if (!resp.ok) throw new Error("API");
      const json = await resp.json();
      const valid = Array.isArray(json) && json.length > 0 && json[0].word && json[0].word.toLowerCase() === guess.toLowerCase();
      if (!valid) { addToast("Not in word list", "error"); setLocked(false); return; }
    } catch (err) {
      addToast("Dictionary check failed", "error"); setLocked(false); return;
    }

    const feedback = defaultGetFeedback(guess, target);
    setGuesses((g) => [...g, { guess, feedback }]);
    setAttempts((a) => a + 1);
    setCurrentInput("");

    // update keys
    setKeyColors((kc) => {
      const copy = { ...kc };
      for (let i = 0; i < guess.length; i++) {
        const ch = guess[i];
        const color = feedback[i];
        const priority = { gray: 0, yellow: 1, green: 2 };
        if (!copy[ch] || priority[color] > priority[copy[ch]]) copy[ch] = color;
      }
      return copy;
    });

    setLocked(false);

    // evaluate
    const solved = feedback.every((f) => f === "green");
    if (solved) {
      const remaining = Math.max(0, 5 - (attempts + 1));
      const delta = target.length * Math.max(1, remaining) * 50;
      setSolvedFlash(true);
      onScoreChange(delta);
      addToast(`Solved ${target} — +${delta} pts`, "info");
      if (level + 1 < targets.length) {
        setTimeout(() => {
          setSolvedFlash(false);
          setLevel((l) => l + 1);
        }, 1200);
      } else {
        onComplete?.();
      }
    } else if (attempts + 1 >= 5) {
      addToast(`Out of guesses — solution: ${target}`, "error");
    }
  }

  return (
    <div className="animate-rise-in">
      <div className="flex flex-col items-center gap-2">
        {targets.map((t, idx) => (
          <div key={t} className={`w-full sm:w-2/3 text-center font-serif px-3 py-2 rounded-md border transition-all duration-300 ${idx < level ? "bg-emerald-50 border-emerald-300 shadow-sm" : idx === level ? `bg-yellow-50 border-yellow-300 ${solvedFlash && idx === level ? 'animate-pop-in shadow-lg shadow-yellow-200' : ''}` : "bg-white border-zinc-200"}`}>
            {t.length} letters {idx < level ? "✓" : idx === level ? "(solving)" : ""}
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="space-y-2">
          {guesses.slice(-5).map((g, i) => (
            <div key={i} className="flex gap-1 justify-center animate-pop-in" style={{ animationDelay: `${i * 60}ms` }}>
              {g.guess.split("").map((ch, j) => (
                <div key={j} className={`w-10 h-10 flex items-center justify-center rounded-md font-medium transition-all duration-300 ${g.feedback[j] === "green" ? "bg-emerald-500 text-white scale-100 shadow-md shadow-emerald-200" : g.feedback[j] === "yellow" ? "bg-yellow-400 text-white scale-100 shadow-md shadow-yellow-200" : "bg-zinc-200 text-zinc-800"}`}>{ch}</div>
              ))}
            </div>
          ))}

          <div className="flex gap-1 justify-center mt-2 animate-rise-in">
            {Array.from({ length: targets[level].length }).map((_, i) => (
              <div key={i} className="w-10 h-10 border rounded-md flex items-center justify-center bg-white transition-transform duration-200 hover:-translate-y-0.5"><span className="text-lg font-medium">{currentInput[i] || ""}</span></div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 mt-3 animate-pop-in [animation-delay:180ms]">
            <button onClick={() => setCurrentInput((s) => s.slice(0, -1))} className="px-3 py-1 bg-white border rounded transition duration-200 hover:-translate-y-0.5 hover:bg-zinc-50 active:translate-y-0">Backspace</button>
            <button onClick={submit} disabled={locked} className="px-4 py-1 bg-zinc-900 text-white rounded transition duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 disabled:opacity-50">Enter</button>
          </div>
        </div>
      </div>
    </div>
  );
}
