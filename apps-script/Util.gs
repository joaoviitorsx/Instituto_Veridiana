/**
 * Utilidades compartilhadas: planilha, datas, cache e trava.
 */

/* ─── cache com versão: qualquer escrita da gestão derruba tudo ───
   As leituras das telas (turmas, alunos, agenda, materiais, histórico,
   certificado) passam por aqui por 5 min. Escrita pelo app derruba na
   hora; mudança feita direto na planilha aparece em até 5 min. As que
   dependem de chamadas levam versaoResumo_() na chave, que muda a cada
   chamada salva. */
function versaoDados() {
  const c = CacheService.getScriptCache();
  let v = c.get('ver');
  if (!v) { v = Utilities.getUuid().slice(0, 8); c.put('ver', v, 21600); }
  return v;
}
/* Valor único, não Date.now(): leitura e escrita no mesmo milissegundo
   deixavam a versão igual, e a tela seguia mostrando o dado de antes. */
function invalidarCache() {
  CacheService.getScriptCache().put('ver', Utilities.getUuid().slice(0, 8), 21600);
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

/* Versão só do resumo da tela inicial. Chamada salva muda a "próxima
   aula", mas não pode derrubar o cache do elenco das turmas, que a
   próxima chamada vai precisar. Escrita da gestão derruba os dois,
   porque versaoDados() também entra na chave. */
function versaoResumo_() {
  return CacheService.getScriptCache().get('verIni') || '0';
}
function tocarResumo_() {
  try { CacheService.getScriptCache().put('verIni', Utilities.getUuid().slice(0, 8), 21600); } catch (e) {}
}

function planilha() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function hoje() {
  return Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd');
}

/**
 * Data de uma célula em aaaa-mm-dd.
 *
 * O Sheets converte a string gravada em Date usando o fuso DA PLANILHA.
 * Ler de volta formatando em America/Fortaleza numa planilha em GMT
 * devolvia o dia ANTERIOR: 'já teve chamada hoje' nunca ficava
 * verdadeiro, o histórico ficava um dia atrás e o relatório perdia o
 * primeiro dia do período. Formatar no mesmo fuso em que foi gravado
 * faz o valor voltar igual ao que entrou.
 */
let _fusoPlanilha = null;
function fusoPlanilha_() {
  if (_fusoPlanilha === null) {
    try { _fusoPlanilha = planilha().getSpreadsheetTimeZone() || FUSO; }
    catch (e) { _fusoPlanilha = FUSO; }
  }
  return _fusoPlanilha;
}

function textoData(v) {
  return v instanceof Date
    ? Utilities.formatDate(v, fusoPlanilha_(), 'yyyy-MM-dd')
    : String(v == null ? '' : v).trim();
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

/**
 * insertSheet() cria a aba com 1000 linhas e getRange() NÃO expande a
 * grade — só appendRow expande. Sem isto, quando Chamadas passa de 1000
 * linhas (umas 3 semanas de uso) o setValues lança "coordinates or
 * dimensions of the range are invalid" e a chamada simplesmente não
 * grava, sem jeito de o professor contornar.
 */
function garantirLinhas_(aba, precisa) {
  const max = aba.getMaxRows();
  if (precisa > max) aba.insertRowsAfter(max, precisa - max + 500);
}

/**
 * Lê Chamadas de trás para frente até passar da data pedida.
 *
 * Antes cada consulta usava uma janela fixa de linhas (1500, 20000,
 * 50000). Passado o volume, as linhas mais antigas saíam da janela e o
 * relatório de edital devolvia MENOS beneficiários e MENOS aulas, sem
 * avisar. Relatório ausente faz procurar o dado; relatório errado a
 * pessoa confia e cola na prestação de contas.
 *
 * Devolve { linhas, completo }. Se completo for false, a leitura bateu
 * no teto de segurança e o número está por baixo — quem chama precisa
 * dizer isso na tela.
 */
function lerChamadasDesde_(dataMin, tetoLinhas) {
  const aba = abaChamadas();
  const ultima = aba.getLastRow();
  if (ultima < 2) return { linhas: [], completo: true };

  const teto = tetoLinhas || 60000;
  const BLOCO = 3000;
  const linhas = [];
  let fim = ultima, completo = false;

  while (fim >= 2) {
    if (linhas.length >= teto) break;
    const inicio = Math.max(2, fim - BLOCO + 1);
    const vals = aba.getRange(inicio, 2, fim - inicio + 1, 5).getValues();
    let passou = false;
    for (let i = vals.length - 1; i >= 0; i--) {
      const data = textoData(vals[i][0]);
      if (!data) continue;
      if (dataMin && data < dataMin) { passou = true; break; }
      linhas.push({
        data: data,
        turma: String(vals[i][1] || '').trim(),
        professor: String(vals[i][2] || '').trim(),
        aluno: String(vals[i][3] || '').trim(),
        status: String(vals[i][4] || '').trim()
      });
    }
    if (passou) { completo = true; break; }
    if (inicio === 2) { completo = true; break; }
    fim = inicio - 1;
  }
  return { linhas: linhas.filter(function (r) { return r.turma && r.aluno; }), completo: completo };
}

/** aaaa-mm-dd de N dias atrás, no fuso do instituto. */
function diasAtras_(n) {
  return Utilities.formatDate(new Date(Date.now() - n * 86400000), FUSO, 'yyyy-MM-dd');
}
