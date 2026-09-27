/**
 * O fluxo do QR: listar turmas, carregar a turma e salvar a chamada.
 */

/** Lista as turmas que têm pelo menos um aluno ativo. */
function listarTurmas(sessao) {
  exigirSessao(sessao);
  return listarTurmas_();
}
function listarTurmas_() {
  return doCache('turmas', TTL_CACHE, function () {
  const aba = planilha().getSheetByName(ABA_ALUNOS);
  if (!aba) throw new Error('A aba "Alunos" não foi encontrada na planilha.');

  const turmas = [];
  lerFaixaAlunos(aba).forEach(function (linha) {
    const turma = String(linha[0] || '').trim();
    const aluno = String(linha[1] || '').trim();
    const ativo = String(linha[2] || 'SIM').trim().toUpperCase();
    if (turma && aluno && ativo !== 'NAO' && ativo !== 'NÃO') {
      if (turmas.indexOf(turma) === -1) turmas.push(turma);
    }
  });
  return turmas.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
  });
}

/* getDataRange() traz a planilha inteira, inclusive colunas que ninguem
   usa. Aqui so as tres que interessam. */
function lerFaixaAlunos(aba) {
  if (aba.getLastRow() < 2) return [];
  const cols = Math.min(6, aba.getMaxColumns());
  return aba.getRange(2, 1, aba.getLastRow() - 1, cols).getValues();
}

/** Tudo que a tela da turma precisa, em uma única ida ao servidor. */
function carregarTurma(sessao, turma) {
  exigirSessao(sessao);
  /* Elenco muda so pela gestao, entao vale cache. Ja "chamada de hoje"
     e "ultimo professor" tem que vir frescos a cada abertura. */
  /* Aniversário de hoje entra no mesmo cache (daí o dia na chave): era
     uma leitura inteira da aba Alunos a cada abertura de chamada. */
  const fixo = doCache('elenco_' + turma + '_' + hoje(), TTL_CACHE, function () {
    const ss = planilha();
    const abaAlunos = ss.getSheetByName(ABA_ALUNOS);
    if (!abaAlunos) throw new Error('A aba "Alunos" não foi encontrada na planilha.');

    const alunos = [];
    lerFaixaAlunos(abaAlunos).forEach(function (linha) {
      const t = String(linha[0] || '').trim();
      const nome = String(linha[1] || '').trim();
      const ativo = String(linha[2] || 'SIM').trim().toUpperCase();
      if (t === turma && nome && ativo !== 'NAO' && ativo !== 'NÃO') alunos.push(nome);
    });
    alunos.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });

    const professores = [];
    const abaProf = ss.getSheetByName(ABA_PROFESSORES);
    if (abaProf && abaProf.getLastRow() > 1) {
      abaProf.getRange(2, 1, abaProf.getLastRow() - 1, 1).getValues().forEach(function (linha) {
        const nome = String(linha[0] || '').trim();
        if (nome && professores.indexOf(nome) === -1) professores.push(nome);
      });
      professores.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
    }
    return { alunos: alunos, professores: professores,
             aniversarios: aniversariantesEntre_(0, 0, turma) };
  });

  const alunos = fixo.alunos, professores = fixo.professores;
  const rec = mapaRecentes_();

  return {
    turma: turma,
    alunos: alunos,
    professores: professores,
    /* A mais recente que ainda está na equipe. */
    professorSugerido: (rec.ultimos[turma] || []).filter(function (n) {
      return professores.indexOf(n) !== -1;
    })[0] || '',
    data: hoje(),
    jaRegistrada: !!rec.hoje[turma],
    /* Zero toque a mais na chamada, mas o professor vê antes da aula
       começar. Para uma criança daqui, o instituto lembrar do
       aniversário dela não é enfeite. */
    aniversarios: fixo.aniversarios
  };
}

function abaChamadas() {
  const ss = planilha();
  let aba = ss.getSheetByName(ABA_CHAMADAS);
  if (!aba) {
    aba = ss.insertSheet(ABA_CHAMADAS);
    aba.appendRow(['Registro', 'Data', 'Turma', 'Professor', 'Aluno', 'Status']);
    aba.setFrozenRows(1);
    /* Coluna Data como texto: o Sheets não converte para Date e o fuso
       deixa de entrar na conta. */
    aba.getRange(2, 2, aba.getMaxRows() - 1, 1).setNumberFormat('@');
  }
  return aba;
}

/**
 * Quem deu cada turma por último e quais turmas já têm chamada hoje —
 * calculado uma vez para TODAS as turmas e guardado no cache.
 *
 * Antes, cada abertura de chamada lia 60 dias da aba Chamadas só para
 * responder essas duas perguntas sobre uma turma. Agora a primeira
 * abertura do dia paga a leitura e as outras saem do cache.
 *
 * Chamada salva NÃO derruba este cache: salvarChamada atualiza o mapa
 * guardado ali mesmo (atualizarRecentes_). Derrubar fazia a próxima
 * professora a abrir uma turma — justo na troca de aula — pagar de novo
 * a leitura de 60 dias.
 *
 * Também corrige a ordem: lerChamadasDesde_ devolve da linha mais nova
 * para a mais velha, e o código antigo percorria de trás para frente —
 * sugeria a professora mais ANTIGA dos 60 dias, não a da última aula.
 */
function mapaRecentes_() {
  const data = hoje();
  return doCache(chaveRecentes_(data), TTL_CACHE, function () {
    const ultimos = {}, hojeTem = {};
    lerChamadasDesde_(diasAtras_(DIAS_RECENTES), 20000).linhas.forEach(function (r) {
      if (r.data === data) hojeTem[r.turma] = 1;
      const l = ultimos[r.turma] || (ultimos[r.turma] = []);
      if (r.professor && l.indexOf(r.professor) === -1 && l.length < 6) l.push(r.professor);
    });
    return { hoje: hojeTem, ultimos: ultimos };
  });
}

function chaveRecentes_(data) { return 'rec_' + data; }

/* Depois de salvar: a turma passa a ter chamada hoje e quem deu a aula
   vira a sugestão. Se o mapa não estiver no cache, nada a fazer — a
   próxima leitura já vem da planilha com esta chamada. */
function atualizarRecentes_(data, turma, professor) {
  try {
    const c = CacheService.getScriptCache(), k = chaveRecentes_(data) + '_' + versaoDados();
    const v = c.get(k);
    if (!v) return;
    const m = JSON.parse(v);
    m.hoje[turma] = 1;
    const l = (m.ultimos[turma] || []).filter(function (n) { return n !== professor; });
    l.unshift(professor);
    m.ultimos[turma] = l.slice(0, 6);
    c.put(k, JSON.stringify(m), TTL_CACHE);
  } catch (e) {}
}

/* Só as linhas de hoje, que ficam no fim da aba: dezenas, não os 60 dias
   que se liam antes. Roda dentro da trava, então precisa ser curta. */
function chamadaJaExiste(turma, data) {
  return lerChamadasDesde_(data, 3000).linhas.some(function (r) {
    return r.data === data && r.turma === turma;
  });
}

/**
 * Grava a chamada. Uma linha por aluno, que é o formato que a Tabela
 * Dinâmica do Planilhas entende sem nenhuma fórmula.
 * dados = { turma, professor, token, presencas: [{aluno, status}] }
 */
function salvarChamada(sessao, dados) {
  exigirSessao(sessao);
  if (!dados || !dados.turma) throw new Error('Turma não informada.');
  if (!dados.professor) throw new Error('Escolha quem está dando a aula.');
  if (!dados.presencas || !dados.presencas.length) throw new Error('Nenhum aluno na lista.');
  const VALIDOS = ['Presente', 'Falta', 'Justificada'];
  dados.presencas.forEach(function (p) {
    if (VALIDOS.indexOf(p.status) === -1)
      throw new Error('Status inválido: ' + p.status);
  });

  const cache = CacheService.getScriptCache();
  const chave = 'tk_' + String(dados.token || '');

  // Retry depois de timeout de rede não pode gravar de novo.
  if (dados.token) {
    const feito = cache.get(chave);
    if (feito) return JSON.parse(feito);
  }

  const trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try {
    if (dados.token) {
      const feito = cache.get(chave);
      if (feito) return JSON.parse(feito);
    }

    const data = hoje();

    /* O token cobre repetição da MESMA sessão. Não cobre a professora
       reabrir o app às 16h e salvar de novo a aula das 15h: token novo,
       turma inteira duplicada. O cliente confirma antes e manda forcar. */
    if (!dados.forcar && chamadaJaExiste(dados.turma, data)) {
      throw new Error('DUPLICADA: já existe chamada de ' + dados.turma + ' hoje.');
    }

    const registro = new Date();
    const linhas = dados.presencas.map(function (p) {
      return [registro, data, dados.turma, dados.professor, p.aluno, p.status];
    });

    const aba = abaChamadas();
    const primeira = aba.getLastRow() + 1;
    garantirLinhas_(aba, primeira + linhas.length - 1);
    aba.getRange(primeira, 1, linhas.length, 6).setValues(linhas);

    const presentes = dados.presencas.filter(function (p) {
      return p.status === 'Presente';
    }).length;

    const resposta = {
      ok: true,
      turma: dados.turma,
      professor: dados.professor,
      data: data,
      total: dados.presencas.length,
      presentes: presentes,
      faltas: dados.presencas.length - presentes
    };

    if (dados.token) cache.put(chave, JSON.stringify(resposta), TTL_TOKEN);
    atualizarRecentes_(data, dados.turma, dados.professor);
    tocarResumo_();   // histórico, risco e certificado passam a contar esta aula
    return resposta;
  } finally {
    trava.releaseLock();
  }
}

/* ══════════════════════════════════════════════════════════════
   ÁREA DE GESTÃO
   ══════════════════════════════════════════════════════════════

   DUAS DECISÕES QUE FUGEM DA ESPECIFICAÇÃO — LEIA ANTES DE MEXER

   1. Existe uma quarta aba, "Turmas" (A: Turma | B: Ativa).
      Ela é criada e preenchida sozinha no primeiro uso.
      Por quê: turma criada sem nenhum aluno não tem onde morar nas
      três abas originais, e "arquivar" precisa de um lugar para
      guardar que a turma saiu de circulação. Guardar isso numa
      Property deixaria invisível para quem abre a planilha. A aba
      é visível, editável na mão e se explica sozinha.

   2. desativarAluno / reativarAluno / moverAluno recebem a turma
      como argumento a mais.
      Por quê: a especificação permite o mesmo nome em turmas
      diferentes e mesmo assim identifica o aluno só pelo nome.
      Sem a turma, "desativar a Maria" é ambíguo e desativa a Maria
      errada. Com a turma, some a ambiguidade. Se vier sem turma e o
      nome existir em mais de um lugar, a função recusa e explica.
*/
