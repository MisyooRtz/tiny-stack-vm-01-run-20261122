// Tiny stack VM (ISA v1). Env MAKEFUN_INPUT_DIR / MAKEFUN_OUTPUT_DIR.
// For each <id>: read program.bin + input.bin, write stdout.bin + exit.txt.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
const IN = process.env.MAKEFUN_INPUT_DIR || "/input";
const OUT = process.env.MAKEFUN_OUTPUT_DIR || "/output";
// opcode -> [imm, pops, pushes]
const OPS = new Map([
  [0, [0, 0, 0]], [1, [1, 0, 1]], [2, [4, 0, 1]], [3, [0, 1, 0]], [4, [0, 1, 2]],
  [5, [0, 2, 2]], [6, [0, 2, 3]], [7, [0, 3, 3]], [16, [0, 2, 1]], [17, [0, 2, 1]],
  [18, [0, 2, 1]], [19, [0, 2, 1]], [20, [0, 2, 1]], [21, [0, 2, 1]], [22, [0, 2, 1]],
  [23, [0, 1, 1]], [24, [0, 2, 1]], [25, [0, 2, 1]], [26, [0, 2, 1]], [27, [0, 1, 1]],
  [28, [0, 2, 1]], [29, [0, 2, 1]], [30, [0, 2, 1]], [32, [0, 2, 1]], [33, [0, 2, 1]],
  [34, [0, 2, 1]], [48, [2, 0, 0]], [49, [2, 1, 0]], [50, [2, 1, 0]], [51, [2, 0, 0]],
  [52, [0, 0, 0]], [64, [0, 1, 1]], [65, [0, 2, 0]], [80, [0, 1, 0]], [81, [0, 1, 0]],
  [82, [0, 0, 1]], [83, [0, 1, 0]],
]);
function run(p, input) {
  const n = p.length, st = new Int32Array(256), cs = new Int32Array(64), mem = new Int32Array(256);
  const out = new Uint8Array(65536), enc = new TextEncoder();
  let sp = 0, cp = 0, ol = 0, ip = 0, pc = 0, steps = 0;
  const done = (e) => ({ out: out.subarray(0, ol), exit: e });
  for (;;) {
    if (steps === 1000000) return done(10);
    if (pc < 0 || pc >= n) return done(9);
    const op = OPS.get(p[pc]);
    if (!op) return done(5);
    const [imm, pops, pushes] = op;
    if (pc + imm >= n) return done(9);
    steps++;
    const nx = pc + 1 + imm;
    if (sp < pops) return done(2);
    if (sp - pops + pushes > 256) return done(3);
    pc = nx;
    const c = p[nx - 1 - imm];
    if (c === 0) return done(0);
    if (c === 1) { st[sp++] = (p[nx - 1] << 24) >> 24; continue; }
    if (c === 2) { st[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24); continue; }
    if (c === 3) { sp--; continue; }
    if (c === 4) { st[sp] = st[sp - 1]; sp++; continue; }
    if (c === 5) { const t = st[sp - 1]; st[sp - 1] = st[sp - 2]; st[sp - 2] = t; continue; }
    if (c === 6) { st[sp] = st[sp - 2]; sp++; continue; }
    if (c === 7) { const a = st[sp - 3]; st[sp - 3] = st[sp - 2]; st[sp - 2] = st[sp - 1]; st[sp - 1] = a; continue; }
    if (c === 23) { st[sp - 1] = -st[sp - 1] | 0; continue; }
    if (c === 27) { st[sp - 1] = ~st[sp - 1]; continue; }
    if (c === 48) { pc = nx + (((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16); continue; }
    if (c === 49 || c === 50) {
      const v = st[--sp], rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
      if ((c === 49) === (v === 0)) pc = nx + rel;
      continue;
    }
    if (c === 51) {
      if (cp === 64) return done(7);
      cs[cp++] = nx; pc = p[nx - 2] | (p[nx - 1] << 8); continue;
    }
    if (c === 52) { if (cp === 0) return done(8); pc = cs[--cp]; continue; }
    if (c === 64) {
      const a = st[sp - 1];
      if (a < 0 || a > 255) return done(6);
      st[sp - 1] = mem[a]; continue;
    }
    if (c === 65) {
      const a = st[sp - 1], v = st[sp - 2];
      if (a < 0 || a > 255) return done(6);
      sp -= 2; mem[a] = v; continue;
    }
    if (c === 80) {
      const b = enc.encode(String(st[sp - 1]));
      if (ol + b.length > 65536) return done(11);
      sp--; out.set(b, ol); ol += b.length; continue;
    }
    if (c === 81) {
      if (ol + 1 > 65536) return done(11);
      out[ol++] = st[--sp] & 255; continue;
    }
    if (c === 82) { st[sp++] = ip < input.length ? input[ip++] : -1; continue; }
    if (c === 83) return done(st[--sp] & 255);
    // binary ops: 16-22, 24-26, 28-30, 32-34
    const b = st[sp - 1], a = st[sp - 2];
    let r;
    if (c === 16) r = (a + b) | 0;
    else if (c === 17) r = (a - b) | 0;
    else if (c === 18) r = Math.imul(a, b);
    else if (c === 19) { if (!b) return done(4); r = a === -2147483648 && b === -1 ? a : (a / b) | 0; }
    else if (c === 20) { if (!b) return done(4); r = b === -1 ? 0 : (a % b) | 0; }
    else if (c === 21) { if (!b) return done(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; }
    else if (c === 22) { if (!b) return done(4); r = ((a >>> 0) % (b >>> 0)) | 0; }
    else if (c === 24) r = a & b;
    else if (c === 25) r = a | b;
    else if (c === 26) r = a ^ b;
    else if (c === 28) r = a << (b & 31);
    else if (c === 29) r = a >> (b & 31);
    else if (c === 30) r = (a >>> (b & 31)) | 0;
    else if (c === 32) r = a === b ? 1 : 0;
    else if (c === 33) r = a < b ? 1 : 0;
    else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
    sp -= 2; st[sp++] = r;
  }
}
for (const id of readdirSync(IN).sort()) {
  const d = join(IN, id);
  const prog = readFileSync(join(d, "program.bin"));
  const input = existsSync(join(d, "input.bin")) ? readFileSync(join(d, "input.bin")) : new Uint8Array(0);
  const { out, exit } = run(prog, input);
  const od = join(OUT, id);
  mkdirSync(od, { recursive: true });
  writeFileSync(join(od, "stdout.bin"), out);
  writeFileSync(join(od, "exit.txt"), String(exit) + "\n");
}
