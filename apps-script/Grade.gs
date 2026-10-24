/**
 * Grade semanal de aulas: que turma tem aula em que dia, de que hora a
 * que hora, em que sala e com quem.
 *
 * Aba Grade (criada no primeiro uso):
 *   A: ID | B: Turma | C: Dia | D: Inicio | E: Fim | F: Sala | G: Professora | H: Observacao
 *
 *   Dia por extenso ("Segunda"), Inicio e Fim como texto "14:00": quem
 *   abre a planilha lê e conserta sem saber nada de código. A leitura
 *   aceita variações digitadas à mão ("seg", "segunda-feira", "14h",
 *   "14:00:00").
 *
 * A grade é o retrato de agora, não histórico: aula que acabou sai da
 * grade (a frequência dela continua inteira em Chamadas).
 *
 * Com grade, o cartão "Aula agora" da tela inicial fica certo desde o
 * primeiro dia (ver aulaDaGrade_). Sem grade, vale o palpite pelas
 * chamadas salvas, como antes (Inicio.gs).
 *
 * Leitura e escrita são de toda a equipe logada.
 */

const ABA_GRADE = 'Grade';
const CAB_GRADE = ['ID', 'Turma', 'Dia', 'Inicio', 'Fim', 'Sala', 'Professora', 'Observacao'];
/* 0 = domingo, igual a Date.getDay() e a diaDaSemana_ (Inicio.gs). */
const DIAS_GRADE = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MAX_AULA_MIN = 360;   // aula de mais de 6 h é quase certamente erro de digitação

function abaGrade() {
  const ss = planilha();
  let aba = ss.getSheetByName(ABA_GRADE);
  if (!aba) {
    aba = ss.insertSheet(ABA_GRADE);
    aba.getRange(1, 1, 1, CAB_GRADE.length).setValues([CAB_GRADE]);
    aba.setFrozenRows(1);
    /* Hora como texto: o Sheets não vira Date e o fuso não entra na conta. */
    aba.getRange(2, 4, aba.getMaxRows() - 1, 2).setNumberFormat('@');
  }
  return aba;
}

/* "seg", "Segunda-feira", "2" (segunda), "terca" → índice 0..6, ou -1. */
function diaDaGrade_(v) {
  const s = chave(v).replace(/-feira$/, '');
  if (/^[0-6]$/.test(s)) return Number(s);
  for (let i = 0; i < 7; i++) {
    const nome = chave(DIAS_GRADE[i]);
    if (s === nome || (s.length >= 3 && nome.indexOf(s) === 0)) return i;
  }
  return -1;
}

/* "14:00", "14h", "14h30", "9:5", Date da planilha → minutos, ou -1. */
function minutosDaHora_(v) {
  if (v instanceof Date) {
    const h = Utilities.formatDate(v, fusoPlanilha_(), 'HH:mm').split(':');
    return Number(h[0]) * 60 + Number(h[1]);
  }
  const m = String(v == null ? '' : v).trim().toLowerCase().match(/^(\d{1,2})\s*(?:[:h]\s*(\d{1,2})?)?(?::\d{2})?$/);
  if (!m) return -1;
  const h = Number(m[1]), min = Number(m[2] || 0);
  if (h > 23 || min > 59) return -1;
  return h * 60 + min;
}
function textoHoraGrade_(min) {
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
}

function lerGrade_() {
  const aba = planilha().getSheetByName(ABA_GRADE);
  if (!aba || aba.getLastRow() < 2) return [];
  return aba.getRange(2, 1, aba.getLastRow() - 1, 8).getValues()
    .map(function (l, i) {
      const ini = minutosDaHora_(l[3]), fim = minutosDaHora_(l[4]);
      return {
        id: String(l[0] || '').trim(),
        turma: String(l[1] || '').trim(),
        dia: diaDaGrade_(l[2]),
        ini: ini, fim: fim,
        sala: String(l[5] || '').trim(),
        professor: String(l[6] || '').trim(),
        obs: String(l[7] || '').trim(),
        linha: i + 2
      };
    })
    .filter(function (h) { return h.turma && h.dia >= 0 && h.ini >= 0 && h.fim > h.ini; });
}

/* Linha digitada na mão não tem ID; completa na primeira leitura, como a
   Agenda. Trava ocupada: deixa para a próxima, leitura não espera. */
function lerGradeComIds_() {
  const hs = lerGrade_();
  const sem = hs.filter(function (h) { return !h.id; });
  if (!sem.length) return hs;
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(3000)) return hs.filter(function (h) { return h.id; });
  try {
    const aba = abaGrade();
    sem.forEach(function (h) {
      h.id = novoId_('G');
      aba.getRange(h.linha, 1).setValue(h.id);
    });
  } finally { trava.releaseLock(); }
  return hs;
}

function porHorario_(a, b) {
  if (a.dia !== b.dia) return a.dia - b.dia;
  if (a.ini !== b.ini) return a.ini - b.ini;
  return a.turma.localeCompare(b.turma, 'pt-BR');
}

function horarioPublico_(h) {
  return { id: h.id, turma: h.turma, dia: h.dia, inicio: textoHoraGrade_(h.ini), fim: textoHoraGrade_(h.fim),
           sala: h.sala, professor: h.professor, obs: h.obs };
}

/* A grade com cache; escrita pela gestão (comTrava) derruba. */
function gradeEmCache_() {
  return doCache('grade', TTL_CACHE, function () {
    return lerGradeComIds_().sort(porHorario_).map(function (h) {
      return { id: h.id, turma: h.turma, dia: h.dia, ini: h.ini, fim: h.fim, sala: h.sala, professor: h.professor, obs: h.obs };
    });
  });
}

/**
 * Tudo que a tela da grade precisa numa ida só: os horários, as listas
 * para o cadastro e quais turmas já tiveram chamada hoje (para a lista
 * "Aulas de hoje" marcar o que já foi feito).
 */
function listarGrade(sessao) {
  exigirSessao(sessao);
  const hj = hoje();
  let turmas = [], professores = [];
  try {
    turmas = turmasRegistradas().filter(function (t) { return t.ativa; }).map(function (t) { return t.nome; })
      .sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
  } catch (e) {}
  try { professores = lerProfessores().map(function (p) { return p.nome; }).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); }); } catch (e) {}
  const hs = gradeEmCache_();
  const salas = {};
  hs.forEach(function (h) { if (h.sala) salas[h.sala] = 1; });
  let feitas = {};
  try { feitas = mapaRecentes_().hoje || {}; } catch (e) {}
  return {
    hoje: hj,
    dia: diaDaSemana_(hj),
    dias: DIAS_GRADE,
    horarios: hs.map(function (h) { return horarioPublico_(h); }),
    turmas: turmas,
    professores: professores,
    salas: Object.keys(salas).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); }),
    feitasHoje: Object.keys(feitas)
  };
}

/* Valida e completa. Em edição, o que não veio fica como estava. */
function normalizarHorario_(d, base) {
  const b = base || {};
  function pega(k) { return d[k] !== undefined ? d[k] : b[k]; }

  const turma = String(pega('turma') || '').trim();
  if (!turma) throw new Error('Escolha a turma.');
  const ativas = turmasRegistradas().filter(function (t) { return t.ativa; }).map(function (t) { return t.nome; });
  const turmaOk = ativas.filter(function (t) { return chave(t) === chave(turma); })[0];
  if (!turmaOk) throw new Error('A turma "' + turma + '" não está ativa. Confira em Gestão → Turmas.');

  const ini = minutosDaHora_(d.inicio !== undefined ? d.inicio : (b.ini >= 0 ? textoHoraGrade_(b.ini) : ''));
  const fim = minutosDaHora_(d.fim !== undefined ? d.fim : (b.fim >= 0 ? textoHoraGrade_(b.fim) : ''));
  if (ini < 0) throw new Error('Escolha a hora em que a aula começa.');
  if (fim < 0) throw new Error('Escolha a hora em que a aula termina.');
  if (fim <= ini) throw new Error('A aula termina antes de começar. Confira os horários.');
  if (fim - ini > MAX_AULA_MIN) throw new Error('Essa aula ficou com mais de 6 horas. Confira os horários.');

  let professor = String(pega('professor') || '').trim();
  if (professor) {
    const p = lerProfessores().filter(function (x) { return chave(x.nome) === chave(professor); })[0];
    if (!p) throw new Error(professor + ' não está na equipe. Confira em Gestão → Equipe.');
    professor = p.nome;
  }

  return {
    turma: turmaOk, ini: ini, fim: fim,
    sala: textoSeguro_(pega('sala'), 40),
    professor: professor,
    obs: textoSeguro_(pega('obs'), 200)
  };
}

/* Dias pedidos: lista [1, 3] ou um número. Sem repetição, só 0..6. */
function diasPedidos_(d, base) {
  let v = d.dias !== undefined ? d.dias : d.dia !== undefined ? [d.dia] : base ? [base.dia] : [];
  if (!Array.isArray(v)) v = [v];
  const vistos = {}, dias = [];
  v.forEach(function (x) {
    const i = typeof x === 'number' ? x : diaDaGrade_(x);
    if (i >= 0 && i <= 6 && !vistos[i]) { vistos[i] = 1; dias.push(i); }
  });
  if (!dias.length) throw new Error('Escolha pelo menos um dia da semana.');
  return dias.sort();
}

/* Mesma sala, mesma professora ou mesma turma no mesmo horário. Volta
   frases prontas para a tela. */
function conflitosGrade_(novos, ignorarId) {
  const hs = lerGrade_();
  const frases = [];
  function hora(m) { return textoHora_(m); }   // "14h", "14h30" (Inicio.gs)
  novos.forEach(function (n) {
    hs.forEach(function (h) {
      if (h.id && h.id === ignorarId) return;
      if (h.dia !== n.dia || !(h.ini < n.fim && n.ini < h.fim)) return;
      const quando = DIAS_GRADE[h.dia].toLowerCase() + ', das ' + hora(h.ini) + ' às ' + hora(h.fim);
      if (chave(h.turma) === chave(n.turma)) frases.push(h.turma + ' já tem aula na ' + quando + '.');
      else if (n.sala && chave(h.sala) === chave(n.sala)) frases.push('A sala ' + h.sala + ' já tem ' + h.turma + ' na ' + quando + '.');
      else if (n.professor && chave(h.professor) === chave(n.professor)) frases.push(h.professor + ' já dá ' + h.turma + ' na ' + quando + '.');
    });
  });
  return frases.filter(function (f, i) { return frases.indexOf(f) === i; }).slice(0, 4);
}

function linhaHorario_(id, dia, e) {
  return [id, e.turma, DIAS_GRADE[dia], textoHoraGrade_(e.ini), textoHoraGrade_(e.fim), e.sala, e.professor, e.obs];
}

function acharHorario_(id) {
  const alvo = String(id || '').trim();
  const h = alvo && lerGrade_().filter(function (x) { return x.id === alvo; })[0];
  if (!h) throw new Error('Esse horário não está mais na grade. Alguém pode ter mexido na planilha.');
  return h;
}

/**
 * Cria a mesma aula em um ou mais dias (dados.dias = [1, 3] para segunda
 * e quarta). Conflito de sala, professora ou turma não grava: volta
 * "CONFLITO: ..." e o app pergunta; dados.forcar grava assim mesmo.
 */
function criarHorario(sessao, dados) {
  exigirSessao(sessao);
  const d = dados || {};
  const e = normalizarHorario_(d);
  const dias = diasPedidos_(d);
  return comTrava(function () {
    const novos = dias.map(function (dia) { return { dia: dia, ini: e.ini, fim: e.fim, turma: e.turma, sala: e.sala, professor: e.professor }; });
    if (!d.forcar) {
      const c = conflitosGrade_(novos, '');
      if (c.length) throw new Error('CONFLITO: ' + c.join(' '));
    }
    const aba = abaGrade();
    const linhas = dias.map(function (dia) { return linhaHorario_(novoId_('G'), dia, e); });
    const r = aba.getLastRow() + 1;
    garantirLinhas_(aba, r + linhas.length - 1);
    aba.getRange(r, 4, linhas.length, 2).setNumberFormat('@');
    aba.getRange(r, 1, linhas.length, 8).setValues(linhas);
    return { ok: true, ids: linhas.map(function (l) { return l[0]; }), criados: linhas.length };
  });
}

/** Edita um horário (um dia). Mesma regra de conflito. */
function editarHorario(sessao, id, dados) {
  exigirSessao(sessao);
  const d = dados || {};
  return comTrava(function () {
    const h = acharHorario_(id);
    const e = normalizarHorario_(d, h);
    const dia = diasPedidos_(d, h)[0];
    if (!d.forcar) {
      const c = conflitosGrade_([{ dia: dia, ini: e.ini, fim: e.fim, turma: e.turma, sala: e.sala, professor: e.professor }], h.id);
      if (c.length) throw new Error('CONFLITO: ' + c.join(' '));
    }
    const aba = abaGrade();
    aba.getRange(h.linha, 4, 1, 2).setNumberFormat('@');
    aba.getRange(h.linha, 1, 1, 8).setValues([linhaHorario_(h.id, dia, e)]);
    return { ok: true, id: h.id };
  });
}

/** Tira da grade. A frequência dessa turma continua inteira em Chamadas. */
function excluirHorario(sessao, id) {
  exigirSessao(sessao);
  return comTrava(function () {
    const h = acharHorario_(id);
    abaGrade().deleteRow(h.linha);
    return { ok: true };
  });
}

/**
 * O cartão "Aula agora" pela grade. Três respostas:
 *   undefined - não há grade nenhuma: o chamador usa o palpite antigo
 *   null      - há grade, mas nada para hoje a partir de agora
 *   {...}     - a aula que está acontecendo, ou a próxima de hoje
 * Prefere as turmas de quem está logado. Turma que já teve chamada hoje
 * não entra. Duas aulas começando juntas sem como desempatar: cala,
 * como o palpite antigo — cartão errado custa mais que cartão nenhum.
 */
function aulaDaGrade_(prof, hj) {
  const todos = gradeEmCache_();
  if (!todos.length) return undefined;
  const dia = diaDaSemana_(hj);
  const ativas = listarTurmas_();
  const feitas = mapaRecentes_().hoje || {};
  let doDia = todos.filter(function (h) { return h.dia === dia && ativas.indexOf(h.turma) !== -1 && !feitas[h.turma]; });
  const k = chave(prof);
  if (k) {
    const minhas = doDia.filter(function (h) { return chave(h.professor) === k; });
    if (minhas.length) doDia = minhas;
  }
  const hm = Utilities.formatDate(new Date(), FUSO, 'HH:mm').split(':');
  const agora = Number(hm[0]) * 60 + Number(hm[1]);
  /* "Agora": de 30 min antes de começar até o fim da aula. */
  const acontecendo = doDia.filter(function (h) { return agora >= h.ini - 30 && agora <= h.fim; });
  const lista = acontecendo.length ? acontecendo : doDia.filter(function (h) { return h.ini > agora; });
  if (!lista.length) return null;
  lista.sort(function (a, b) { return a.ini - b.ini; });
  const melhor = lista[0];
  if (lista[1] && lista[1].ini === melhor.ini) return null;
  return {
    tipo: 'aula', origem: 'grade', turma: melhor.turma,
    agora: acontecendo.length > 0,
    hora: textoHora_(melhor.ini), fim: textoHora_(melhor.fim),
    sala: melhor.sala, professor: melhor.professor
  };
}
