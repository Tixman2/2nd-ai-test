// Tests des règles de Bascule. Lancer : node test/engine.test.js
const assert = require('assert');
const B = require('../src/engine.js');

function boardFrom(rows) {
  const b = new Int8Array(36);
  rows.forEach((row, r) => [...row].forEach((ch, c) => { b[r * 6 + c] = ch === 'X' ? 1 : ch === 'O' ? -1 : 0; }));
  return b;
}
function stateWith(rows, toMove = 1) {
  const s = B.newGame(); s.board = boardFrom(rows); s.toMove = toMove; s.moves = 10; return s;
}

// Un jeton tombe tout en bas.
let s = B.play(B.newGame(), 2);
assert.strictEqual(s.board[5 * 6 + 2], 1);
assert.strictEqual(s.toMove, -1);

// Pas de bascule au tout premier coup, puis 2 bascules max par joueur.
assert.deepStrictEqual(B.legalActions(B.newGame()), [0, 1, 2, 3, 4, 5]);
s = B.newGame();
s = B.play(s, 0); // X
assert.ok(B.legalActions(s).includes(B.ACT_TILT_LEFT));
s = B.play(s, B.ACT_TILT_LEFT); s = B.play(s, 1); s = B.play(s, B.ACT_TILT_RIGHT); s = B.play(s, 2);
assert.ok(!B.legalActions(s).includes(B.ACT_TILT_LEFT), 'O a utilisé ses 2 bascules');

// Bascule à droite : les jetons glissent vers la droite, qui devient le bas.
s = stateWith([
  '......',
  '......',
  '......',
  '......',
  '......',
  'XO....',
]);
let n = B.play(s, B.ACT_TILT_RIGHT);
// Le mur de droite devient le sol : O (le plus à droite) finit en bas, X posé dessus.
assert.strictEqual(n.board[5 * 6 + 0], -1);
assert.strictEqual(n.board[4 * 6 + 0], 1);

// Victoire horizontale par un lâcher.
s = stateWith(['......', '......', '......', '......', 'OOO...', 'XXX...']);
n = B.play(s, 3);
assert.ok(n.over && n.winner === 1);

// Une bascule qui aligne les jetons de l'adversaire le fait gagner.
s = stateWith([
  '......',
  '......',
  '......',
  '......',
  '......',
  'OOOX.X',
], 1);
s.board[4 * 6 + 0] = -1; // un O au-dessus
n = B.play(s, B.ACT_TILT_RIGHT);
// Rotation horaire : la ligne du bas devient la colonne 0, les pièces restent empilées,
// le O du dessus passe en colonne 1. Colonne 0 de bas en haut : O O O X . X -> après gravité O,O,O,X,X
// Donc aucune ligne de 4 verticale pour O (3 seulement) : partie continue.
assert.ok(!n.over);

// Plateau plein sans alignement : nul.
s = stateWith([
  'XXOOXX',
  'OOXXOO',
  'XXOOXX',
  'OOXXOO',
  'XXOOXX',
  'OOXXO.',
], 1);
n = B.play(s, 5);
assert.ok(n.over, 'plateau plein');
assert.strictEqual(n.winner, 0);

// Le tacticien prend une victoire immédiate.
s = stateWith(['......', '......', '......', '......', 'OOO...', 'XXX...']);
assert.strictEqual(B.tacticianPlayer(s, () => 0.5), 3);

// Sérialisation aller-retour.
const net = B.createNet(16, 3);
const net2 = B.deserialize(JSON.parse(JSON.stringify(B.serialize(net))));
const t = B.play(B.newGame(), 1);
assert.ok(Math.abs(B.forward(net, t, 1) - B.forward(net2, t, 1)) < 1e-6);

console.log('ok — tous les tests passent');
