/* Encoder de QR — modo byte, correção M, versões 1 a 20.
   Porte linha a linha de apps-script/AppQr.html, que foi conferido
   contra um leitor independente (124 textos, round-trip completo,
   síndromes Reed-Solomon zeradas em todos os blocos). Mexeu no
   algoritmo lá, mexa aqui igual.
   Nada de API externa: serviço de terceiro sai do ar e o QR some no
   dia em que ela precisar reimprimir. */

type Matriz = number[][];

const TAB = [
  [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0],
  [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44],
  [30, 1, 50, 4, 51], [22, 6, 36, 2, 37], [22, 8, 37, 1, 38], [24, 4, 40, 5, 41], [24, 5, 41, 5, 42],
  [28, 7, 45, 3, 46], [28, 10, 46, 1, 47], [26, 9, 43, 4, 44], [26, 3, 44, 11, 45], [26, 3, 41, 13, 42],
];
const ALI = ['', '6,18', '6,22', '6,26', '6,30', '6,34', '6,22,38', '6,24,42', '6,26,46',
  '6,28,50', '6,30,54', '6,32,58', '6,34,62', '6,26,46,66', '6,26,48,70', '6,26,50,74',
  '6,30,54,78', '6,30,56,82', '6,30,58,86', '6,34,62,90'];

const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 285; }
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];

function mul(a: number, b: number) { return (a && b) ? EXP[LOG[a] + LOG[b]] : 0; }
function gerador(n: number) {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const novo = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      novo[j] ^= g[j];
      novo[j + 1] ^= mul(g[j], EXP[i]);
    }
    g = novo;
  }
  return g;
}
function resto(dados: number[], n: number) {
  const g = gerador(n), r = dados.concat(new Array(n).fill(0));
  for (let i = 0; i < dados.length; i++) {
    const c = r[i];
    if (!c) continue;
    for (let j = 0; j < g.length; j++) r[i + j] ^= mul(g[j], c);
  }
  return r.slice(dados.length);
}
function bytesUtf8(s: string) {
  const out: number[] = [], u = encodeURIComponent(s);
  for (let i = 0; i < u.length; i++) {
    if (u[i] === '%') { out.push(parseInt(u.substr(i + 1, 2), 16)); i += 2; }
    else out.push(u.charCodeAt(i));
  }
  return out;
}
function totalDados(v: number) { const t = TAB[v - 1]; return t[1] * t[2] + t[3] * t[4]; }
function alinhamentos(v: number) { return ALI[v - 1] ? ALI[v - 1].split(',').map(Number) : []; }

function montar(txt: string, versaoFixa?: number) {
  const d = bytesUtf8(txt);
  let v = versaoFixa || 0;
  if (!v) {
    for (v = 1; v <= 20; v++) {
      const bitsCont = v < 10 ? 8 : 16;
      if (d.length * 8 + 4 + bitsCont <= totalDados(v) * 8) break;
    }
    if (v > 20) throw new Error('Texto grande demais para o QR.');
  }
  const t = TAB[v - 1], nDados = totalDados(v), cont = v < 10 ? 8 : 16;
  const bits: number[] = [];
  const push = (val: number, n: number) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  push(4, 4); push(d.length, cont);
  for (let i = 0; i < d.length; i++) push(d[i], 8);
  const sobra = nDados * 8 - bits.length;
  push(0, Math.min(4, sobra));
  while (bits.length % 8) bits.push(0);
  const pad = [236, 17];
  let k = 0;
  while (bits.length < nDados * 8) push(pad[k++ % 2], 8);
  const cw: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    cw.push(b);
  }
  const blocos: number[][] = [], ecs: number[][] = [];
  let p = 0;
  for (let i = 0; i < t[1]; i++) { blocos.push(cw.slice(p, p + t[2])); p += t[2]; }
  for (let i = 0; i < t[3]; i++) { blocos.push(cw.slice(p, p + t[4])); p += t[4]; }
  for (let i = 0; i < blocos.length; i++) ecs.push(resto(blocos[i], t[0]));
  const fluxo: number[] = [], max = Math.max(t[2], t[4]);
  for (let i = 0; i < max; i++)
    for (let j = 0; j < blocos.length; j++)
      if (i < blocos[j].length) fluxo.push(blocos[j][i]);
  for (let i = 0; i < t[0]; i++)
    for (let j = 0; j < ecs.length; j++) fluxo.push(ecs[j][i]);
  return { v, fluxo };
}

const MASCARAS: ((y: number, x: number) => boolean)[] = [
  (y, x) => (y + x) % 2 === 0,
  (y) => y % 2 === 0,
  (_y, x) => x % 3 === 0,
  (y, x) => (y + x) % 3 === 0,
  (y, x) => (((y / 2) | 0) + ((x / 3) | 0)) % 2 === 0,
  (y, x) => (y * x) % 2 + (y * x) % 3 === 0,
  (y, x) => ((y * x) % 2 + (y * x) % 3) % 2 === 0,
  (y, x) => ((y + x) % 2 + (y * x) % 3) % 2 === 0,
];

export function matrizQr(txt: string, versaoFixa?: number, mascaraFixa?: number | null) {
  const r = montar(txt, versaoFixa), v = r.v, n = v * 4 + 17;
  const m: Matriz = [], res: Matriz = [];
  for (let i = 0; i < n; i++) { m.push(new Array(n).fill(0)); res.push(new Array(n).fill(0)); }
  const po = (y: number, x: number, val: number) => {
    if (y >= 0 && y < n && x >= 0 && x < n) { m[y][x] = val; res[y][x] = 1; }
  };
  for (const c of [[0, 0], [0, n - 7], [n - 7, 0]]) {
    for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) {
      const dentro = y >= 0 && y <= 6 && x >= 0 && x <= 6;
      const preto = dentro && (y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4));
      po(c[0] + y, c[1] + x, preto ? 1 : 0);
    }
  }
  const a = alinhamentos(v);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < a.length; j++) {
    const cy = a[i], cx = a[j];
    if ((cy <= 8 && cx <= 8) || (cy <= 8 && cx >= n - 9) || (cy >= n - 9 && cx <= 8)) continue;
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++)
      po(cy + y, cx + x, (Math.abs(y) === 2 || Math.abs(x) === 2 || (!y && !x)) ? 1 : 0);
  }
  for (let i = 8; i < n - 8; i++) { po(6, i, i % 2 ? 0 : 1); po(i, 6, i % 2 ? 0 : 1); }
  po(n - 8, 8, 1);   // módulo escuro
  for (let i = 0; i < 9; i++) { if (i !== 6) { po(8, i, 0); po(i, 8, 0); } }
  for (let i = 0; i < 8; i++) { po(8, n - 1 - i, 0); po(n - 1 - i, 8, 0); }
  if (v >= 7) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { po(n - 11 + j, i, 0); po(i, n - 11 + j, 0); }

  let bit = 0, dir = -1, col = n - 1;
  const fluxo = r.fluxo;
  const proximo = () => {
    if (bit >= fluxo.length * 8) return 0;
    const b = (fluxo[bit >> 3] >> (7 - (bit & 7))) & 1;
    bit++;
    return b;
  };
  while (col > 0) {
    if (col === 6) col--;
    for (let linha = dir < 0 ? n - 1 : 0; linha >= 0 && linha < n; linha += dir) {
      for (let c2 = 0; c2 < 2; c2++) {
        const cc = col - c2;
        if (!res[linha][cc]) m[linha][cc] = proximo();
      }
    }
    dir = -dir; col -= 2;
  }

  const aplicar = (msk: number, mat: Matriz) => {
    const f = MASCARAS[msk];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++)
      if (!res[y][x] && f(y, x)) mat[y][x] ^= 1;
  };
  const formato = (msk: number, mat: Matriz) => {
    let bch = msk << 10;   // nível M = 00, então dados = msk
    for (let i = 4; i >= 0; i--) if (bch & (1 << (i + 10))) bch ^= 0x537 << i;
    const f = ((msk << 10) | bch) ^ 0x5412;
    const b = (k: number) => (f >> (14 - k)) & 1;   // k=0 é o bit mais alto
    for (let i = 0; i <= 5; i++) mat[8][i] = b(i);
    mat[8][7] = b(6); mat[8][8] = b(7); mat[7][8] = b(8);
    for (let i = 9; i <= 14; i++) mat[14 - i][8] = b(i);
    for (let i = 0; i <= 6; i++) mat[n - 1 - i][8] = b(i);
    for (let i = 7; i <= 14; i++) mat[8][n - 15 + i] = b(i);
    mat[n - 8][8] = 1;   // módulo escuro
  };
  const versaoInfo = (mat: Matriz) => {
    if (v < 7) return;
    let bch = v << 12;
    const d = v << 12;
    for (let i = 5; i >= 0; i--) if (bch & (1 << (i + 12))) bch ^= 0x1F25 << i;
    const f = d | bch;
    for (let i = 0; i < 18; i++) {
      const b = (f >> i) & 1, y = (i / 3) | 0, x = i % 3;
      mat[n - 11 + x][y] = b; mat[y][n - 11 + x] = b;
    }
  };
  const copia = (src: Matriz) => src.map((l) => l.slice());
  const penal = (mat: Matriz) => {
    let p = 0, run: number;
    for (let y = 0; y < n; y++) {
      run = 1;
      for (let x = 1; x < n; x++) { if (mat[y][x] === mat[y][x - 1]) run++; else { if (run >= 5) p += run - 2; run = 1; } }
      if (run >= 5) p += run - 2;
    }
    for (let x = 0; x < n; x++) {
      run = 1;
      for (let y = 1; y < n; y++) { if (mat[y][x] === mat[y - 1][x]) run++; else { if (run >= 5) p += run - 2; run = 1; } }
      if (run >= 5) p += run - 2;
    }
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) {
      const s = mat[y][x] + mat[y][x + 1] + mat[y + 1][x] + mat[y + 1][x + 1];
      if (s === 0 || s === 4) p += 3;
    }
    const A = '10111010000', B = '00001011101';
    const conta = (s2: string) => {
      let c = 0;
      for (let k = 0; k + 11 <= s2.length; k++) {
        const t = s2.substr(k, 11);
        if (t === A || t === B) c++;
      }
      return c * 40;
    };
    for (let y = 0; y < n; y++) p += conta(mat[y].join(''));
    for (let x = 0; x < n; x++) { let col2 = ''; for (let y = 0; y < n; y++) col2 += mat[y][x]; p += conta(col2); }
    let escuros = 0;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) escuros += mat[y][x];
    p += Math.floor(Math.abs(escuros * 100 / (n * n) - 50) / 5) * 10;
    return p;
  };

  let melhor: Matriz = m, melhorP = Infinity, mUsada = 0;
  const faixa = mascaraFixa === undefined || mascaraFixa === null ? [0, 1, 2, 3, 4, 5, 6, 7] : [mascaraFixa];
  for (const msk of faixa) {
    const cand = copia(m);
    aplicar(msk, cand); formato(msk, cand); versaoInfo(cand);
    const pen = penal(cand);
    if (pen < melhorP) { melhorP = pen; melhor = cand; mUsada = msk; }
  }
  return { n, v, mascara: mUsada, m: melhor };
}

/* O caminho do SVG: uma tira por sequência de módulos escuros na linha.
   Vetor imprime nítido em qualquer tamanho. Margem de 4 módulos. */
export function caminhoQr(txt: string) {
  const r = matrizQr(txt), n = r.n, q = 4, tot = n + q * 2;
  let d = '';
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (r.m[y][x]) {
        let w = 1;
        while (x + w < n && r.m[y][x + w]) w++;
        d += 'M' + (x + q) + ' ' + (y + q) + 'h' + w + 'v1h-' + w + 'z';
        x += w;
      } else x++;
    }
  }
  return { d, tot };
}
