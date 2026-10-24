// Ambiente falso do Apps Script para rodar os .gs no Node, sem Google nenhum.
const fs = require('fs'), vm = require('vm'), crypto = require('crypto'), path = require('path');

function fmt(d, tz, pat) {
  const parts = {};
  new Intl.DateTimeFormat('en-CA', { timeZone: tz === 'UTC' ? 'UTC' : tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).forEach(p => parts[p.type] = p.value);
  return pat.replace('yyyy', parts.year).replace('MM', parts.month).replace('dd', parts.day)
    .replace('HH', parts.hour).replace('mm', parts.minute).replace('ss', parts.second);
}

class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr: nr || 1, nc: nc || 1 }); }
  getValues() { const o = []; for (let i = 0; i < this.nr; i++) { const l = []; for (let j = 0; j < this.nc; j++) l.push(this.sh.cell(this.r + i, this.c + j)); o.push(l); } return o; }
  getValue() { return this.getValues()[0][0]; }
  setValues(v) { if (this.r + this.nr - 1 > this.sh.maxRows) throw new Error('The coordinates or dimensions of the range are invalid.');
    v.forEach((l, i) => l.forEach((x, j) => this.sh.set(this.r + i, this.c + j, x))); return this; }
  setValue(x) { this.sh.set(this.r, this.c, x); return this; }
  setNumberFormat() { return this; } setNumberFormats() { return this; }
}
class Sheet {
  constructor(name) { this.name = name; this.rows = []; this.maxRows = 1000; this.maxCols = 26; }
  cell(r, c) { const l = this.rows[r - 1]; const v = l ? l[c - 1] : undefined; return v === undefined ? '' : v; }
  set(r, c, x) { while (this.rows.length < r) this.rows.push([]); this.rows[r - 1][c - 1] = x; }
  getLastRow() { for (let i = this.rows.length; i > 0; i--) if ((this.rows[i - 1] || []).some(v => v !== '' && v !== undefined)) return i; return 0; }
  getMaxRows() { return this.maxRows; } getMaxColumns() { return this.maxCols; }
  getRange(r, c, nr, nc) { return new Range(this, r, c, nr, nc); }
  getDataRange() { return new Range(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, ...this.rows.map(l => l.length))); }
  appendRow(l) { const r = this.getLastRow() + 1; if (r > this.maxRows) this.maxRows = r; l.forEach((x, j) => this.set(r, j + 1, x)); }
  insertRowsAfter(_, n) { this.maxRows += n; }
  deleteRow(r) { this.rows.splice(r - 1, 1); }
  deleteRows(r, n) { this.rows.splice(r - 1, n); }
  clearContents() { this.rows = []; } setFrozenRows() {} hideSheet() {} getName() { return this.name; }
}

function criar(dir) {
  const sheets = {};
  const ss = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = new Sheet(n)),
    getSpreadsheetTimeZone: () => 'America/Fortaleza', getUrl: () => 'https://docs/x', getName: () => 'Teste' };
  const cacheStore = new Map(), props = new Map();
  const cache = { get: k => cacheStore.has(k) ? cacheStore.get(k) : null, put: (k, v) => cacheStore.set(k, String(v)),
    remove: k => cacheStore.delete(k) };
  const propsSvc = { getProperty: k => props.has(k) ? props.get(k) : null, setProperty: (k, v) => props.set(k, String(v)),
    deleteProperty: k => props.delete(k), getProperties: () => Object.fromEntries(props),
    setProperties: o => Object.entries(o).forEach(([k, v]) => props.set(k, String(v))) };
  const ctx = {
    console, JSON, Math, Date, Intl, Number, String, Array, Object, Error, isFinite, parseInt,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, getUi: () => { throw new Error('sem UI'); } },
    CacheService: { getScriptCache: () => cache },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => propsSvc, getDocumentProperties: () => propsSvc },
    Utilities: {
      formatDate: fmt, getUuid: () => crypto.randomUUID(),
      computeHmacSha256Signature: (v, k) => [...crypto.createHmac('sha256', k).update(v).digest()],
      computeDigest: (_, v) => [...crypto.createHash('sha256').update(v).digest()],
      base64EncodeWebSafe: b => Buffer.from(b.map(x => x & 255)).toString('base64url'),
      DigestAlgorithm: { SHA_256: 'sha256' }
    },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: t => ({ texto: t, setMimeType() { return this; } }) },
    HtmlService: {
      createHtmlOutputFromFile: n => ({ getContent: () => fs.readFileSync(path.join(dir, n + '.html'), 'utf8') }),
      createHtmlOutput: h => { const o = { html: h, setTitle() { return o; }, addMetaTag() { return o; }, setXFrameOptionsMode() { return o; }, setFaviconUrl() { return o; } }; return o; },
      XFrameOptionsMode: { ALLOWALL: 1 }
    },
    Logger: { log() {} }, ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/X/exec' }) }
  };
  vm.createContext(ctx);
  fs.readdirSync(dir).filter(f => f.endsWith('.gs')).sort().forEach(f =>
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f }));
  return { ctx, ss, sheets, cacheStore, props };
}
module.exports = { criar, fmt };
