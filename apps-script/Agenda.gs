/**
 * Agenda anual.
 *
 * Todo começo de ano a coordenação monta o planejamento, IMPRIME um
 * calendário e escreve nele à mão. Este módulo não compete com o papel:
 * alimenta o papel. A lista na tela serve para o dia a dia; o PDF para
 * imprimir fecha o ciclo e é o que faz o módulo entrar na rotina.
 *
 * Aba Agenda:
 *   A: ID | B: Data | C: DataFim | D: Titulo | E: Tipo | F: Turmas |
 *   G: Local | H: Status | I: Observacao
 *
 *   DataFim vazio = evento de um dia só.
 *   Turmas separadas por ponto e vírgula; vazio = todas as turmas.
 *   Datas guardadas como texto aaaa-mm-dd, igual às outras abas.
 *
 * Leitura é aberta (a equipe consulta sem código). Escrita pede o PIN.
 */

const ABA_AGENDA = 'Agenda';
const CAB_AGENDA = ['ID', 'Data', 'DataFim', 'Titulo', 'Tipo', 'Turmas', 'Local', 'Status', 'Observacao'];
const TIPOS_EVENTO = ['Apresentação', 'Competição', 'Data comemorativa', 'Bazar',
                      'Ensaio geral', 'Reunião', 'Mídia', 'Outro'];
const STATUS_EVENTO = ['Planejado', 'Confirmado', 'Realizado', 'Cancelado'];

/* Uma cor por tipo, a mesma na tela e no PDF. Todas passam contraste
   AA como texto sobre branco, porque no papel é assim que aparecem. */
const COR_TIPO = {
  'Apresentação': '#4A1D6E', 'Competição': '#A34A12', 'Data comemorativa': '#AF2338',
  'Bazar': '#16704A', 'Ensaio geral': '#1D5FA8', 'Reunião': '#56505E',
  'Mídia': '#8A6314', 'Outro': '#6B5E78'
};

/**
 * DATAS FIXAS oferecidas no começo do ano.
 *
 * Só entra aqui o que a coordenação CONFIRMOU. O calendário do instituto
 * mistura datas do setor cultural com datas da comunidade, e uma lista
 * genérica tirada da internet vira ruído que ela teria que apagar à mão.
 *
 * O Dia Internacional da Dança foi citado por ela na reunião. As demais
 * estão PENDENTES de confirmação — acrescente no mesmo formato:
 *   { dia: 'mm-dd', titulo: '...', tipo: 'Data comemorativa' },
 */
const DATAS_FIXAS = [
  { dia: '04-29', titulo: 'Dia Internacional da Dança', tipo: 'Data comemorativa' }
];

const ISO_DATA = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

function abaAgenda() {
  const ss = planilha();
  let aba = ss.getSheetByName(ABA_AGENDA);
  if (!aba) {
    aba = ss.insertSheet(ABA_AGENDA);
    aba.getRange(1, 1, 1, CAB_AGENDA.length).setValues([CAB_AGENDA]);
    aba.setFrozenRows(1);
    /* Data e DataFim como texto: o Sheets não converte e o fuso não
       entra na conta. Ver textoData em Util.gs. */
    aba.getRange(2, 2, aba.getMaxRows() - 1, 2).setNumberFormat('@');
  }
  return aba;
}

/* Sheets transforma "=algo" em fórmula. Nome de evento ou de material
   digitado assim viraria conta, ou erro, na planilha. */
function textoSeguro_(v, max) {
  let s = String(v == null ? '' : v).trim().replace(/\s+/g, ' ');
  if (max) s = s.slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function novoId_(prefixo) {
  return prefixo + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
}

function anoValido_(ano) {
  const a = Number(ano);
  if (!(a >= 2000 && a <= 2100) || Math.floor(a) !== a) throw new Error('Ano inválido.');
  return a;
}

function lerAgenda_() {
  const aba = planilha().getSheetByName(ABA_AGENDA);
  if (!aba || aba.getLastRow() < 2) return [];
  return aba.getRange(2, 1, aba.getLastRow() - 1, 9).getValues()
    .map(function (l, i) {
      const data = textoData(l[1]);
      let fim = textoData(l[2]);
      if (!ISO_DATA.test(fim) || fim <= data) fim = '';
      const tipo = String(l[4] || '').trim();
      const st = String(l[7] || '').trim();
      return {
        id: String(l[0] || '').trim(),
        data: data, dataFim: fim, fim: fim || data,
        titulo: String(l[3] || '').trim(),
        tipo: tipo || 'Outro',
        turmas: String(l[5] || '').split(';')
          .map(function (t) { return t.trim(); }).filter(Boolean),
        local: String(l[6] || '').trim(),
        status: STATUS_EVENTO.indexOf(st) !== -1 ? st : 'Planejado',
        obs: String(l[8] || '').trim(),
        linha: i + 2
      };
    })
    .filter(function (ev) { return ISO_DATA.test(ev.data) && ev.titulo; });
}

/* Linha digitada na mão, direto na planilha, não tem ID — e sem ID não
   dá para editar pelo app. Completa na primeira leitura. Se a trava
   estiver ocupada, deixa para a próxima: leitura não pode esperar. */
function lerAgendaComIds_() {
  const evs = lerAgenda_();
  const sem = evs.filter(function (ev) { return !ev.id; });
  if (!sem.length) return evs;
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(3000)) return evs.filter(function (ev) { return ev.id; });
  try {
    const aba = abaAgenda();
    sem.forEach(function (ev) {
      ev.id = novoId_('E');
      aba.getRange(ev.linha, 1).setValue(ev.id);
    });
  } finally { trava.releaseLock(); }
  return evs;
}

function porData_(a, b) {
  if (a.data !== b.data) return a.data < b.data ? -1 : 1;
  return a.titulo.localeCompare(b.titulo, 'pt-BR');
}

function eventoPublico_(ev) {
  return { id: ev.id, data: ev.data, dataFim: ev.dataFim, titulo: ev.titulo, tipo: ev.tipo,
           turmas: ev.turmas, local: ev.local, status: ev.status, obs: ev.obs };
}

function listasAgenda_() {
  let turmas = [];
  try {
    turmas = turmasRegistradas().filter(function (t) { return t.ativa; })
      .map(function (t) { return t.nome; })
      .sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
  } catch (e) {}
  return { tipos: TIPOS_EVENTO, status: STATUS_EVENTO, cores: COR_TIPO, turmas: turmas };
}

/** Eventos que tocam o mês, inclusive os de vários dias que começaram antes. */
function listarAgenda(ano, mes) {
  const a = anoValido_(ano), m = Number(mes);
  if (!(m >= 1 && m <= 12)) throw new Error('Mês inválido.');
  const mm = String(m).padStart(2, '0');
  const ini = a + '-' + mm + '-01', fimMes = a + '-' + mm + '-31';
  const evs = lerAgendaComIds_()
    .filter(function (ev) { return ev.data <= fimMes && ev.fim >= ini; })
    .sort(porData_);
  const r = listasAgenda_();
  r.ano = a; r.mes = m; r.hoje = hoje();
  r.eventos = evs.map(eventoPublico_);
  return r;
}

/** Os doze meses com a contagem de cada um. Cancelado não conta. */
function listarAgendaAno(ano) {
  const a = anoValido_(ano);
  const meses = [];
  for (let m = 1; m <= 12; m++) meses.push({ mes: m, total: 0, tipos: {} });
  let total = 0;
  lerAgenda_().forEach(function (ev) {
    if (ev.status === 'Cancelado') return;
    if (ev.data > a + '-12-31' || ev.fim < a + '-01-01') return;
    total++;
    const de = ev.data < a + '-01-01' ? 1 : Number(ev.data.slice(5, 7));
    const ate = ev.fim > a + '-12-31' ? 12 : Number(ev.fim.slice(5, 7));
    for (let m = de; m <= ate; m++) {
      meses[m - 1].total++;
      meses[m - 1].tipos[ev.tipo] = (meses[m - 1].tipos[ev.tipo] || 0) + 1;
    }
  });
  return { ano: a, hoje: hoje(), meses: meses, total: total, cores: COR_TIPO, tipos: TIPOS_EVENTO };
}

/* Valida e completa. Em edição, o que não veio fica como estava. */
function normalizarEvento_(d, base) {
  const b = base || {};
  function pega(k) { return d[k] !== undefined ? d[k] : b[k]; }

  const titulo = textoSeguro_(pega('titulo'), 120);
  if (titulo.replace(/^'/, '').length < 2) throw new Error('Escreva o nome do evento.');

  const data = String(pega('data') || '').trim();
  if (!ISO_DATA.test(data)) throw new Error('Escolha a data do evento.');
  anoValido_(data.slice(0, 4));

  let fim = String(pega('dataFim') || '').trim();
  if (!ISO_DATA.test(fim) || fim === data) fim = '';
  if (fim && fim < data) throw new Error('O evento termina antes de começar. Confira as datas.');

  const tipo = String(pega('tipo') || '').trim();
  let turmas = pega('turmas') || [];
  if (!Array.isArray(turmas)) turmas = String(turmas).split(';');
  const vistas = {};
  turmas = turmas.map(function (t) { return String(t || '').trim(); })
    .filter(function (t) { if (!t || vistas[t]) return false; vistas[t] = 1; return true; });
  const status = String(pega('status') || '').trim();

  return {
    titulo: titulo, data: data, dataFim: fim,
    tipo: TIPOS_EVENTO.indexOf(tipo) !== -1 ? tipo : (b.tipo || 'Outro'),
    turmas: turmas.map(function (t) { return textoSeguro_(t, 80); }).join('; '),
    local: textoSeguro_(pega('local'), 120),
    status: STATUS_EVENTO.indexOf(status) !== -1 ? status : 'Planejado',
    obs: textoSeguro_(pega('obs'), 500)
  };
}

function linhaEvento_(id, e) {
  return [id, e.data, e.dataFim, e.titulo, e.tipo, e.turmas, e.local, e.status, e.obs];
}

function gravarEventos_(aba, linhas) {
  const r = aba.getLastRow() + 1;
  garantirLinhas_(aba, r + linhas.length - 1);
  aba.getRange(r, 2, linhas.length, 2).setNumberFormat('@');
  aba.getRange(r, 1, linhas.length, 9).setValues(linhas);
}

function acharEvento_(id) {
  const alvo = String(id || '').trim();
  if (!alvo) throw new Error('Evento não encontrado.');
  const ev = lerAgenda_().filter(function (x) { return x.id === alvo; })[0];
  if (!ev) throw new Error('Esse evento não existe mais. Alguém pode ter apagado na planilha.');
  return ev;
}

function criarEvento(pin, dados) {
  exigirPin(pin);
  const e = normalizarEvento_(dados || {});
  return comTrava(function () {
    const id = novoId_('E');
    gravarEventos_(abaAgenda(), [linhaEvento_(id, e)]);
    return { ok: true, id: id, data: e.data };
  });
}

function editarEvento(pin, id, dados) {
  exigirPin(pin);
  return comTrava(function () {
    const ev = acharEvento_(id);
    const e = normalizarEvento_(dados || {}, ev);
    const aba = abaAgenda();
    aba.getRange(ev.linha, 2, 1, 2).setNumberFormat('@');
    aba.getRange(ev.linha, 1, 1, 9).setValues([linhaEvento_(ev.id, e)]);
    return { ok: true, id: ev.id, data: e.data };
  });
}

/* Apagar é para engano de digitação. Evento que não vai mais acontecer
   é Cancelado: continua no registro do ano. */
function excluirEvento(pin, id) {
  exigirPin(pin);
  return comTrava(function () {
    const ev = acharEvento_(id);
    abaAgenda().deleteRow(ev.linha);
    return { ok: true };
  });
}

/** A lista de datas fixas, dizendo quais já estão na agenda do ano. */
function datasFixas(ano) {
  const a = anoValido_(ano);
  const evs = lerAgenda_();
  return {
    ano: a, cores: COR_TIPO,
    datas: DATAS_FIXAS.map(function (df) {
      const data = a + '-' + df.dia;
      return {
        dia: df.dia, data: data, titulo: df.titulo, tipo: df.tipo,
        jaTem: evs.some(function (ev) { return ev.data === data && chave(ev.titulo) === chave(df.titulo); })
      };
    })
  };
}

/**
 * Coloca na agenda as datas fixas marcadas. lista = ['04-29', ...].
 * O título e o tipo vêm daqui, nunca do cliente. Não duplica: data que
 * já está na agenda do ano é pulada.
 */
function precarregarDatas(pin, ano, lista) {
  exigirPin(pin);
  const a = anoValido_(ano);
  const quer = (lista || []).map(String);
  const escolhidas = DATAS_FIXAS.filter(function (df) { return quer.indexOf(df.dia) !== -1; });
  if (!escolhidas.length) throw new Error('Marque pelo menos uma data.');

  return comTrava(function () {
    const evs = lerAgenda_();
    const novas = [];
    let jaTinha = 0;
    escolhidas.forEach(function (df) {
      const data = a + '-' + df.dia;
      if (evs.some(function (ev) { return ev.data === data && chave(ev.titulo) === chave(df.titulo); })) {
        jaTinha++; return;
      }
      novas.push(linhaEvento_(novoId_('E'),
        normalizarEvento_({ titulo: df.titulo, data: data, tipo: df.tipo, status: 'Confirmado' })));
    });
    if (novas.length) gravarEventos_(abaAgenda(), novas);
    return { ok: true, criados: novas.length, jaTinha: jaTinha };
  });
}

/* ══════════════════════════════════════════════════════════════
   CALENDÁRIO PARA IMPRIMIR
   ══════════════════════════════════════════════════════════════

   UMA DECISÃO QUE FOGE DA ESPECIFICAÇÃO — LEIA ANTES DE MEXER

   A especificação pede o PDF "a partir de HTML, pelo mesmo caminho do
   certificado". Esse caminho (Utilities.newBlob(html).getAs(PDF))
   ignora @page size: a página sai sempre em retrato. E o pedido é A4
   PAISAGEM, com a grade larga o bastante para escrever à mão.

   Por isso o calendário é montado num Google Docs temporário, com o
   tamanho de página definido pelo próprio Apps Script, exportado como
   PDF e jogado na lixeira em seguida. Continua sem biblioteca e sem
   serviço de fora. O custo: na primeira vez, o Google pede autorização
   para "Documentos", como pediu para o Drive no certificado.

   Layout: uma página por trimestre, com os três meses lado a lado. Se o
   trimestre tem mês com muito evento, esse trimestre sai com uma página
   por mês — a célula de trimestre só cabe duas linhas por dia.
*/

/* A bailarina do ícone, 120 px, 16 cores. */
const LOGO_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAMAAAAOusbgAAAAJFBMVEVKHW5PI3I8DGOkjrbGuNHi2+h/YJlyT464p8YzA1yLbqJjPIJ7cJUOAAAD5ElEQVRo3u1a247rIAxkjI2B/P//HhnShLTZbh+4rHRqrRSlXXXi23iAOPe1r33trxqwCJhokcOe/RpgEQkrcEnFM63Is5cgS+pLopMwv8BAMSbvV8RaJWVe0VIQp7IA10EUvAKXYna8IMVInFd4DMrifJxe1YYLnU8gRphKkmc7DLeJphVUDXNWdDps4phckD60hcvl7X9aQYO4R4YBR85hs8vvv1aCHPrQJWmUYlHpFxkHYhtKnUo6SswKOI3C21uvH4Huwh1gyY4cOd3IRfH4GRrOaIN8j0CbDyJE5SKaNn4LLdn+s1MHq2j2bKoxS0601QjcPiR7cirbJ+X/u1EUYS5YtEm0WmPJN8goMYZoL87KElJdGcBByrALwnhyC6AiLHty9JlSWIkX9RjNsb21ygWlgzsV9AnXPEUWBrlk+bZHMnop3W0U7fI4oQVy3iBoEx+48ArnwlieMHQ2wJFaiq3BfdgAzSxhM1warDpKpmG5rzVHSaXW1OBhCJf2Zi1/5OAlGO5guYPKovsNIbOVG4zkhsoOk1QRDwKxIt85dJ9MI3Hz0dkUROlxNzTSVUKeAJbcnUbGOuxwQpUxeMgi6iQ7frLSN5Uj3bVxZeC6FHTqZdS1GR2BjjwQeTvrx8gj+QoMJGNp8WlQktv6ySwSJab6RZDNjUOmZvhE8SF4U54AlI3JbEL55NBHgFysmfJlKpLTOqBEcgGESZTeuGgcrnLD2oqgQdWL37k7SujvcR0FO3JNd8HOwsdY6icyW4fbdnns6hiL6PmF7UL0JbCyErv4v3uZYrzUsmjnWOMpho9Ki834B9pW72MUnrZxKh5xCwR013ugy+akTalyd93Aw/F5R+B26oGwR/oJ2NRJ71C36xbK4vc75pYyIHHri3uVkNx0EMuxaIZVeG/cs6hBFy+L9/UxkrFHd8Y8c2d5bX6eNpFsAS6zorsd/fmyYECdkSLiR0ymo3xfKKyoAqgqhiiQpj/5ZaXyUJojgJscz90vbKp6HfCA2v0E+CbHI+2o5eHr7yeH6TzB6j5y33ucz0aOE12+LLsx8cSyncet0J1grbQavBa+unypqJlHlu1ZYadTh8/sSpQTT9IulYw++/CfAV+mcDl5mAH7Ov4nzYoX4Fn1VQ8cLh/kKcR5wxmTevlG4k1SIs1+wB6DOIU38cIYozcRd/duzsAxhb1eE9rsKI6z27BOGMs/sMUEhX2r72aQl969/DdZ6DZGugjYbSvenXLlHH8V8Jp3EacvlRubu3A87G47ZBLwBLa+B/argOforhvT/45B1vXTsrIe+17AO1tEmqC8iq2/9rWv/Q37BzTAE1ZTGw1sAAAAAElFTkSuQmCC';

const PDF_LARG = 841.89, PDF_ALT = 595.28;       // A4 paisagem, em pontos
const PDF_MARGEM = 28;
const PDF_UTIL = PDF_LARG - 2 * PDF_MARGEM;
const MUITO_NO_MES = 8;                          // acima disso, página por mês
const DIAS_CURTOS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DIAS_LONGOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MES_NOME = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho',
                  'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function gerarCalendarioPdf(pin, ano) {
  exigirPin(pin);
  const a = anoValido_(ano);
  const iniAno = a + '-01-01', fimAno = a + '-12-31';

  const evs = lerAgenda_()
    .filter(function (ev) { return ev.status !== 'Cancelado' && ev.data <= fimAno && ev.fim >= iniAno; })
    .sort(porData_);

  /* Evento de vários dias aparece em cada um dos dias. */
  const porDia = {}, porMes = {};
  evs.forEach(function (ev) {
    let d = ev.data < iniAno ? iniAno : ev.data;
    const ate = ev.fim > fimAno ? fimAno : ev.fim;
    let guarda = 0;
    while (d <= ate && guarda++ < 400) {
      (porDia[d] = porDia[d] || []).push(ev);
      porMes[d.slice(0, 7)] = (porMes[d.slice(0, 7)] || 0) + 1;
      d = somarDias_(d, 1);
    }
  });

  const paginas = [];
  for (let q = 0; q < 4; q++) {
    const meses = [q * 3 + 1, q * 3 + 2, q * 3 + 3];
    const cheio = meses.some(function (m) {
      const chaveMes = a + '-' + String(m).padStart(2, '0');
      if ((porMes[chaveMes] || 0) > MUITO_NO_MES) return true;
      return Object.keys(porDia).some(function (d) {
        return d.slice(0, 7) === chaveMes && porDia[d].length > 2;
      });
    });
    if (cheio) meses.forEach(function (m) { paginas.push({ meses: [m], rotulo: MES_NOME[m - 1] }); });
    else paginas.push({ meses: meses, rotulo: (q + 1) + 'º trimestre' });
  }

  const logo = Utilities.newBlob(Utilities.base64Decode(LOGO_PNG), 'image/png', 'logo.png');
  const nome = 'Calendário ' + a + ' — ' + CERT_INSTITUTO + '.pdf';
  const doc = DocumentApp.create('temporário — ' + nome);
  const idDoc = doc.getId();
  let arquivo;
  try {
    const body = doc.getBody();
    body.setPageWidth(PDF_LARG).setPageHeight(PDF_ALT)
        .setMarginTop(22).setMarginBottom(18)
        .setMarginLeft(PDF_MARGEM).setMarginRight(PDF_MARGEM);

    paginas.forEach(function (pg, i) {
      if (i > 0) pequeno_(body.appendParagraph('')).appendPageBreak();
      cabecalhoPdf_(body, logo, a, pg.rotulo);
      if (pg.meses.length === 3) trimestrePdf_(body, a, pg.meses, porDia);
      else mesPdf_(body, a, pg.meses[0], porDia);
      legendaPdf_(body);
    });

    /* O Docs nasce com um parágrafo vazio no topo; ele empurraria a
       primeira página e sobraria uma página em branco. */
    try {
      const p0 = body.getChild(0);
      if (p0.getType() === DocumentApp.ElementType.PARAGRAPH && p0.asParagraph().getText() === '')
        p0.removeFromParent();
    } catch (e) {}

    doc.saveAndClose();

    const pasta = pastaAgenda_();
    const antigos = pasta.getFilesByName(nome);
    while (antigos.hasNext()) antigos.next().setTrashed(true);   // um PDF por ano, sempre o último
    arquivo = pasta.createFile(DriveApp.getFileById(idDoc).getAs(MimeType.PDF).setName(nome));
  } finally {
    try { DriveApp.getFileById(idDoc).setTrashed(true); } catch (e) {}
  }

  /* Calendário não tem dado pessoal: vai com link aberto, para a equipe
     abrir do WhatsApp sem conta Google. */
  let publico = false;
  try {
    arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    publico = true;
  } catch (e) {}

  return {
    ok: true, url: arquivo.getUrl(), nome: nome, publico: publico,
    baixar: 'https://drive.google.com/uc?export=download&id=' + arquivo.getId(),
    paginas: paginas.length, eventos: evs.length
  };
}

function pastaAgenda_() {
  const nome = 'Agenda — ' + CERT_INSTITUTO;
  const achadas = DriveApp.getFoldersByName(nome);
  return achadas.hasNext() ? achadas.next() : DriveApp.createFolder(nome);
}

/* ─── peças do PDF ─── */

function attrs_(o) {
  const A = DocumentApp.Attribute, r = {};
  if (o.tam) r[A.FONT_SIZE] = o.tam;
  if (o.negrito !== undefined) r[A.BOLD] = o.negrito;
  if (o.cor) r[A.FOREGROUND_COLOR] = o.cor;
  r[A.FONT_FAMILY] = 'Arial';
  /* Sem respiro: o espaçamento padrão do Docs (1,15 e 11 pt) somado em
     cada célula estouraria a página. Vai tudo numa chamada só — são
     milhares de parágrafos, e cada chamada ao Docs custa. */
  r[A.SPACING_BEFORE] = 0;
  r[A.SPACING_AFTER] = o.depois || 0;
  r[A.LINE_SPACING] = 1;
  return r;
}

function estilo_(p, o) { p.setAttributes(attrs_(o)); return p; }
function pequeno_(p, tam) { return estilo_(p, { tam: tam || 2 }); }

function celula_(c, fundo, pad) {
  const A = DocumentApp.Attribute, r = {};
  r[A.PADDING_TOP] = pad; r[A.PADDING_BOTTOM] = pad;
  r[A.PADDING_LEFT] = pad + 1; r[A.PADDING_RIGHT] = pad + 1;
  r[A.VERTICAL_ALIGNMENT] = DocumentApp.VerticalAlignment.TOP;
  c.setAttributes(r);                       // uma chamada no lugar de cinco
  if (fundo) c.setBackgroundColor(fundo);
  return c;
}

/* Tabela de layout, sem fio. Se o Docs recusar largura zero, fio branco. */
function semBorda_(t) {
  t.setBorderColor('#FFFFFF');
  try { t.setBorderWidth(0); } catch (e) {}
  return t;
}

function cabecalhoPdf_(body, logo, ano, rotulo) {
  const t = semBorda_(body.appendTable([['', '', '']]));
  t.setColumnWidth(0, 44).setColumnWidth(1, PDF_UTIL - 44 - 190).setColumnWidth(2, 190);
  const c0 = celula_(t.getCell(0, 0), null, 0);
  const img = pequeno_(c0.getChild(0).asParagraph(), 2).appendInlineImage(logo.copyBlob());
  img.setWidth(36).setHeight(36);

  const c1 = celula_(t.getCell(0, 1), null, 0);
  estilo_(c1.getChild(0).asParagraph().setText(CERT_INSTITUTO.toUpperCase()), { tam: 8, negrito: true, cor: '#6B5E78' });
  estilo_(c1.appendParagraph('Calendário ' + ano), { tam: 20, negrito: true, cor: '#4A1D6E' });

  const c2 = celula_(t.getCell(0, 2), null, 0);
  const p3 = estilo_(c2.getChild(0).asParagraph().setText(rotulo), { tam: 13, negrito: true, cor: '#1B1020' });
  p3.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  pequeno_(body.appendParagraph(''), 6);
}

/* As semanas do mês: linhas de 7 datas iso, '' fora do mês. */
function semanasDoMes_(ano, mes) {
  const primeiro = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay();
  const dias = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const semanas = [];
  let semana = [];
  for (let i = 0; i < primeiro; i++) semana.push('');
  for (let d = 1; d <= dias; d++) {
    semana.push(ano + '-' + String(mes).padStart(2, '0') + '-' + String(d).padStart(2, '0'));
    if (semana.length === 7) { semanas.push(semana); semana = []; }
  }
  if (semana.length) { while (semana.length < 7) semana.push(''); semanas.push(semana); }
  return semanas;
}

function clarear_(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(function (v) {
    return Math.round(v + (255 - v) * f);
  });
  return '#' + c.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
}

function curto_(t, n) {
  t = String(t).replace(/^'/, '');
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

/**
 * Uma grade de mês dentro de um contêiner (corpo ou célula).
 * cfg = { larg, altGrade, dias, tamDia, tamEv, maxEv, maxLetras }
 */
function gradeMes_(alvo, ano, mes, porDia, cfg) {
  const semanas = semanasDoMes_(ano, mes);
  const linhas = [cfg.dias.slice()].concat(semanas.map(function (s) {
    return s.map(function (d) { return d ? String(Number(d.slice(8))) : ''; });
  }));
  const t = alvo.appendTable(linhas);
  t.setBorderWidth(0.5).setBorderColor('#CFC3DA');
  const col = (cfg.larg - 2) / 7;   // os fios também ocupam largura
  for (let i = 0; i < 7; i++) t.setColumnWidth(i, col);

  /* cabeçalho dos dias da semana */
  for (let i = 0; i < 7; i++) {
    const c = celula_(t.getCell(0, i), '#4A1D6E', 1);
    const p = estilo_(c.getChild(0).asParagraph(), { tam: cfg.tamDia, negrito: true, cor: '#FFFFFF' });
    p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  }

  /* A altura sobra DE PROPÓSITO: é o espaço de escrever à mão. */
  const alt = Math.floor(cfg.altGrade / semanas.length);
  semanas.forEach(function (s, r) {
    t.getRow(r + 1).setMinimumHeight(alt);
    s.forEach(function (d, i) {
      const evs = d ? (porDia[d] || []) : [];
      const fimDeSemana = i === 0 || i === 6;
      const fundo = !d ? '#F1ECF5'
        : evs.length ? clarear_(COR_TIPO[evs[0].tipo] || COR_TIPO.Outro, 0.9)
        : fimDeSemana ? '#FAF8FC' : '#FFFFFF';
      const c = celula_(t.getCell(r + 1, i), fundo, 2);
      estilo_(c.getChild(0).asParagraph(), { tam: cfg.tamDia, negrito: true, cor: fimDeSemana ? '#6B5E78' : '#1B1020' });
      evs.slice(0, cfg.maxEv).forEach(function (ev) {
        estilo_(c.appendParagraph(curto_(ev.titulo, cfg.maxLetras)),
          { tam: cfg.tamEv, negrito: true, cor: COR_TIPO[ev.tipo] || COR_TIPO.Outro });
      });
      if (evs.length > cfg.maxEv) {
        estilo_(c.appendParagraph('+ ' + (evs.length - cfg.maxEv)), { tam: cfg.tamEv, negrito: false, cor: '#6B5E78' });
      }
    });
  });
  return t;
}

function trimestrePdf_(body, ano, meses, porDia) {
  const vao = 10;
  const larg = (PDF_UTIL - 2 * vao) / 3;
  const t = semBorda_(body.appendTable([['', '', '', '', '']]));
  t.setColumnWidth(0, larg).setColumnWidth(1, vao).setColumnWidth(2, larg)
   .setColumnWidth(3, vao).setColumnWidth(4, larg);
  [1, 3].forEach(function (i) { celula_(t.getCell(0, i), null, 0); pequeno_(t.getCell(0, i).getChild(0).asParagraph()); });
  meses.forEach(function (m, i) {
    const c = celula_(t.getCell(0, i * 2), null, 0);
    estilo_(c.getChild(0).asParagraph().setText(MES_NOME[m - 1]), { tam: 12, negrito: true, cor: '#4A1D6E', depois: 4 });
    gradeMes_(c, ano, m, porDia, {
      larg: larg, altGrade: 392, dias: DIAS_CURTOS,
      tamDia: 7, tamEv: 6, maxEv: 2, maxLetras: 24
    });
    /* o Docs exige um parágrafo depois da tabela; que seja mínimo */
    const ult = c.getChild(c.getNumChildren() - 1);
    if (ult.getType() === DocumentApp.ElementType.PARAGRAPH) pequeno_(ult.asParagraph());
  });
  pequeno_(body.appendParagraph(''), 6);
}

function mesPdf_(body, ano, mes, porDia) {
  gradeMes_(body, ano, mes, porDia, {
    larg: PDF_UTIL, altGrade: 400, dias: DIAS_LONGOS,
    tamDia: 9, tamEv: 8, maxEv: 4, maxLetras: 34
  });
  pequeno_(body.appendParagraph(''), 6);
}

/* Legenda de cores por tipo, numa linha só, no rodapé da página. */
function legendaPdf_(body) {
  const SEP = '     ';
  let texto = '';
  const quadrados = [];
  TIPOS_EVENTO.forEach(function (tp, i) {
    quadrados.push({ pos: texto.length, cor: COR_TIPO[tp] });
    texto += '■ ' + tp + (i < TIPOS_EVENTO.length - 1 ? SEP : '');
  });
  const p = estilo_(body.appendParagraph(texto), { tam: 8, negrito: false, cor: '#1B1020' });
  const txt = p.editAsText();
  quadrados.forEach(function (q) {
    txt.setForegroundColor(q.pos, q.pos, q.cor);
    txt.setFontSize(q.pos, q.pos, 11);
  });
}
