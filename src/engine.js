// Bascule : un Puissance 4 en 6x6 où l'on peut aussi faire pivoter le plateau.
// Moteur de jeu + réseau de neurones + apprentissage par self-play (TD-learning).
// Aucune dépendance : tourne dans le navigateur (worker) et dans Node.

(function (root) {
  'use strict';

  const N = 6;
  const CELLS = N * N;
  const TILTS_PER_PLAYER = 2;
  const ACT_DROP = N;        // actions 0..5 : lâcher un jeton dans la colonne
  const ACT_TILT_LEFT = 6;   // le plateau bascule à gauche (rotation antihoraire)
  const ACT_TILT_RIGHT = 7;  // le plateau bascule à droite (rotation horaire)
  const NUM_ACTIONS = 8;

  // Toutes les lignes de 4 cases possibles sur le plateau.
  const LINES = [];
  (function buildLines() {
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        for (const [dr, dc] of dirs) {
          const er = r + 3 * dr, ec = c + 3 * dc;
          if (er < 0 || er >= N || ec < 0 || ec >= N) continue;
          LINES.push([0, 1, 2, 3].map(k => (r + k * dr) * N + (c + k * dc)));
        }
      }
    }
  })();

  // ---------- Jeu ----------
  // Joueurs : 1 et -1. board[r*N+c], r=0 en haut.
  function newGame() {
    return { board: new Int8Array(CELLS), toMove: 1, tilts: { '1': TILTS_PER_PLAYER, '-1': TILTS_PER_PLAYER }, winner: null, over: false, moves: 0 };
  }

  function cloneState(s) {
    return { board: s.board.slice(), toMove: s.toMove, tilts: { '1': s.tilts['1'], '-1': s.tilts['-1'] }, winner: s.winner, over: s.over, moves: s.moves };
  }

  function applyGravity(b) {
    for (let c = 0; c < N; c++) {
      let w = N - 1;
      for (let r = N - 1; r >= 0; r--) {
        const v = b[r * N + c];
        if (v !== 0) { b[r * N + c] = 0; b[w * N + c] = v; w--; }
      }
    }
  }

  function rotate(b, clockwise) {
    const out = new Int8Array(CELLS);
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        out[r * N + c] = clockwise ? b[(N - 1 - c) * N + r] : b[c * N + (N - 1 - r)];
      }
    }
    return out;
  }

  function isFull(b) {
    for (let c = 0; c < N; c++) if (b[c] === 0) return false;
    return true;
  }

  function legalActions(s) {
    if (s.over) return [];
    const acts = [];
    for (let c = 0; c < N; c++) if (s.board[c] === 0) acts.push(c);
    if (s.tilts[String(s.toMove)] > 0 && s.moves > 0) acts.push(ACT_TILT_LEFT, ACT_TILT_RIGHT);
    return acts;
  }

  function linesOf(b, p) {
    for (let i = 0; i < LINES.length; i++) {
      const L = LINES[i];
      if (b[L[0]] === p && b[L[1]] === p && b[L[2]] === p && b[L[3]] === p) return true;
    }
    return false;
  }

  // Joue un coup. Renvoie un NOUVEL état (l'original n'est pas modifié).
  function play(s, a) {
    const n = cloneState(s);
    const p = s.toMove;
    if (a < ACT_DROP) {
      let r = N - 1;
      while (r >= 0 && n.board[r * N + a] !== 0) r--;
      if (r < 0) throw new Error('colonne pleine');
      n.board[r * N + a] = p;
    } else {
      n.board = rotate(n.board, a === ACT_TILT_RIGHT);
      applyGravity(n.board);
      n.tilts[String(p)]--;
    }
    n.moves++;
    const me = linesOf(n.board, p), them = linesOf(n.board, -p);
    if (me && them) { n.over = true; n.winner = 0; }
    else if (me) { n.over = true; n.winner = p; }
    else if (them) { n.over = true; n.winner = -p; }
    else if (isFull(n.board)) { n.over = true; n.winner = 0; }
    n.toMove = -p;
    return n;
  }

  // ---------- Réseau de neurones ----------
  // Évalue une position du point de vue du joueur `p` : sortie dans [-1, 1]
  // (+1 = p va gagner, -1 = p va perdre).
  const IN = CELLS * 2 + 4;

  function encode(s, p, x) {
    for (let i = 0; i < CELLS; i++) {
      const v = s.board[i];
      x[i] = v === p ? 1 : 0;
      x[CELLS + i] = v === -p ? 1 : 0;
    }
    x[2 * CELLS] = s.tilts[String(p)] / TILTS_PER_PLAYER;
    x[2 * CELLS + 1] = s.tilts[String(-p)] / TILTS_PER_PLAYER;
    x[2 * CELLS + 2] = s.toMove === p ? 1 : 0; // qui joue ensuite
    x[2 * CELLS + 3] = 1; // biais
    return x;
  }

  function makeRng(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createNet(hidden, seed) {
    const rng = makeRng(seed || 1);
    const H = hidden || 96;
    const w1 = new Float32Array(H * IN), b1 = new Float32Array(H), w2 = new Float32Array(H);
    const s1 = Math.sqrt(1 / IN), s2 = Math.sqrt(1 / H);
    for (let i = 0; i < w1.length; i++) w1[i] = (rng() * 2 - 1) * s1;
    for (let i = 0; i < H; i++) w2[i] = (rng() * 2 - 1) * s2;
    return { H, w1, b1, w2, b2: 0, x: new Float32Array(IN), h: new Float32Array(H), gamesTrained: 0 };
  }

  function forward(net, s, p) {
    const { H, w1, b1, w2, x, h } = net;
    encode(s, p, x);
    let out = net.b2;
    for (let j = 0; j < H; j++) {
      let z = b1[j];
      const off = j * IN;
      for (let i = 0; i < IN; i++) { const xi = x[i]; if (xi !== 0) z += w1[off + i] * xi; }
      const a = Math.tanh(z);
      h[j] = a;
      out += w2[j] * a;
    }
    return Math.tanh(out);
  }

  // Descente de gradient sur (s, p) vers `target`.
  function train(net, s, p, target, lr) {
    const y = forward(net, s, p);
    const { H, w1, b1, w2, x, h } = net;
    const dOut = (y - target) * (1 - y * y);
    for (let j = 0; j < H; j++) {
      const dh = dOut * w2[j] * (1 - h[j] * h[j]);
      w2[j] -= lr * dOut * h[j];
      if (dh === 0) continue;
      b1[j] -= lr * dh;
      const off = j * IN;
      for (let i = 0; i < IN; i++) { const xi = x[i]; if (xi !== 0) w1[off + i] -= lr * dh * xi; }
    }
    net.b2 -= lr * dOut;
    return y;
  }

  // Valeur d'un état (après un coup de `p`) du point de vue de `p`.
  function valueAfter(net, s, p) {
    if (s.over) return s.winner === 0 ? 0 : (s.winner === p ? 1 : -1);
    return forward(net, s, p);
  }

  // ---------- Choix d'un coup ----------
  // Minimax alpha-bêta ; le réseau évalue les feuilles. depth=1 → le réseau seul.
  function negamax(net, s, depth, alpha, beta) {
    // Renvoie la valeur pour le joueur qui doit jouer dans s.
    if (s.over) return s.winner === 0 ? 0 : (s.winner === s.toMove ? 1 : -1);
    const p = s.toMove;
    const acts = legalActions(s);
    let best = -Infinity;
    for (const a of acts) {
      const n = play(s, a);
      const v = depth <= 1 ? valueAfter(net, n, p) : -negamax(net, n, depth - 1, -beta, -alpha);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  function chooseAction(net, s, opts) {
    opts = opts || {};
    const depth = opts.depth || 1;
    const eps = opts.epsilon || 0;
    const rng = opts.rng || Math.random;
    const acts = legalActions(s);
    if (eps > 0 && rng() < eps) return { action: acts[Math.floor(rng() * acts.length)], value: null, scores: null };
    const p = s.toMove;
    let best = -Infinity, bestA = acts[0];
    const scores = {};
    for (const a of acts) {
      const n = play(s, a);
      let v = depth <= 1 ? valueAfter(net, n, p) : -negamax(net, n, depth - 1, -Infinity, Infinity);
      scores[a] = v;
      v += rng() * 1e-6; // départage aléatoire
      if (v > best) { best = v; bestA = a; }
    }
    return { action: bestA, value: best, scores };
  }

  // ---------- Adversaires de référence (pour mesurer les progrès) ----------
  function randomPlayer(s, rng) {
    const acts = legalActions(s);
    return acts[Math.floor((rng || Math.random)() * acts.length)];
  }

  // Tacticien codé à la main : gagne s'il peut, sinon évite les coups qui
  // offrent une victoire immédiate à l'adversaire, sinon joue au hasard.
  function tacticianPlayer(s, rng) {
    rng = rng || Math.random;
    const acts = legalActions(s);
    const p = s.toMove;
    const safe = [];
    for (const a of acts) {
      const n = play(s, a);
      if (n.over && n.winner === p) return a;
      if (n.over) { if (n.winner === 0) safe.push(a); continue; }
      let losing = false;
      for (const b of legalActions(n)) {
        const m = play(n, b);
        if (m.over && m.winner === -p) { losing = true; break; }
      }
      if (!losing) safe.push(a);
    }
    const pool = safe.length ? safe : acts;
    return pool[Math.floor(rng() * pool.length)];
  }

  // ---------- Self-play ----------
  // L'IA joue contre elle-même. Après chaque coup, la position précédente du même
  // joueur est rapprochée de la valeur de la nouvelle (TD(0) sur les « afterstates »).
  function selfPlayGame(net, opts) {
    opts = opts || {};
    const lr = opts.lr || 0.01;
    const eps = opts.epsilon == null ? 0.1 : opts.epsilon;
    const rng = opts.rng || Math.random;
    let s = newGame();
    const last = { '1': null, '-1': null };
    while (!s.over) {
      const p = s.toMove;
      const { action } = chooseAction(net, s, { depth: 1, epsilon: eps, rng });
      const n = play(s, action);
      const prev = last[String(p)];
      if (prev) train(net, prev, p, valueAfter(net, n, p), lr);
      last[String(p)] = n;
      s = n;
    }
    // Fin de partie : chaque joueur apprend le résultat réel.
    for (const p of [1, -1]) {
      const prev = last[String(p)];
      if (!prev) continue;
      const z = s.winner === 0 ? 0 : (s.winner === p ? 1 : -1);
      if (!prev.over) train(net, prev, p, z, lr);
    }
    net.gamesTrained++;
    return s.winner;
  }

  // Joue `games` parties contre un adversaire (alterne qui commence).
  // Renvoie le score de l'IA : victoires + 0.5 * nuls, divisé par le nombre de parties.
  function evaluate(net, opponent, games, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    let score = 0, wins = 0, draws = 0, losses = 0;
    for (let g = 0; g < games; g++) {
      let s = newGame();
      const aiSide = g % 2 === 0 ? 1 : -1;
      while (!s.over) {
        const a = s.toMove === aiSide
          ? chooseAction(net, s, { depth: opts.depth || 1, rng }).action
          : opponent(s, rng);
        s = play(s, a);
      }
      if (s.winner === aiSide) { wins++; score += 1; }
      else if (s.winner === 0) { draws++; score += 0.5; }
      else losses++;
    }
    return { score: score / games, wins, draws, losses };
  }

  // ---------- Sauvegarde ----------
  function b64(arr) {
    const u8 = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64');
  }
  function unb64(str) {
    const s = typeof atob === 'function' ? atob(str) : Buffer.from(str, 'base64').toString('binary');
    const u8 = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
    return new Float32Array(u8.buffer);
  }
  function serialize(net) {
    return { H: net.H, w1: b64(net.w1), b1: b64(net.b1), w2: b64(net.w2), b2: net.b2, gamesTrained: net.gamesTrained };
  }
  function deserialize(o) {
    const net = createNet(o.H, 1);
    net.w1 = unb64(o.w1); net.b1 = unb64(o.b1); net.w2 = unb64(o.w2); net.b2 = o.b2; net.gamesTrained = o.gamesTrained || 0;
    return net;
  }

  const api = {
    N, NUM_ACTIONS, ACT_DROP, ACT_TILT_LEFT, ACT_TILT_RIGHT, TILTS_PER_PLAYER, LINES,
    newGame, cloneState, play, legalActions, linesOf, rotate, applyGravity,
    createNet, forward, train, chooseAction, selfPlayGame, evaluate,
    randomPlayer, tacticianPlayer, makeRng, serialize, deserialize,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Bascule = api;
})(typeof self !== 'undefined' ? self : this);
