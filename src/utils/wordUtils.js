export function getFeedback(guess, target) {
  const g = guess.toUpperCase(); const t = target.toUpperCase();
  const feedback = Array(g.length).fill("gray");
  const counts = {};
  for (let i=0;i<t.length;i++){ if (g[i]!==t[i]) counts[t[i]] = (counts[t[i]]||0)+1; }
  for (let i=0;i<g.length;i++) if (g[i]===t[i]) feedback[i] = "green";
  for (let i=0;i<g.length;i++){ if (feedback[i]==='green') continue; const ch = g[i]; if (counts[ch]){ feedback[i] = 'yellow'; counts[ch]--; } }
  return feedback;
}
