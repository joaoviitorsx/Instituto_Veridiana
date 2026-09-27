/**
 * Certificado de participação.
 *
 * Uma menina de 17 anos aqui não tem nada no papel. O instituto tem, na
 * planilha, o registro exato de quantas aulas ela frequentou e desde
 * quando — e é o único lugar do mundo que consegue emitir esse documento.
 *
 * Serve para currículo de Jovem Aprendiz, atividade complementar na
 * escola e comprovação de vínculo em programa social.
 *
 * ─────────────────────────────────────────────────────────────
 * PREENCHA ANTES DE USAR
 * ───────────────────────────────────────────────────────────── */
const CERT_INSTITUTO = 'Instituto Veridiana';
const CERT_CIDADE    = 'Fortaleza';
const CERT_ASSINA    = '';            // nome de quem assina, ex: 'Veridiana Sousa'
const CERT_CARGO     = 'Coordenação';
const CERT_PROJETO   = '';            // opcional, ex: 'Sonho de Dançar'

const MESES_EXT = ['janeiro','fevereiro','março','abril','maio','junho','julho',
                   'agosto','setembro','outubro','novembro','dezembro'];
/* Resumo acumulado das horas: ver historicoCompleto0_. */
const ABA_HIST_CERT = '_HorasCertificado';
const BLOCO_HIST = 5000;               // linhas de Chamadas por leitura
const DIAS_REFAZER_HIST = 30;          // recontagem inteira de tempos em tempos

function dataPorExtenso_(iso) {
  const p = String(iso || '').split('-');
  if (p.length !== 3) return '';
  return Number(p[2]) + ' de ' + MESES_EXT[Number(p[1]) - 1] + ' de ' + p[0];
}
function mesAno_(iso) {
  const p = String(iso || '').split('-');
  if (p.length < 2) return '';
  return MESES_EXT[Number(p[1]) - 1] + ' de ' + p[0];
}

/**
 * Todo o histórico, indexado por TURMA + aluno.
 *
 * Indexar só pelo nome juntava duas "Maria Silva" de turmas diferentes
 * numa pessoa só — e o certificado saía com o dobro das horas e o nome
 * das duas turmas. Documento oficial com dado inventado.
 */
function historicoCompleto_() {
  /* Uma leitura para todas as turmas: antes cada turma aberta na tela
     de certificado relia o histórico inteiro. Continua acompanhando a
     versão das chamadas, porque é o número que vai no documento. */
  return doCache('histall_' + versaoResumo_(), TTL_CACHE, historicoCompleto0_);
}
/**
 * As horas de todo mundo, sem ler a aba Chamadas inteira.
 *
 * Antes lia tudo a cada vez, com teto de 50 mil linhas: no ritmo do
 * instituto (~20 linhas por turma por dia) isso acabava em cerca de um
 * ano, e dali em diante o certificado passaria a contar horas A MENOS.
 * Documento oficial com número errado.
 *
 * Agora há um resumo acumulado numa aba escondida (_HorasCertificado):
 * uma linha por turma + aluno, com primeira aula, última e presenças, e
 * até qual linha de Chamadas ele já contou. Cada pedido lê só as linhas
 * novas depois disso. A leitura fica pequena para sempre, sem teto.
 *
 * O resumo é recontado do zero quando:
 *   - alguma linha antiga de Chamadas foi apagada ou movida (a linha
 *     marcada como "contada até aqui" não é mais a mesma);
 *   - passou DIAS_REFAZER_HIST dias (pega correção feita à mão numa
 *     linha antiga, que não muda a posição de nada);
 *   - alguém pede no menu Veridiana → Recontar horas dos certificados.
 *
 * Os minutos saem na hora, de presenças × minutos da turma: mudar a
 * duração da aula na aba Turmas vale para o histórico todo, como antes.
 */
function historicoCompleto0_() {
  const aba = abaChamadas();
  const ultima = aba.getLastRow();
  const base = resumoHorasValido_(aba, ultima);
  const acc = base.acc;

  somarChamadas_(aba, base.ate + 1, ultima, acc);
  if (ultima > base.ate && (base.refeito || ultima - base.ate >= 500)) {
    guardarResumoHoras_(acc, aba, ultima, base.refeito ? Date.now() : base.em);
  }

  const minutos = {};
  turmasRegistradas().forEach(function (t) { minutos[t.nome] = t.minutos; });
  const por = { _completo: true };
  Object.keys(acc).forEach(function (k) {
    const a = acc[k], turma = k.slice(0, k.indexOf('|'));
    por[k] = { primeira: a.p, ultima: a.u, turmas: {}, aulas: a.n, minutos: a.n * (minutos[turma] || 60) };
    por[k].turmas[turma] = 1;
  });
  return por;
}

/* A marca de "contado até esta linha": o que está nela. Se alguém
   apagar ou inserir linhas antes, a marca deixa de bater. */
function assinaturaLinha_(aba, linha) {
  if (linha < 2) return 'vazio';
  return aba.getRange(linha, 1, 1, 6).getValues()[0].map(function (v) {
    return v instanceof Date ? v.getTime() : String(v);
  }).join('|');
}

function resumoHorasValido_(aba, ultima) {
  const pr = PropertiesService.getScriptProperties();
  const ate = Number(pr.getProperty('HIST_ATE') || 0);
  const em = Number(pr.getProperty('HIST_EM') || 0);
  const hist = planilha().getSheetByName(ABA_HIST_CERT);
  const vale = hist && ate >= 1 && ate <= ultima &&
    Date.now() - em < DIAS_REFAZER_HIST * 86400000 &&
    assinaturaLinha_(aba, ate) === pr.getProperty('HIST_ASSIN');
  if (!vale) return { acc: {}, ate: 1, em: 0, refeito: true };

  const acc = {};
  if (hist.getLastRow() > 1) {
    hist.getRange(2, 1, hist.getLastRow() - 1, 5).getValues().forEach(function (l) {
      const t = String(l[0] || ''), n = String(l[1] || '');
      if (t && n) acc[t + '|' + n] = { p: textoData(l[2]), u: textoData(l[3]), n: Number(l[4]) || 0 };
    });
  }
  return { acc: acc, ate: ate, em: em, refeito: false };
}

/* Linhas de..ate de Chamadas, da mais velha para a mais nova, em blocos. */
function somarChamadas_(aba, de, ate, acc) {
  for (let ini = Math.max(2, de); ini <= ate; ini += BLOCO_HIST) {
    const n = Math.min(BLOCO_HIST, ate - ini + 1);
    aba.getRange(ini, 2, n, 5).getValues().forEach(function (l) {   // Data, Turma, Professor, Aluno, Status
      const data = textoData(l[0]);
      const turma = String(l[1] || '').trim(), aluno = String(l[3] || '').trim();
      if (!data || !turma || !aluno) return;
      const k = turma + '|' + aluno;
      const a = acc[k] || (acc[k] = { p: data, u: data, n: 0 });
      if (data < a.p) a.p = data;
      if (data > a.u) a.u = data;
      if (String(l[4] || '').trim() === 'Presente') a.n++;
    });
  }
}

/* Grava o resumo. Se outra pessoa estiver gravando, deixa para a
   próxima: o número desta vez já saiu certo, só não fica guardado. */
function guardarResumoHoras_(acc, aba, ultima, em) {
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(5000)) return;
  try {
    let hist = planilha().getSheetByName(ABA_HIST_CERT);
    if (!hist) {
      hist = planilha().insertSheet(ABA_HIST_CERT);
      try { hist.hideSheet(); } catch (e) {}
    }
    const linhas = Object.keys(acc).sort().map(function (k) {
      const p = k.indexOf('|'), a = acc[k];
      return [k.slice(0, p), k.slice(p + 1), a.p, a.u, a.n];
    });
    hist.clearContents();
    hist.getRange(1, 1, 1, 5).setValues([['Turma', 'Aluno', 'Primeira', 'Ultima', 'Presencas']]);
    if (linhas.length) {
      garantirLinhas_(hist, linhas.length + 1);
      hist.getRange(2, 3, linhas.length, 2).setNumberFormat('@');   // datas como texto, igual a Chamadas
      hist.getRange(2, 1, linhas.length, 5).setValues(linhas);
    }
    const pr = PropertiesService.getScriptProperties();
    pr.setProperties({
      HIST_ATE: String(ultima),
      HIST_ASSIN: assinaturaLinha_(aba, ultima),
      HIST_EM: String(em)
    });
  } finally { trava.releaseLock(); }
}

/** Menu da planilha: força a recontagem inteira na próxima vez. */
function recontarHorasMenu() {
  PropertiesService.getScriptProperties().deleteProperty('HIST_ATE');
  invalidarCache();
  historicoCompleto0_();
  SpreadsheetApp.getUi().alert('Pronto. As horas dos certificados foram recontadas do zero.');
}

/**
 * Junta o histórico de um aluno.
 *
 * A mesma pessoa pode ter passado por várias turmas ao longo dos anos, e
 * o certificado deve somar tudo. Mas o nome é a única identidade que
 * existe: se ele aparece em mais de uma turma AO MESMO TEMPO na aba
 * Alunos, não dá para saber se é uma pessoa em duas turmas ou duas
 * pessoas homônimas. Nesse caso conta só a turma pedida, que é o palpite
 * seguro — errar para menos, nunca inventar hora.
 */
function historicoDe_(hist, nome, turma, ambiguo) {
  const junto = { primeira: '', ultima: '', turmas: {}, aulas: 0, minutos: 0 };
  Object.keys(hist).forEach(function (k) {
    const p = k.indexOf('|');
    if (p === -1) return;                    // _completo, não é aluno
    if (k.slice(p + 1) !== nome) return;
    if (ambiguo && k.slice(0, p) !== turma) return;
    const h = hist[k];
    if (!junto.primeira || h.primeira < junto.primeira) junto.primeira = h.primeira;
    if (h.ultima > junto.ultima) junto.ultima = h.ultima;
    Object.keys(h.turmas).forEach(function (t) { junto.turmas[t] = 1; });
    junto.aulas += h.aulas;
    junto.minutos += h.minutos;
  });
  return junto.aulas || junto.primeira ? junto : null;
}

/** Nomes que estão em mais de uma turma ativa ao mesmo tempo. */
function nomesAmbiguos_() {
  const vistos = {}, ambiguos = {};
  lerAlunos_().forEach(function (a) {
    if (!vistos[a.nome]) vistos[a.nome] = a.turma;
    else if (vistos[a.nome] !== a.turma) ambiguos[a.nome] = true;
  });
  return ambiguos;
}

function listaTurmas_(mapa) {
  const ns = Object.keys(mapa).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
  if (ns.length === 1) return ns[0];
  if (ns.length === 2) return ns[0] + ' e ' + ns[1];
  return ns.slice(0, -1).join(', ') + ' e ' + ns[ns.length - 1];
}

/** Quem da turma já tem histórico suficiente para receber certificado. */
function alunosParaCertificado(sessao, turma) {
  exigirSessao(sessao);
  return doCache('cert_' + turma + '_' + versaoResumo_(), TTL_CACHE, function () { return alunosParaCertificado_(sessao, turma); });
}
function alunosParaCertificado_(sessao, turma) {
  const hist = historicoCompleto_();
  const ambiguos = nomesAmbiguos_();
  return lerAlunos_()
    .filter(function (a) { return !turma || a.turma === turma; })
    .map(function (a) {
      const h = historicoDe_(hist, a.nome, a.turma, !!ambiguos[a.nome]);
      return {
        nome: a.nome, turma: a.turma, ativo: a.ativo,
        aulas: h ? h.aulas : 0,
        horas: h ? Math.round(h.minutos / 60) : 0,
        desde: h ? h.primeira : '',
        homonimo: !!ambiguos[a.nome],
        responsavel: a.responsavel, telefone: a.telefone
      };
    })
    .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
}

function pastaCertificados_() {
  const nome = 'Certificados — ' + CERT_INSTITUTO;
  const achadas = DriveApp.getFoldersByName(nome);
  return achadas.hasNext() ? achadas.next() : DriveApp.createFolder(nome);
}

/**
 * Gera um PDF com um certificado por página.
 * nomes = array de nomes de alunos.
 */
function gerarCertificado(sessao, nomes, turma) {
  exigirSessao(sessao);
  const lista = (nomes || []).filter(function (n) { return String(n || '').trim(); });
  if (!lista.length) throw new Error('Escolha pelo menos um aluno.');
  if (lista.length > 60) throw new Error('Máximo de 60 certificados por vez.');

  const hist = historicoCompleto_();
  const ambiguos = nomesAmbiguos_();
  const hoje_ = hoje();
  const paginas = [], feitos = [], dados = {};

  lista.forEach(function (nome) {
    const h = historicoDe_(hist, nome, turma, !!ambiguos[nome]);
    if (!h || !h.aulas) return;   // sem presença registrada, não certifica
    dados[nome] = h;
    feitos.push(nome);
  });
  feitos.forEach(function (nome, i) {
    paginas.push(paginaCertificado_(nome, dados[nome], i < feitos.length - 1, hoje_));
  });

  if (!paginas.length)
    throw new Error('Nenhum desses alunos tem presença registrada ainda.');

  const html = '<html><head><meta charset="utf-8"></head>' +
               '<body style="margin:0;padding:0">' + paginas.join('') + '</body></html>';

  const arquivo = pastaCertificados_().createFile(
    Utilities.newBlob(html, MimeType.HTML, 'cert.html')
      .getAs(MimeType.PDF)
      .setName(nomeArquivo_(feitos, turma, hoje_)));

  /* Um aluno só: libera por link para o PDF abrir no celular da família,
     que não tem conta Google. A turma inteira NÃO é liberada — teria o
     nome de 20 crianças num link público. Esse é para a Vera imprimir.
     Para revogar depois: Drive, botão direito no arquivo, Compartilhar. */
  let publico = false;
  if (feitos.length === 1) {
    try {
      arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      publico = true;
    } catch (e) { publico = false; }
  }

  return {
    ok: true, url: arquivo.getUrl(), nome: arquivo.getName(),
    completo: hist._completo !== false,
    quantidade: paginas.length, aluno: feitos.length === 1 ? feitos[0] : '',
    publico: publico,
    ignorados: lista.filter(function (n) { return feitos.indexOf(n) === -1; })
  };
}

function nomeArquivo_(lista, turma, data) {
  if (lista.length === 1) return 'Certificado — ' + lista[0] + ' — ' + data + '.pdf';
  return 'Certificados — ' + (turma || 'vários') + ' — ' + data + '.pdf';
}

/* O conversor de PDF do Apps Script é antigo: layout em tabela e estilo
   inline, nada de flex ou grid. Feio por dentro, correto por fora. */
function paginaCertificado_(nome, h, quebra, hoje_) {
  const horas = Math.round(h.minutos / 60);
  const qtdTurmas = Object.keys(h.turmas).length;
  const turmas = listaTurmas_(h.turmas);
  const artigo = qtdTurmas > 1 ? 'nas turmas ' : 'na turma ';
  const periodo = mesAno_(h.primeira) === mesAno_(h.ultima)
    ? 'em ' + mesAno_(h.primeira)
    : 'de ' + mesAno_(h.primeira) + ' a ' + mesAno_(h.ultima);
  const projeto = CERT_PROJETO ? ' do projeto <b>' + escapaHtml_(CERT_PROJETO) + '</b>' : '';

  return '' +
  '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;' +
  (quebra ? 'page-break-after:always;' : '') + '">' +
    '<tr><td style="background:#4A1D6E;height:14px"></td></tr>' +
    '<tr><td style="padding:96px 56px 0;text-align:center;font-family:Georgia,serif">' +
      '<div style="font-size:13px;letter-spacing:3px;color:#6B5E78">' +
        escapaHtml_(CERT_INSTITUTO.toUpperCase()) + '</div>' +
      '<div style="font-size:34px;color:#4A1D6E;padding:18px 0 6px">Certificado</div>' +
      '<div style="font-size:13px;color:#6B5E78">de participação</div>' +
    '</td></tr>' +
    '<tr><td style="padding:36px 72px 0;font-family:Georgia,serif;font-size:15px;' +
      'line-height:1.9;color:#1B1020;text-align:center">' +
      'Certificamos que' +
      '<div style="font-size:26px;color:#4A1D6E;padding:14px 0 12px">' +
        escapaHtml_(nome) + '</div>' +
      'participou das atividades de formação em dança' + projeto +
      ', ' + artigo + escapaHtml_(turmas) + ', ' + periodo + '.' +
    '</td></tr>' +
    '<tr><td style="padding:34px 72px 0">' +
      '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">' +
        '<tr>' +
          celulaNumero_(h.aulas, h.aulas === 1 ? 'aula frequentada' : 'aulas frequentadas') +
          celulaNumero_(horas, horas === 1 ? 'hora de formação' : 'horas de formação') +
        '</tr>' +
      '</table>' +
    '</td></tr>' +
    '<tr><td style="padding:76px 72px 0;text-align:center;font-family:Georgia,serif;' +
      'font-size:13px;color:#6B5E78">' +
      escapaHtml_(CERT_CIDADE) + ', ' + dataPorExtenso_(hoje_) +
    '</td></tr>' +
    '<tr><td style="padding:56px 72px 0;text-align:center">' +
      '<div style="border-top:1px solid #1B1020;width:280px;margin:0 auto"></div>' +
      '<div style="font-family:Georgia,serif;font-size:14px;padding-top:8px;color:#1B1020">' +
        escapaHtml_(CERT_ASSINA || CERT_INSTITUTO) + '</div>' +
      '<div style="font-family:Georgia,serif;font-size:12px;color:#6B5E78">' +
        escapaHtml_(CERT_CARGO) + '</div>' +
    '</td></tr>' +
    '<tr><td style="height:110px"></td></tr>' +
    '<tr><td style="background:#4A1D6E;height:14px"></td></tr>' +
  '</table>';
}

function celulaNumero_(valor, rotulo) {
  return '<td width="50%" style="text-align:center;padding:16px 0;' +
         'border:1px solid #E5DCEC;font-family:Georgia,serif">' +
    '<div style="font-size:30px;color:#4A1D6E">' + valor + '</div>' +
    '<div style="font-size:12px;color:#6B5E78;padding-top:4px">' + rotulo + '</div>' +
  '</td>';
}

function escapaHtml_(t) {
  return String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
