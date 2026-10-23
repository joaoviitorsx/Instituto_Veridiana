// Modo duplo: API JSON do PWA + app HTML + chamada que chega atrasada.
// Rode antes de toda publicação: node testes/teste-api.js
const assert = require('assert');
const { criar, fmt } = require('./gas');
const DIR = require('path').join(__dirname, '..', 'apps-script');
let falhas = 0, n = 0;
function caso(nome, f) { n++; try { f(); console.log('ok  ', nome); } catch (e) { falhas++; console.log('FALHA', nome, '\n   ', e.stack.split('\n').slice(0, 3).join('\n    ')); } }

function montar() {
  const g = criar(DIR), c = g.ctx;
  const al = g.ss.insertSheet('Alunos'); al.appendRow(['Turma', 'Aluno', 'Ativo']);
  ['Ana', 'Bia', 'Caio'].forEach(x => al.appendRow(['Ballet', x, 'SIM']));
  al.appendRow(['Jazz', 'Davi', 'SIM']);
  const pf = g.ss.insertSheet('Professores'); pf.appendRow(['Professor', 'E-mail']); pf.appendRow(['Vera', 'vera@x.org']);
  c.gravarSenha_('vera@x.org', 'segredo1', false);
  const post = (fn, args) => JSON.parse(c.doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).texto);
  const tok = post('entrar', ['vera@x.org', 'segredo1']).dados.token;
  return { g, c, post, tok };
}
const dia = ms => fmt(new Date(ms), 'America/Fortaleza', 'yyyy-MM-dd');
const D = 86400000;
const pres = [{ aluno: 'Ana', status: 'Presente' }, { aluno: 'Bia', status: 'Falta' }, { aluno: 'Caio', status: 'Presente' }];

caso('ping por GET devolve JSON com versão', () => {
  const { c } = montar();
  const r = JSON.parse(c.doGet({ parameter: { fn: 'ping' } }).texto);
  assert.strictEqual(r.ok, true); assert.strictEqual(r.dados.versao, require('vm').runInContext('VERSAO_API', c));
});
caso('GET sem fn continua servindo o app HTML', () => {
  const { c } = montar();
  const r = c.doGet({ parameter: { turma: 'Ballet' } });
  assert.ok(r.html && r.html.includes('id="palco"') && r.html.includes('S.turmaInicial = "Ballet"'));
});
caso('POST inválido vira JSON de erro', () => {
  const { c } = montar();
  const r = JSON.parse(c.doPost({ postData: { contents: '{nada' } }).texto);
  assert.strictEqual(r.ok, false); assert.match(r.erro, /Requisição inválida/);
});
caso('função fora da lista é recusada', () => {
  const { post } = montar();
  for (const f of ['criarAcessoMenu', 'gravarSenha_', 'modulo', 'diagnostico', 'roteador', '']) {
    const r = post(f, []); assert.strictEqual(r.ok, false); assert.match(r.erro, /desconhecida/);
  }
});
caso('toda função da lista existe', () => {
  const { c } = montar();
  const m = c.funcoesDaApi_();
  Object.keys(m).forEach(k => assert.strictEqual(typeof m[k], 'function', k));
});
caso('sem sessão: erro SESSAO em JSON, não exceção', () => {
  const { post } = montar();
  const r = post('listarTurmas', ['x'.repeat(40)]);
  assert.strictEqual(r.ok, false); assert.match(r.erro, /^SESSAO:/);
});
caso('listarTurmas e carregarTurma iguais ao google.script.run', () => {
  const { c, post, tok } = montar();
  assert.deepStrictEqual(post('listarTurmas', [tok]).dados, c.listarTurmas(tok));
  const t = post('carregarTurma', [tok, 'Ballet']).dados;
  assert.deepStrictEqual(t.alunos, ['Ana', 'Bia', 'Caio']); assert.deepStrictEqual(t.professores, ['Vera']);
});
caso('salvarChamada sem registro (app HTML) grava hoje', () => {
  const { g, c, tok } = montar();
  const r = c.salvarChamada(tok, { turma: 'Ballet', professor: 'Vera', token: 't1', presencas: pres });
  assert.strictEqual(r.data, c.hoje()); assert.strictEqual(r.presentes, 2);
  assert.strictEqual(g.sheets.Chamadas.getLastRow(), 4);
});
caso('salvarChamada com registro de 2 dias atrás grava a data da aula', () => {
  const { g, post, tok } = montar();
  const ms = Date.now() - 2 * D;
  const r = post('salvarChamada', [tok, { turma: 'Ballet', professor: 'Vera', token: 't2', registro: ms, presencas: pres }]);
  assert.strictEqual(r.ok, true, r.erro); assert.strictEqual(r.dados.data, dia(ms));
  const linha = g.sheets.Chamadas.getRange(2, 1, 1, 6).getValues()[0];
  assert.strictEqual(linha[0].getTime(), ms); assert.strictEqual(linha[1], dia(ms));
});
caso('reenvio com mesmo token não duplica', () => {
  const { g, post, tok } = montar();
  const d = { turma: 'Ballet', professor: 'Vera', token: 't3', registro: Date.now() - D, presencas: pres };
  post('salvarChamada', [tok, d]); const r = post('salvarChamada', [tok, d]);
  assert.strictEqual(r.ok, true); assert.strictEqual(g.sheets.Chamadas.getLastRow(), 4);
});
caso('reenvio depois de o token sair do cache não duplica (registro na planilha)', () => {
  const { g, post, tok } = montar();
  const d = { turma: 'Ballet', professor: 'Vera', token: 't4', registro: Date.now() - D, presencas: pres };
  post('salvarChamada', [tok, d]);
  [...g.cacheStore.keys()].filter(k => k.startsWith('tk_')).forEach(k => g.cacheStore.delete(k));
  const r = post('salvarChamada', [tok, d]);
  assert.strictEqual(r.ok, true, r.erro); assert.strictEqual(r.dados.presentes, 2);
  assert.strictEqual(g.sheets.Chamadas.getLastRow(), 4);
});
caso('outra chamada da mesma turma no mesmo dia: DUPLICADA', () => {
  const { post, tok } = montar();
  const ms = Date.now() - D;
  post('salvarChamada', [tok, { turma: 'Ballet', professor: 'Vera', token: 'a', registro: ms, presencas: pres }]);
  const r = post('salvarChamada', [tok, { turma: 'Ballet', professor: 'Vera', token: 'b', registro: ms + 60000, presencas: pres }]);
  assert.strictEqual(r.ok, false); assert.match(r.erro, /^DUPLICADA:/);
});
caso('chamada mais velha que o limite: ANTIGA', () => {
  const { c, post, tok } = montar();
  const r = post('salvarChamada', [tok, { turma: 'Ballet', professor: 'Vera', token: 'v', registro: Date.now() - (require('vm').runInContext('ATRASO_MAX_DIAS', c) + 1) * D, presencas: pres }]);
  assert.strictEqual(r.ok, false); assert.match(r.erro, /^ANTIGA:/);
});
caso('relógio adiantado vira agora', () => {
  const { c, post, tok } = montar();
  const r = post('salvarChamada', [tok, { turma: 'Ballet', professor: 'Vera', token: 'f', registro: Date.now() + 5 * D, presencas: pres }]);
  assert.strictEqual(r.dados.data, c.hoje());
});
caso('linha atrasada no fim da aba não esconde as de antes', () => {
  const { g, c, tok } = montar();
  // 30 dias de chamadas em ordem, uma por dia, Jazz
  const ch = c.abaChamadas();
  for (let i = 30; i >= 1; i--) { const ms = Date.now() - i * D; ch.appendRow([new Date(ms), dia(ms), 'Jazz', 'Vera', 'Davi', 'Presente']); }
  // chega atrasada uma chamada de 10 dias atrás
  c.salvarChamada(tok, { turma: 'Ballet', professor: 'Vera', token: 'z', registro: Date.now() - 10 * D, presencas: pres });
  const desde = dia(Date.now() - 5 * D);
  const l = c.lerChamadasDesde_(desde).linhas;
  assert.strictEqual(l.filter(r => r.turma === 'Jazz').length, 5, 'Jazz dos últimos 5 dias');
  assert.strictEqual(l.filter(r => r.turma === 'Ballet').length, 0);
  // sugestão de professor e "já teve hoje" ainda funcionam
  const t = c.carregarTurma(tok, 'Jazz');
  assert.strictEqual(t.professorSugerido, 'Vera');
  // mês: a atrasada aparece no mês dela
  const mes = dia(Date.now() - 10 * D).slice(0, 7);
  assert.ok(c.lerMes_(mes).some(r => r.turma === 'Ballet'));
});
caso('certificado conta a chamada atrasada', () => {
  const { c, tok } = montar();
  c.salvarChamada(tok, { turma: 'Ballet', professor: 'Vera', token: 'c1', presencas: pres });
  c.salvarChamada(tok, { turma: 'Ballet', professor: 'Vera', token: 'c2', registro: Date.now() - 3 * D, presencas: pres });
  const h = c.historicoCompleto0_();
  assert.strictEqual(h['Ballet|Ana'].aulas, 2);
  assert.strictEqual(h['Ballet|Ana'].primeira, dia(Date.now() - 3 * D));
});
console.log(`\n${n - falhas}/${n} casos`);
process.exit(falhas ? 1 : 0);
