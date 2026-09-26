// Entraînement hors-ligne par self-play, avec mesure des progrès.
// Usage : node scripts/train.js [parties] [fichier_sortie.json]
const fs = require('fs');
const B = require('../src/engine.js');

const TOTAL = parseInt(process.argv[2] || '50000', 10);
const OUT = process.argv[3];
const EVAL_EVERY = Math.max(1000, Math.floor(TOTAL / 20));
const rng = B.makeRng(42);
const evalRng = B.makeRng(7);
const net = B.createNet(96, 1);
const history = [];

function report() {
  const vsRandom = B.evaluate(net, B.randomPlayer, 200, { rng: evalRng });
  const vsTact = B.evaluate(net, B.tacticianPlayer, 200, { rng: evalRng });
  history.push({ games: net.gamesTrained, vsRandom: vsRandom.score, vsTact: vsTact.score });
  const vsTact3 = B.evaluate(net, B.tacticianPlayer, 100, { rng: evalRng, depth: 3 });
  console.log(`${String(net.gamesTrained).padStart(7)} parties | vs hasard ${(vsRandom.score * 100).toFixed(0).padStart(3)}% | vs tacticien ${(vsTact.score * 100).toFixed(0).padStart(3)}% | vs tacticien (avec recherche) ${(vsTact3.score * 100).toFixed(0).padStart(3)}%`);
}

const t0 = Date.now();
report();
for (let g = 1; g <= TOTAL; g++) {
  const frac = g / TOTAL;
  B.selfPlayGame(net, { lr: 0.01 * (1 - 0.7 * frac), epsilon: 0.15 * (1 - frac) + 0.03, rng });
  if (g % EVAL_EVERY === 0) report();
}
console.log(`durée : ${((Date.now() - t0) / 1000).toFixed(0)} s`);
if (OUT) { fs.writeFileSync(OUT, JSON.stringify(Object.assign(B.serialize(net), { history }))); console.log('poids écrits dans', OUT); }
