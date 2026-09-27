/**
 * O fluxo do QR: listar turmas, carregar a turma e salvar a chamada.
 */

/** Lista as turmas que têm pelo menos um aluno ativo. */
function listarTurmas() {
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
function carregarTurma(turma) {
  /* Elenco muda so pela gestao, entao vale cache. Ja "chamada de hoje"
     e "ultimo professor" tem que vir frescos a cada abertura. */
  const fixo = doCache('elenco_' + turma, TTL_CACHE, function () {
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
    return { alunos: alunos, professores: professores };
  });

  const alunos = fixo.alunos, professores = fixo.professores;
  const recentes = lerRecentes();
  const data = hoje();

  return {
    turma: turma,
    alunos: alunos,
    professores: professores,
    professorSugerido: ultimoProfessor(recentes, turma, professores),
    data: data,
    jaRegistrada: recentes.some(function (l) {
      return textoData(l[1]) === data && String(l[2]).trim() === turma;
    }),
    /* Zero toque a mais na chamada, mas o professor vê antes da aula
       começar. Para uma criança daqui, o instituto lembrar do
       aniversário dela não é enfeite. */
    aniversarios: aniversariantesEntre_(0, 0, turma)
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
 * Chamadas dos últimos DIAS_RECENTES dias.
 *
 * Serve para duas coisas: saber se a turma já teve chamada hoje, e qual
 * professora deu essa turma da última vez. Antes eram 500 linhas fixas —
 * com 10 turmas isso é uns 2 dias, então numa turma semanal a sugestão
 * de professora simplesmente não achava nada.
 */
function lerRecentes() {
  return lerChamadasDesde_(diasAtras_(DIAS_RECENTES), 20000).linhas
    .map(function (r) { return [null, r.data, r.turma, r.professor]; });
}

/** Quem deu essa turma da última vez. Some da sugestão se saiu da equipe. */
function ultimoProfessor(recentes, turma, professores) {
  for (let i = recentes.length - 1; i >= 0; i--) {
    if (String(recentes[i][2]).trim() === turma) {
      const nome = String(recentes[i][3]).trim();
      if (nome && professores.indexOf(nome) !== -1) return nome;
    }
  }
  return '';
}

function chamadaJaExiste(turma, data) {
  return lerRecentes().some(function (l) {
    return textoData(l[1]) === data && String(l[2]).trim() === turma;
  });
}

/**
 * Grava a chamada. Uma linha por aluno, que é o formato que a Tabela
 * Dinâmica do Planilhas entende sem nenhuma fórmula.
 * dados = { turma, professor, token, presencas: [{aluno, status}] }
 */
function salvarChamada(dados) {
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
    tocarResumo_();   // a "próxima aula" da tela inicial já não é esta
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
