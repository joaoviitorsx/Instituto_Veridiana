/**
 * Impacto: alerta de evasão, relatório de prestação de contas e
 * aniversariantes.
 *
 * Nada aqui inventa dado novo. Tudo sai das mesmas linhas de Chamadas e
 * Alunos que o app já grava — a diferença é que agora alguém lê.
 */

/* ─── idade ─── */
function idadeEm_(nascISO, refISO) {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(nascISO || ''))) return null;
  const n = nascISO.split('-').map(Number);
  const r = (refISO || hoje()).split('-').map(Number);
  let idade = r[0] - n[0];
  if (r[1] < n[1] || (r[1] === n[1] && r[2] < n[2])) idade--;
  return idade >= 0 && idade < 120 ? idade : null;
}

/* ─── leitura de Chamadas para análise ─── */
/* 120 dias cobrem 3 faltas seguidas com folga enorme, e a leitura para
   de crescer com o histórico. */
const DIAS_RISCO = 120;

/**
 * Quem faltou N aulas seguidas da própria turma.
 *
 * Três faltas consecutivas é o gatilho que a busca ativa usa na rede
 * pública. A ideia é a mesma: perceber na primeira semana, não no
 * terceiro mês, quando já virou hábito.
 *
 * Justificada conta como ausência — a criança não estava lá — mas vem
 * separada no resultado, para a conversa com a família ser outra.
 */
function alunosEmRisco(pin, minimo) {
  exigirPin(pin);
  const alvo = Math.max(2, Number(minimo) || 3);
  const linhas = lerChamadasDesde_(diasAtras_(DIAS_RISCO)).linhas;

  const datasPorTurma = {}, statusPor = {};
  linhas.forEach(function (r) {
    if (!datasPorTurma[r.turma]) datasPorTurma[r.turma] = {};
    datasPorTurma[r.turma][r.data] = 1;
    statusPor[r.turma + '|' + r.aluno + '|' + r.data] = r.status;
  });
  Object.keys(datasPorTurma).forEach(function (t) {
    datasPorTurma[t] = Object.keys(datasPorTurma[t]).sort().reverse();
  });

  const risco = [];
  lerAlunos_().forEach(function (a) {
    if (!a.ativo) return;
    const datas = datasPorTurma[a.turma];
    if (!datas || !datas.length) return;

    let seguidas = 0, justificadas = 0, ultimaPresenca = '', desde = '';
    for (let i = 0; i < datas.length; i++) {
      const st = statusPor[a.turma + '|' + a.nome + '|' + datas[i]];
      if (st === undefined) break;              // ainda não estava na turma
      if (st === 'Presente') { ultimaPresenca = datas[i]; break; }
      seguidas++;
      if (st === 'Justificada') justificadas++;
      desde = datas[i];
    }
    if (seguidas >= alvo) {
      risco.push({
        aluno: a.nome, turma: a.turma, faltas: seguidas, justificadas: justificadas,
        desde: desde, ultimaPresenca: ultimaPresenca,
        responsavel: a.responsavel, telefone: a.telefone,
        idade: idadeEm_(a.nascimento)
      });
    }
  });

  risco.sort(function (x, y) {
    if (y.faltas !== x.faltas) return y.faltas - x.faltas;
    return x.aluno.localeCompare(y.aluno, 'pt-BR');
  });
  return { minimo: alvo, alunos: risco };
}

/** Só a contagem, para o menu de gestão mostrar sem carregar a tela toda. */
function contarRisco(pin) {
  exigirPin(pin);
  return alunosEmRisco(pin, 3).alunos.length;
}

/**
 * Relatório de período, no formato que edital e prestação de contas
 * pedem: beneficiários únicos, aulas realizadas, frequência e faixa
 * etária. As faixas seguem ECA e Estatuto da Juventude, que é o recorte
 * que os editais usam.
 */
function relatorioPeriodo(pin, inicio, fim) {
  exigirPin(pin);
  const de = String(inicio || ''), ate = String(fim || '');
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(de) || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(ate))
    throw new Error('Escolha as duas datas do período.');
  if (de > ate) throw new Error('A data de início vem depois da data de fim.');

  /* Lê exatamente o período pedido, não uma quantidade fixa de linhas. */
  const lido = lerChamadasDesde_(de);
  const linhas = lido.linhas.filter(function (r) {
    return r.data >= de && r.data <= ate;
  });

  const beneficiarios = {}, aulas = {}, porTurma = {};
  linhas.forEach(function (r) {
    beneficiarios[r.aluno] = 1;
    aulas[r.data + '|' + r.turma] = 1;
    if (!porTurma[r.turma]) porTurma[r.turma] = { turma: r.turma, dias: {}, alunos: {}, presentes: 0, total: 0 };
    const t = porTurma[r.turma];
    t.dias[r.data] = 1; t.alunos[r.aluno] = 1; t.total++;
    if (r.status === 'Presente') t.presentes++;
  });

  const idades = {};
  lerAlunos_().forEach(function (a) { idades[a.nome] = idadeEm_(a.nascimento); });

  const faixas = { 'Crianças (até 11)': 0, 'Adolescentes (12 a 17)': 0,
                   'Jovens (18 a 29)': 0, 'Adultos (30 ou mais)': 0,
                   'Sem data de nascimento': 0 };
  Object.keys(beneficiarios).forEach(function (nome) {
    const i = idades[nome];
    if (i === null || i === undefined) faixas['Sem data de nascimento']++;
    else if (i <= 11) faixas['Crianças (até 11)']++;
    else if (i <= 17) faixas['Adolescentes (12 a 17)']++;
    else if (i <= 29) faixas['Jovens (18 a 29)']++;
    else faixas['Adultos (30 ou mais)']++;
  });

  const turmas = Object.keys(porTurma).map(function (k) {
    const t = porTurma[k];
    return { turma: t.turma, aulas: Object.keys(t.dias).length,
             alunos: Object.keys(t.alunos).length,
             presentes: t.presentes, total: t.total,
             pct: t.total ? Math.round(t.presentes * 100 / t.total) : 0 };
  }).sort(function (a, b) { return a.turma.localeCompare(b.turma, 'pt-BR'); });

  let presentes = 0, total = 0;
  turmas.forEach(function (t) { presentes += t.presentes; total += t.total; });

  return {
    inicio: de, fim: ate,
    /* false = a leitura bateu no teto e os números estão por baixo.
       A tela precisa dizer isso: número errado é pior que número nenhum. */
    completo: lido.completo,
    beneficiarios: Object.keys(beneficiarios).length,
    aulas: Object.keys(aulas).length,
    turmas: turmas,
    faixas: faixas,
    frequencia: total ? Math.round(presentes * 100 / total) : 0
  };
}

/** Aniversariantes de hoje até daqui a 6 dias. */
function aniversariantesSemana(pin) {
  exigirPin(pin);
  return aniversariantesEntre_(0, 6, '');
}

function aniversariantesEntre_(deDias, ateDias, turma) {
  const base = new Date();
  const alvos = {};
  for (let d = deDias; d <= ateDias; d++) {
    const x = new Date(base.getTime() + d * 86400000);
    alvos[Utilities.formatDate(x, FUSO, 'MM-dd')] = Utilities.formatDate(x, FUSO, 'yyyy-MM-dd');
  }
  const fora = [];
  lerAlunos_().forEach(function (a) {
    if (!a.ativo || !a.nascimento) return;
    if (turma && a.turma !== turma) return;
    const md = a.nascimento.slice(5);
    if (!alvos[md]) return;
    fora.push({ aluno: a.nome, turma: a.turma, dia: alvos[md],
                faz: idadeEm_(a.nascimento, alvos[md]) });
  });
  fora.sort(function (x, y) {
    return x.dia === y.dia ? x.aluno.localeCompare(y.aluno, 'pt-BR') : (x.dia < y.dia ? -1 : 1);
  });
  return fora;
}
