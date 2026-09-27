/**
 * A planilha em si: link, padronização, Painel e menu.
 */

/* ─── endereço do app, para o QR ─── */
function obterUrlApp(sessao){
  exigirGestao(sessao);
  const guardada = PropertiesService.getDocumentProperties().getProperty('URL_APP');
  if (guardada) return guardada;
  try {
    const u = ScriptApp.getService().getUrl();
    if (u) return u;
  } catch (e){}
  return '';
}

function configurarUrlApp(){
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Endereço do app',
    'Cole aqui o link que termina em /exec, o mesmo que você abre no celular:', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const u = r.getResponseText().trim();
  if (!u) return;
  PropertiesService.getDocumentProperties().setProperty('URL_APP', u);
  ui.alert('Pronto. Os QR das turmas já usam esse endereço.');
}

/* Se você já tem um onOpen, junte estas linhas ao seu em vez de
   deixar duas funções com o mesmo nome: a segunda apaga a primeira. */
function onOpen(){
  SpreadsheetApp.getUi().createMenu('Veridiana')
    .addItem('Criar acesso da gestão', 'criarAcessoGestaoMenu')
    .addItem('Configurar endereço do app', 'configurarUrlApp')
    .addSeparator()
    .addItem('Arrumar e padronizar a planilha', 'arrumarPlanilhaMenu')
    .addToUi();
}

/* ══════════════════════════════════════════════════════════════
   LINK DA PLANILHA, PADRONIZAÇÃO E HISTÓRICO
   ══════════════════════════════════════════════════════════════ */

/**
 * Devolve o endereço da planilha que serve de banco.
 * O link em si não dá acesso a ninguém: quem abre precisa já ter
 * permissão no Google Drive. Compartilhar o link não compartilha o
 * arquivo — isso continua sendo feito no botão Compartilhar da planilha.
 */
function obterLinkPlanilha(sessao) {
  exigirGestao(sessao);
  const ss = planilha();
  return { url: ss.getUrl(), nome: ss.getName() };
}

/* ─── padronização ─── */

const ABAS_PADRAO = [
  { nome: 'Alunos',      cab: ['Turma','Aluno','Ativo','Nascimento','Responsável','Telefone'], larg: [170, 230, 70, 110, 200, 130] },
  { nome: 'Professores', cab: ['Professor','E-mail','Papel'],                                larg: [260, 260, 110] },
  { nome: 'Turmas',      cab: ['Turma', 'Ativa', 'Minutos por aula'],                        larg: [230, 70, 140] },
  { nome: 'Caixa',       cab: ['Registro','Data','Tipo','Valor','Categoria','Descrição','Fonte','Comprovante','Quem registrou'],
                                                                                        larg: [140, 90, 80, 100, 140, 220, 150, 130, 150] },
  { nome: 'Chamadas',    cab: ['Registro','Data','Turma','Professor','Aluno','Status'],       larg: [150, 100, 190, 200, 250, 120] },
  /* Literal de propósito: constante de outro .gs no topo do arquivo quebra
     o script inteiro se esse arquivo vier antes na lista do editor. */
  { nome: 'Agenda',      cab: ['ID','Data','DataFim','Titulo','Tipo','Turmas','Local','Status','Observacao'],
                                                                                        larg: [100, 100, 100, 260, 150, 220, 180, 110, 260] },
  { nome: 'Materiais',   cab: ['ID','Item','Categoria','Finalidade','Quantidade','Estado','Local','Observacao','Ativo'],
                                                                                        larg: [100, 240, 160, 110, 100, 130, 160, 240, 70] }
];

/* Menu suspenso numa coluna. Aceita o que já estiver fora da lista
   (setAllowInvalid true): quem digitou "Festival" na mão não perde o dado,
   só ganha o aviso vermelho da célula. */
function listaNaColuna_(aba, col, valores) {
  if (!aba) return;
  aba.getRange(2, col, Math.max(aba.getMaxRows() - 1, 1), 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(valores, true).setAllowInvalid(true).build());
}

/**
 * Deixa a planilha com uma cara só: cabeçalho roxo congelado, larguras
 * certas, listas alternadas, SIM/NAO como menu suspenso, datas no
 * formato brasileiro, e o Painel com Tabelas Dinâmicas.
 * Pode rodar quantas vezes quiser — não duplica nada.
 */
function arrumarPlanilha(sessao) {
  exigirGestao(sessao);
  return arrumarPlanilha_();
}
function arrumarPlanilha_() {
  return comTrava(function () {
    const ss = planilha();
    ss.setSpreadsheetTimeZone(FUSO);

    abaChamadas();   // garante que existem antes de formatar
    abaProfessores_();
    abaTurmas();
    abaCaixa();
    abaAgenda();
    abaMateriais();

    ABAS_PADRAO.forEach(function (def) { formatarAba_(ss, def); });

    // Ativo só aceita SIM ou NAO, escolhido num menu
    const alunos = ss.getSheetByName(ABA_ALUNOS);
    if (alunos) {
      const regra = SpreadsheetApp.newDataValidation()
        .requireValueInList(['SIM', 'NAO'], true)
        .setAllowInvalid(false)
        .setHelpText('Escreva SIM ou NAO. Aluno que sai vira NAO, nunca apague a linha.')
        .build();
      alunos.getRange(2, 3, Math.max(alunos.getMaxRows() - 1, 1), 1).setDataValidation(regra);
    }
    listaNaColuna_(ss.getSheetByName(ABA_PROFESSORES), 3, PAPEIS);
    const turmas = ss.getSheetByName(ABA_TURMAS);
    if (turmas) {
      const regra2 = SpreadsheetApp.newDataValidation()
        .requireValueInList(['SIM', 'NAO'], true).setAllowInvalid(false).build();
      turmas.getRange(2, 2, Math.max(turmas.getMaxRows() - 1, 1), 1).setDataValidation(regra2);
    }

    // datas em português
    const ch = ss.getSheetByName(ABA_CHAMADAS);
    if (ch && ch.getMaxRows() > 1) {
      ch.getRange(2, 1, ch.getMaxRows() - 1, 1).setNumberFormat('dd/mm/yyyy hh:mm');
      /* Texto, não data: ver o comentário de textoData em Util.gs. */
      ch.getRange(2, 2, ch.getMaxRows() - 1, 1).setNumberFormat('@');
    }

    if (alunos && alunos.getMaxRows() > 1) {
      alunos.getRange(2, 4, alunos.getMaxRows() - 1, 1).setNumberFormat('@');
    }

    const cx = ss.getSheetByName(ABA_CAIXA);
    if (cx && cx.getMaxRows() > 1) {
      cx.getRange(2, 1, cx.getMaxRows() - 1, 1).setNumberFormat('dd/mm/yyyy hh:mm');
      cx.getRange(2, 2, cx.getMaxRows() - 1, 1).setNumberFormat('@');
      cx.getRange(2, 4, cx.getMaxRows() - 1, 1).setNumberFormat('R$ #,##0.00');
    }

    const ag = ss.getSheetByName(ABA_AGENDA);
    if (ag && ag.getMaxRows() > 1) ag.getRange(2, 2, ag.getMaxRows() - 1, 2).setNumberFormat('@');
    listaNaColuna_(ag, 5, TIPOS_EVENTO);
    listaNaColuna_(ag, 8, STATUS_EVENTO);
    const mt = ss.getSheetByName(ABA_MATERIAIS);
    listaNaColuna_(mt, 4, FINALIDADES);
    listaNaColuna_(mt, 6, ESTADOS);
    listaNaColuna_(mt, 9, ['SIM', 'NAO']);

    montarPainel_(ss);
    invalidarCache();
    return { ok: true, mensagem: 'Planilha arrumada.' };
  });
}

function formatarAba_(ss, def) {
  let aba = ss.getSheetByName(def.nome);
  if (!aba) {
    aba = ss.insertSheet(def.nome);
  }
  const n = def.cab.length;

  // cabeçalho
  aba.getRange(1, 1, 1, n).setValues([def.cab]);
  aba.getRange(1, 1, 1, n)
    .setBackground('#4A1D6E').setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(11)
    .setVerticalAlignment('middle').setHorizontalAlignment('left');
  aba.setRowHeight(1, 34);
  aba.setFrozenRows(1);

  def.larg.forEach(function (w, i) { aba.setColumnWidth(i + 1, w); });

  // corpo
  const linhas = Math.max(aba.getMaxRows() - 1, 1);
  aba.getRange(2, 1, linhas, n)
    .setFontSize(11).setVerticalAlignment('middle').setFontColor('#1B1020');

  // listras alternadas, sem empilhar as antigas
  const faixa = aba.getRange(1, 1, aba.getMaxRows(), n);
  faixa.getBandings().forEach(function (b) { b.remove(); });
  try {
    faixa.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false);
    aba.getRange(1, 1, 1, n).setBackground('#4A1D6E').setFontColor('#FFFFFF');
  } catch (e) { /* listras são enfeite, não vale quebrar por elas */ }

  // trava só o cabeçalho, e como aviso: ninguém fica preso para fora
  aba.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) {
    if (p.getDescription() === 'cabecalho-veridiana') p.remove();
  });
  aba.getRange(1, 1, 1, n).protect()
    .setDescription('cabecalho-veridiana').setWarningOnly(true);

  return def.nome;
}

/**
 * Painel com Tabela Dinâmica de verdade, do jeito que o Planilhas
 * entende. Fica sempre vivo: recalcula sozinho quando chega chamada
 * nova, sem fórmula escrita na mão e sem depender do idioma do arquivo.
 */
function montarPainel_(ss) {
  const origem = ss.getSheetByName(ABA_CHAMADAS).getRange('A:F');
  let aba = ss.getSheetByName('Painel');
  if (!aba) aba = ss.insertSheet('Painel', 0);

  aba.getPivotTables().forEach(function (p) { p.remove(); });
  aba.clear();
  aba.clearFormats();

  aba.getRange('A1').setValue('Frequência — Instituto Veridiana')
    .setFontSize(16).setFontWeight('bold').setFontColor('#4A1D6E');
  aba.getRange('A2').setValue('Tudo aqui se atualiza sozinho a cada chamada salva.')
    .setFontSize(10).setFontColor('#6B5E78');

  /* As duas dinâmicas ficam LADO A LADO, não uma embaixo da outra.
     Empilhadas, "POR DIA" em A14 caía dentro do resultado da primeira
     assim que a instituição passava de 6 turmas — e aí ou o Apps Script
     lançava erro no meio do arrumarPlanilha, deixando a planilha meio
     formatada, ou a segunda dava #REF!. Lado a lado a colisão é
     impossível, porque cada uma cresce só para baixo. */
  aba.getRange('A4').setValue('POR TURMA')
    .setFontWeight('bold').setFontSize(11).setFontColor('#4A1D6E');
  const p1 = aba.getRange('A5').createPivotTable(origem);
  p1.addRowGroup(3);                                   // C = Turma
  p1.addColumnGroup(6);                                // F = Status
  p1.addPivotValue(5, SpreadsheetApp.PivotTableSummarizeFunction.COUNTA); // E = Aluno

  aba.getRange('G4').setValue('POR DIA')
    .setFontWeight('bold').setFontSize(11).setFontColor('#4A1D6E');
  const p2 = aba.getRange('G5').createPivotTable(origem);
  p2.addRowGroup(2);                                   // B = Data
  p2.addRowGroup(3);                                   // C = Turma
  p2.addColumnGroup(6);                                // F = Status
  p2.addPivotValue(5, SpreadsheetApp.PivotTableSummarizeFunction.COUNTA);

  aba.setColumnWidth(1, 200);
  aba.setColumnWidth(7, 110);
  aba.setColumnWidth(8, 180);
  ss.setActiveSheet(aba);
  ss.moveActiveSheet(1);
  return aba;
}

/* ─── histórico ─── */

function arrumarPlanilhaMenu() {
  arrumarPlanilha_();
  SpreadsheetApp.getUi().alert('Planilha arrumada. O Painel está na primeira aba.');
}
