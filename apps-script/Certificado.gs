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
const LIMITE_HISTORICO = 50000;       // linhas de Chamadas lidas de uma vez

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
function historicoCompleto0_() {
  /* O certificado precisa do histórico INTEIRO da aluna — é o número de
     horas que vai no documento. Lê tudo, com teto de segurança. */
  const lido = lerChamadasDesde_('', LIMITE_HISTORICO);

  const minutos = {};
  turmasRegistradas().forEach(function (t) { minutos[t.nome] = t.minutos; });

  const por = { _completo: lido.completo };
  lido.linhas.forEach(function (r) {
    const k = r.turma + '|' + r.aluno;
    if (!por[k]) por[k] = { primeira: r.data, ultima: r.data, turmas: {}, aulas: 0, minutos: 0 };
    const h = por[k];
    if (r.data < h.primeira) h.primeira = r.data;
    if (r.data > h.ultima) h.ultima = r.data;
    h.turmas[r.turma] = 1;
    if (r.status === 'Presente') {
      h.aulas++;
      h.minutos += (minutos[r.turma] || 60);
    }
  });
  return por;
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
