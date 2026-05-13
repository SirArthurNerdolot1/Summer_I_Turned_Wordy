import React, { useEffect, useMemo, useState } from "react";

const defaultSolution = [
  ["T", "H", "I", "S"],
  ["H", "A", "V", "E"],
  ["I", "V", "A", "N"],
  ["S", "E", "N", "T"],
];

const defaultClues = [
  { id: "A1", dir: "across", text: 'Across 1: "The thing here sounds like hiss with a T (4)' },
  { id: "A2", dir: "across", text: 'Across 2: "To possess (sounds like of) + E? (4)' },
  { id: "A3", dir: "across", text: 'Across 3: "Hidden in arrIVAN (4)' },
  { id: "A4", dir: "across", text: 'Across 4: "Past tense of send (4)' },
];

export default function ClearCryptics({ onSolve, addToast, solutionWords, cluesData, dailyHint }) {
  const solution = useMemo(() => {
    const words = Array.isArray(solutionWords) && solutionWords.length === 4 ? solutionWords : ['THIS', 'HAVE', 'IVAN', 'SENT'];
    return words.map((word) => String(word).trim().toUpperCase().slice(0, 4).padEnd(4, ' '));
  }, [solutionWords]);

  const clues = useMemo(() => {
    if (Array.isArray(cluesData) && cluesData.length === 4) {
      return cluesData.map((text, index) => ({ id: `A${index + 1}`, dir: 'across', text: String(text) }));
    }
    return defaultClues;
  }, [cluesData]);

  const empty = useMemo(() => Array.from({ length: 4 }, () => Array(4).fill("")), []);
  const [grid, setGrid] = useState(empty);
  const [active, setActive] = useState({ r: 0, c: 0 });
  const [dir, setDir] = useState("across");

  useEffect(() => {
    function onKey(e) {
      const k = e.key;
      if (k === "Enter") { setDir((d) => d === "across" ? "down" : "across"); return; }
      if (k === "ArrowRight") return setActive((p) => ({ r: p.r, c: Math.min(3, p.c + 1) }));
      if (k === "ArrowLeft") return setActive((p) => ({ r: p.r, c: Math.max(0, p.c - 1) }));
      if (k === "ArrowUp") return setActive((p) => ({ r: Math.max(0, p.r - 1), c: p.c }));
      if (k === "ArrowDown") return setActive((p) => ({ r: Math.min(3, p.r + 1), c: p.c }));
      if (k === "Backspace") {
        setGrid((g) => { const cpy = g.map(r=>r.slice()); cpy[active.r][active.c] = ""; return cpy; });
        if (dir === "across") setActive((p) => ({ r: p.r, c: Math.max(0, p.c - 1) })); else setActive((p) => ({ r: Math.max(0, p.r - 1), c: p.c }));
        return;
      }
      if (/^[a-zA-Z]$/.test(k)) {
        setGrid((g) => { const cpy = g.map(r=>r.slice()); cpy[active.r][active.c] = k.toUpperCase(); return cpy; });
        if (dir === "across") setActive((p) => ({ r: p.r, c: Math.min(3, p.c + 1) })); else setActive((p) => ({ r: Math.min(3, p.r + 1), c: p.c }));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, dir]);

  useEffect(() => {
    const all = grid.flat().every((ch) => ch && ch.length === 1);
    if (!all) return;
    let ok = true;
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        if (grid[r][c] !== solution[r][c]) ok = false;
      }
    }
    if (ok) {
      onSolve?.();
      addToast("Cryptics solved! +300 pts — streak increased.", "info");
    }
  }, [grid, solution, onSolve, addToast]);

  function clickCell(r,c){
    setActive((p)=>{ if (p.r===r && p.c===c){ setDir((d)=> d==='across'?'down':'across'); return {r,c}; } return {r,c}; });
  }

  function reset(){ setGrid(empty); setActive({r:0,c:0}); setDir('across'); }

  return (
    <div className="mt-4 flex flex-col md:flex-row gap-6">
      <div className="bg-white border border-zinc-200 p-4 rounded">
        <div className="grid grid-cols-4 gap-1">
          {grid.map((row,r)=>row.map((cell,c)=>{
            const isActive = active.r===r && active.c===c;
            const activePath = dir==='across' ? (active.r===r) : (active.c===c);
            return (
              <div key={`${r}-${c}`} onClick={()=>clickCell(r,c)} className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center border rounded-sm cursor-pointer select-none ${isActive? 'bg-yellow-200': activePath? 'bg-sky-100':'bg-white'}`}>
                <div className="text-lg font-medium">{cell}</div>
              </div>
            );
          }))}
        </div>
        <div className="mt-3 text-sm text-zinc-500">Click cell to select/toggle direction. Use arrows and typing.</div>
      </div>

      <div className="flex-1">
        <div className="bg-white border border-zinc-200 p-4 rounded mb-4">
          <div className="mb-2 font-medium">Clues</div>
          {dailyHint ? <p className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">Hint: {dailyHint}</p> : null}
          <div className="space-y-2">
            {clues.map((cl)=> (
              <div key={cl.id} className="p-2 rounded">
                <div className="text-sm font-medium">{cl.id}</div>
                <div className="text-xs text-zinc-600">{cl.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-4 rounded">
          <div className="text-sm text-zinc-600 mb-2">Controls</div>
          <div className="flex gap-2">
            <button onClick={()=>setDir(d=>d==='across'?'down':'across')} className="px-3 py-1 border rounded">Toggle Direction</button>
            <button onClick={reset} className="px-3 py-1 border rounded">Reset</button>
          </div>
        </div>
      </div>
    </div>
  );
}
