/**
 * Leitura do histórico por mês, só leitura.
 */

/** Meses que já tiveram chamada, do mais novo para o mais velho. */
function mesesComChamada(sessao) {
  exigirSessao(sessao);
  /* A lista de meses só muda quando o mês vira: não precisa cair a cada
     chamada salva (antes, cada queda relia a coluna inteira). */
  return doCache('meses_' + hoje().slice(0, 7), TTL_CACHE, function () { return mesesComChamada_(sessao); });
}
function mesesComChamada_(sessao) {
  const aba = abaChamadas();
  const ultima = aba.getLastRow();
  if (ultima < 2) return [];

  /* Lê de trás para frente e para ao juntar 24 meses. Antes varria a
     coluna inteira — dezenas de milhares de células — para devolver uma
     lista que já era cortada em 24 na linha seguinte. */
  const BLOCO = 3000;
  const vistos = {}, ordem = [];
  let fim = ultima;
  while (fim >= 2 && ordem.length < 24) {
    const inicio = Math.max(2, fim - BLOCO + 1);
    const vals = aba.getRange(inicio, 2, fim - inicio + 1, 1).getValues();
    for (let i = vals.length - 1; i >= 0 && ordem.length < 24; i--) {
      const d = textoData(vals[i][0]);
      if (d && d.length >= 7 && !vistos[d.slice(0, 7)]) {
        vistos[d.slice(0, 7)] = 1;
        ordem.push(d.slice(0, 7));
      }
    }
    fim = inicio - 1;
  }
  return ordem.sort().reverse();
}

/**
 * Lê Chamadas de trás para frente e para assim que passa do mês pedido.
 * A aba só recebe append, então a ordem é cronológica e dá para parar
 * cedo em vez de varrer anos de linha.
 */
function lerMes_(mes) {
  const aba = abaChamadas();
  const ultima = aba.getLastRow();
  if (ultima < 2) return [];
  const BLOCO = 2000;
  const achadas = [];
  let fim = ultima;
  while (fim >= 2) {
    const inicio = Math.max(2, fim - BLOCO + 1);
    const vals = aba.getRange(inicio, 2, fim - inicio + 1, 5).getValues(); // B..F
    let passou = false;
    for (let i = vals.length - 1; i >= 0; i--) {
      const d = textoData(vals[i][0]);
      if (!d || d.length < 7) continue;
      const m = d.slice(0, 7);
      if (m > mes) continue;
      if (m < mes) { passou = true; break; }
      achadas.push({
        data: d,
        turma: String(vals[i][1] || '').trim(),
        professor: String(vals[i][2] || '').trim(),
        status: String(vals[i][4] || '').trim()
      });
    }
    if (passou) break;
    fim = inicio - 1;
  }
  return achadas;
}

/** Resumo de um mês: cada aula dada e o total por turma. */
function resumoHistorico(sessao, mes) {
  exigirSessao(sessao);
  /* Mês que já passou não muda com chamada nova: só o mês corrente
     acompanha a versão das chamadas. */
  const ver = String(mes) === hoje().slice(0, 7) ? versaoResumo_() : 'fechado';
  return doCache('hist_' + mes + '_' + ver, TTL_CACHE, function () { return resumoHistorico_(sessao, mes); });
}
function resumoHistorico_(sessao, mes) {
  if (!/^[0-9]{4}-[0-9]{2}$/.test(String(mes || ''))) throw new Error('Mês inválido.');

  const linhas = lerMes_(mes);
  const aulas = {}, porTurma = {};

  linhas.forEach(function (l) {
    if (!l.turma) return;
    const k = l.data + '|' + l.turma;
    if (!aulas[k]) aulas[k] = { data: l.data, turma: l.turma, professor: l.professor, presentes: 0, total: 0 };
    aulas[k].total++;
    if (l.status === 'Presente') aulas[k].presentes++;

    if (!porTurma[l.turma]) porTurma[l.turma] = { turma: l.turma, dias: {}, presentes: 0, total: 0 };
    porTurma[l.turma].dias[l.data] = 1;
    porTurma[l.turma].total++;
    if (l.status === 'Presente') porTurma[l.turma].presentes++;
  });

  const listaAulas = Object.keys(aulas).map(function (k) { return aulas[k]; })
    .sort(function (a, b) {
      if (a.data !== b.data) return a.data < b.data ? 1 : -1;
      return a.turma.localeCompare(b.turma, 'pt-BR');
    });

  const listaTurmas = Object.keys(porTurma).map(function (k) {
    const t = porTurma[k];
    return {
      turma: t.turma,
      aulas: Object.keys(t.dias).length,
      presentes: t.presentes,
      total: t.total,
      pct: t.total ? Math.round(t.presentes * 100 / t.total) : 0
    };
  }).sort(function (a, b) { return a.turma.localeCompare(b.turma, 'pt-BR'); });

  let presentes = 0, marcacoes = 0;
  listaTurmas.forEach(function (t) { presentes += t.presentes; marcacoes += t.total; });

  return {
    mes: mes,
    aulas: listaAulas,
    turmas: listaTurmas,
    totais: {
      aulas: listaAulas.length,
      presentes: presentes,
      marcacoes: marcacoes,
      pct: marcacoes ? Math.round(presentes * 100 / marcacoes) : 0
    }
  };
}
