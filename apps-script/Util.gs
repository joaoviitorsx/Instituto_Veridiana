/**
 * Utilidades compartilhadas: planilha, datas, cache e trava.
 */

/* ─── cache com versão: qualquer escrita da gestão derruba tudo ─── */
function versaoDados() {
  const c = CacheService.getScriptCache();
  let v = c.get('ver');
  if (!v) { v = String(Date.now()); c.put('ver', v, 21600); }
  return v;
}
function invalidarCache() {
  CacheService.getScriptCache().put('ver', String(Date.now()), 21600);
}
function doCache(chave, prazo, calcular) {
  const c = CacheService.getScriptCache();
  const k = chave + '_' + versaoDados();
  const guardado = c.get(k);
  if (guardado) return JSON.parse(guardado);
  const v = calcular();
  try { c.put(k, JSON.stringify(v), prazo); } catch (e) {}
  return v;
}

function planilha() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function hoje() {
  return Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd');
}

function textoData(v) {
  return v instanceof Date
    ? Utilities.formatDate(v, FUSO, 'yyyy-MM-dd')
    : String(v).trim();
}

function chave(s){
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase().replace(/\s+/g, ' ');
}

function exigirNome(nome, oQue){
  const n = String(nome == null ? '' : nome).trim().replace(/\s+/g, ' ');
  if (n.length < 2) throw new Error('Escreva o nome ' + (oQue || '') + ' com pelo menos 2 letras.');
  return n;
}

/* Toda escrita da gestao passa por aqui, entao e o lugar certo de
   derrubar o cache. Sem isso a professora cadastra e nao ve por 5 min. */
function comTrava(fn){
  const trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try {
    const r = fn();
    invalidarCache();
    return r;
  } finally { trava.releaseLock(); }
}
