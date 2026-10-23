/**
 * API JSON para o PWA (frontend React no Vercel).
 *
 * É só uma casca de transporte. Toda regra de negócio continua nas
 * funções globais que o app HTML já chama por google.script.run — e o
 * PWA chama as MESMAS funções, com os MESMOS argumentos, na mesma ordem:
 *
 *   google.script.run.carregarTurma(sessao, 'Ballet')
 *   POST /exec  {"fn":"carregarTurma","args":[sessao,"Ballet"]}
 *
 * Por isso nada aqui valida sessão: quem valida é cada função, com
 * exigirSessao, exatamente como no app HTML. Validar em dois lugares
 * vira divergência.
 *
 * Toda resposta tem a mesma forma, inclusive no erro:
 *   { ok: true, dados }   ou   { ok: false, erro }
 * Exceção nunca escapa daqui: o cliente precisa de JSON até no erro.
 *
 * CORS: o Apps Script não responde OPTIONS. O cliente manda
 * Content-Type text/plain (requisição simples, sem preflight) e segue o
 * 302 para script.googleusercontent.com, que é quem devolve o
 * Access-Control-Allow-Origin. O corpo continua sendo JSON.
 */

/* Sobe junto com cada mudança na API. /exec?fn=ping mostra qual está no
   ar: é o jeito mais rápido de saber se a URL do PWA aponta para a
   implantação certa. */
const VERSAO_API = '3.0.0';

function responderJson(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* O que o PWA pode chamar. Lista fechada: função que não está aqui não
   existe para a API, mesmo sendo global (menus da planilha, utilidades,
   modulo() do app HTML).

   Montada dentro de uma função, não no topo do arquivo: o Apps Script
   roda os .gs na ordem da lista, e no topo as funções dos arquivos
   seguintes ainda não existem. */
function funcoesDaApi_() {
  return {
    // acesso
    entrar: entrar, quemSou: quemSou, trocarSenha: trocarSenha, sair: sair,
    listarEquipe: listarEquipe, definirAcesso: definirAcesso,

    // tela inicial e chamada
    resumoInicial: resumoInicial,
    listarTurmas: listarTurmas, carregarTurma: carregarTurma, salvarChamada: salvarChamada,

    // agenda
    listarAgenda: listarAgenda, listarAgendaAno: listarAgendaAno, datasFixas: datasFixas,
    criarEvento: criarEvento, editarEvento: editarEvento, excluirEvento: excluirEvento,
    precarregarDatas: precarregarDatas, gerarCalendarioPdf: gerarCalendarioPdf,

    // materiais
    listarMateriais: listarMateriais, listarCategorias: listarCategorias, listarLocais: listarLocais,
    criarMaterial: criarMaterial, editarMaterial: editarMaterial,
    ajustarQuantidade: ajustarQuantidade, inativarMaterial: inativarMaterial,
    renomearNaLista: renomearNaLista,

    // caixa
    lancarCaixa: lancarCaixa, mesesCaixa: mesesCaixa, listarCaixa: listarCaixa,
    apagarLancamento: apagarLancamento, resumoCaixa: resumoCaixa,

    // gestão
    entrarNaGestao: entrarNaGestao, listarTurmasCompleto: listarTurmasCompleto,
    criarTurma: criarTurma, renomearTurma: renomearTurma, arquivarTurma: arquivarTurma,
    listarAlunos: listarAlunos, adicionarAluno: adicionarAluno, atualizarAluno: atualizarAluno,
    moverAluno: moverAluno, desativarAluno: desativarAluno, reativarAluno: reativarAluno,
    listarProfessores: listarProfessores, adicionarProfessor: adicionarProfessor,
    removerProfessor: removerProfessor,

    // histórico, impacto e certificado
    mesesComChamada: mesesComChamada, resumoHistorico: resumoHistorico,
    alunosEmRisco: alunosEmRisco, contarRisco: contarRisco,
    relatorioPeriodo: relatorioPeriodo, aniversariantesSemana: aniversariantesSemana,
    alunosParaCertificado: alunosParaCertificado, gerarCertificado: gerarCertificado,

    // planilha
    obterUrlApp: obterUrlApp, obterLinkPlanilha: obterLinkPlanilha, arrumarPlanilha: arrumarPlanilha
  };
}

function roteador(fn, args) {
  try {
    if (fn === 'ping') return ok_({ versao: VERSAO_API, hora: new Date().toISOString() });
    const f = funcoesDaApi_()[String(fn || '')];
    if (!f) return { ok: false, erro: 'Função desconhecida: ' + fn };
    const r = f.apply(null, Array.isArray(args) ? args : []);
    return ok_(r === undefined ? null : r);
  } catch (err) {
    return { ok: false, erro: String((err && err.message) || err) };
  }
}

function ok_(dados) { return { ok: true, dados: dados }; }

/* ?args= no GET é JSON (lista). Serve para testar no navegador:
   /exec?fn=listarTurmas&args=["SESSAO"]. Sem args, lista vazia. */
function argsDaUrl_(texto) {
  if (!texto) return [];
  try {
    const v = JSON.parse(texto);
    return Array.isArray(v) ? v : [v];
  } catch (e) {
    return [texto];
  }
}
