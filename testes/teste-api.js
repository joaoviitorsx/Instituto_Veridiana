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

/* ─── grade semanal ─── */
function montarGrade() {
  const m = montar();
  const tu = m.g.ss.insertSheet('Turmas'); tu.appendRow(['Turma', 'Ativa']);
  tu.appendRow(['Ballet', 'SIM']); tu.appendRow(['Jazz', 'SIM']); tu.appendRow(['Velha', 'NAO']);
  return m;
}
caso('grade: cria aula em dois dias de uma vez', () => {
  const { post, tok, g } = montarGrade();
  const r = post('criarHorario', [tok, { turma: 'Ballet', dias: [1, 3], inicio: '14:00', fim: '15:00', sala: 'Sala 1', professor: 'Vera' }]);
  assert.strictEqual(r.ok, true, r.erro); assert.strictEqual(r.dados.criados, 2);
  const l = post('listarGrade', [tok]).dados;
  assert.deepStrictEqual(l.horarios.map(h => [h.dia, h.inicio, h.fim, h.turma]), [[1, '14:00', '15:00', 'Ballet'], [3, '14:00', '15:00', 'Ballet']]);
  assert.deepStrictEqual(l.salas, ['Sala 1']); assert.deepStrictEqual(l.turmas, ['Ballet', 'Jazz']);
  assert.strictEqual(g.sheets.Grade.getRange(2, 3).getValue(), 'Segunda');
});
caso('grade: conflito de sala volta CONFLITO, forcar grava', () => {
  const { post, tok } = montarGrade();
  post('criarHorario', [tok, { turma: 'Ballet', dias: [1], inicio: '14:00', fim: '15:00', sala: 'Sala 1' }]);
  const r = post('criarHorario', [tok, { turma: 'Jazz', dias: [1], inicio: '14:30', fim: '15:30', sala: 'sala 1' }]);
  assert.strictEqual(r.ok, false); assert.match(r.erro, /^CONFLITO: A sala Sala 1 já tem Ballet na segunda, das 14h às 15h\./);
  const r2 = post('criarHorario', [tok, { turma: 'Jazz', dias: [1], inicio: '14:30', fim: '15:30', sala: 'Sala 1', forcar: true }]);
  assert.strictEqual(r2.ok, true);
  // encostado (15h às 16h) não é conflito
  const r3 = post('criarHorario', [tok, { turma: 'Jazz', dias: [1], inicio: '15:30', fim: '16:00', sala: 'Sala 1' }]);
  assert.strictEqual(r3.ok, true, r3.erro);
});
caso('grade: valida turma inativa, horário invertido, professora fora da equipe', () => {
  const { post, tok } = montarGrade();
  assert.match(post('criarHorario', [tok, { turma: 'Velha', dias: [1], inicio: '14:00', fim: '15:00' }]).erro, /não está ativa/);
  assert.match(post('criarHorario', [tok, { turma: 'Ballet', dias: [1], inicio: '15:00', fim: '14:00' }]).erro, /termina antes de começar/);
  assert.match(post('criarHorario', [tok, { turma: 'Ballet', dias: [], inicio: '14:00', fim: '15:00' }]).erro, /pelo menos um dia/);
  assert.match(post('criarHorario', [tok, { turma: 'Ballet', dias: [2], inicio: '14:00', fim: '15:00', professor: 'Fulana' }]).erro, /não está na equipe/);
});
caso('grade: editar e tirar da grade', () => {
  const { post, tok } = montarGrade();
  const id = post('criarHorario', [tok, { turma: 'Ballet', dias: [2], inicio: '9h', fim: '10h30' }]).dados.ids[0];
  assert.strictEqual(post('listarGrade', [tok]).dados.horarios[0].fim, '10:30');
  assert.strictEqual(post('editarHorario', [tok, id, { dia: 4, sala: 'Palco' }]).ok, true);
  const h = post('listarGrade', [tok]).dados.horarios[0];
  assert.deepStrictEqual([h.dia, h.inicio, h.sala], [4, '09:00', 'Palco']);
  assert.strictEqual(post('excluirHorario', [tok, id]).ok, true);
  assert.strictEqual(post('listarGrade', [tok]).dados.horarios.length, 0);
});
caso('grade: linha digitada à mão na planilha é lida e ganha ID', () => {
  const { c, post, tok } = montarGrade();
  const aba = c.abaGrade(); aba.appendRow(['', 'Jazz', 'quarta-feira', '19h', '20:00', 'Sala 2', 'Vera', '']);
  const h = post('listarGrade', [tok]).dados.horarios;
  assert.strictEqual(h.length, 1); assert.deepStrictEqual([h[0].dia, h[0].inicio, h[0].fim], [3, '19:00', '20:00']);
  assert.ok(String(aba.getRange(2, 1).getValue()).startsWith('G'));
});
caso('grade: "Aula agora" usa a grade e pula turma que já teve chamada', () => {
  const vm = require('vm');
  const { c, post, tok } = montarGrade();
  const hj = c.hoje(), dia = c.diaDaSemana_(hj);
  const agora = new Date(); const min = Number(fmt(agora, 'America/Fortaleza', 'HH')) * 60 + Number(fmt(agora, 'America/Fortaleza', 'mm'));
  const hh = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  if (min < 60 || min > 22 * 60) { console.log('     (pulado: fora do horário de teste)'); return; }
  post('criarHorario', [tok, { turma: 'Ballet', dias: [dia], inicio: hh(min - 10), fim: hh(min + 50), sala: 'Sala 1', professor: 'Vera' }]);
  post('criarHorario', [tok, { turma: 'Jazz', dias: [dia], inicio: hh(Math.min(min + 60, 23 * 60)), fim: hh(Math.min(min + 120, 23 * 60 + 59)) }]);
  let d = c.resumoInicial(tok).destaque;
  assert.deepStrictEqual([d.origem, d.turma, d.agora, d.sala], ['grade', 'Ballet', true, 'Sala 1']);
  c.salvarChamada(tok, { turma: 'Ballet', professor: 'Vera', token: 'gr', presencas: pres });
  vm.runInContext('CacheService.getScriptCache().remove("x")', c);
  d = c.resumoInicial(tok).destaque;
  assert.strictEqual(d && d.turma, 'Jazz', JSON.stringify(d));
  assert.strictEqual(d.agora, false);
});
caso('grade: sem grade nenhuma, o palpite antigo continua', () => {
  const { c, tok } = montarGrade();
  const vm = require('vm');
  assert.strictEqual(vm.runInContext('aulaDaGrade_', c)('Vera', c.hoje()), undefined);
  c.resumoInicial(tok);   // não quebra
});
caso('API: funções da grade estão na lista', () => {
  const { c } = montar();
  ['listarGrade', 'criarHorario', 'editarHorario', 'excluirHorario'].forEach(f => assert.strictEqual(typeof c.funcoesDaApi_()[f], 'function', f));
});
console.log(`\n${n - falhas}/${n} casos`);
process.exit(falhas ? 1 : 0);
