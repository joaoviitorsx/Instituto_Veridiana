/**
 * Tela inicial: os números da grade e o cartão de destaque.
 *
 * Roda em toda abertura do app sem QR. Por isso lê só as colunas que
 * usa, lê Chamadas de trás para frente só até 5 semanas atrás (nunca a
 * aba inteira), e guarda o resultado 10 minutos no cache. Qualquer
 * escrita da gestão derruba esse cache (versaoDados), e chamada salva
 * também (tocarResumo_), porque muda a "próxima aula".
 *
 * Cada número é calculado dentro de um try: aba que ainda não existe ou
 * dado torto some da tela, em vez de derrubar a tela inteira. A tela
 * mostra linha vazia no lugar de zero ou traço.
 */

/* O saldo do caixa aparece na tela inicial, que abre SEM código.
   Qualquer pessoa com o link do app (sem ?turma=) vê o número.
   Se a coordenação preferir que o saldo fique só dentro do Caixa,
   troque para false: a linha some e nada mais muda. */
const MOSTRAR_SALDO_NA_ENTRADA = true;

const TTL_RESUMO = 600;            // 10 min
const SEMANAS_PADRAO_AULA = 5;     // janela para descobrir o dia de cada turma
const DIAS_EVENTO_DESTAQUE = 14;   // evento só vira destaque se estiver perto

function resumoInicial(prof) {
  const p = String(prof || '').trim().slice(0, 80);
  const hora = Utilities.formatDate(new Date(), FUSO, 'HH');
  /* A hora entra na chave porque "próxima aula" depende do relógio. */
  const k = 'ini_' + hoje() + '_' + hora + '_' + versaoResumo_() + '_' +
            Utilities.base64EncodeWebSafe(chave(p)).slice(0, 60);

  return doCache(k, TTL_RESUMO, function () {
    const r = { turmas: 0, proximo: null, saldo: null, materiais: null, destaque: null };
    const hj = hoje();

    try { r.turmas = listarTurmas().length; } catch (e) {}

    let eventos = [];
    try {
      eventos = eventosDaquiPraFrente_(hj).filter(function (ev) { return ev.status !== 'Cancelado'; });
    } catch (e) {}
    if (eventos.length) r.proximo = { titulo: eventos[0].titulo, data: eventos[0].data };

    if (MOSTRAR_SALDO_NA_ENTRADA) { try { r.saldo = saldoCaixa_(hj); } catch (e) {} }
    try { r.materiais = contarMateriais_(); } catch (e) {}
    try { r.destaque = destaque_(p, eventos, hj); } catch (e) {}
    return r;
  });
}

/* Eventos que ainda não terminaram, do mais próximo para o mais longe.
   Não cria a aba: tela inicial é leitura. */
function eventosDaquiPraFrente_(hj) {
  if (!planilha().getSheetByName(ABA_AGENDA)) return [];
  return lerAgenda_()
    .filter(function (ev) { return ev.fim >= hj; })
    .sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : 0; });
}

/* Mesmo número do "em caixa" da tela do Caixa no mês corrente:
   tudo que entrou menos tudo que saiu até o fim deste mês. */
function saldoCaixa_(hj) {
  const aba = planilha().getSheetByName(ABA_CAIXA);
  if (!aba || aba.getLastRow() < 2) return null;
  const mes = hj.slice(0, 7);
  let s = 0, algum = false;
  aba.getRange(2, 2, aba.getLastRow() - 1, 3).getValues().forEach(function (l) {
    const data = textoData(l[0]), tipo = String(l[1] || '').trim();
    if (!data || !tipo || data.slice(0, 7) > mes) return;
    const v = valorNumero_(l[2]) || 0;
    s += tipo === 'Entrada' ? v : -v;
    algum = true;
  });
  return algum ? Math.round(s * 100) / 100 : null;
}

function contarMateriais_() {
  const aba = planilha().getSheetByName(ABA_MATERIAIS);
  if (!aba || aba.getLastRow() < 2) return null;
  const n = aba.getLastRow() - 1;
  const itens = aba.getRange(2, 2, n, 1).getValues();
  const ativos = aba.getRange(2, 9, n, 1).getValues();
  let c = 0;
  for (let i = 0; i < n; i++) {
    if (String(itens[i][0] || '').trim() && !ehNao_(ativos[i][0])) c++;
  }
  return c;
}

/**
 * O cartão de cima. Ordem: evento que acontece hoje > aula que deve
 * estar começando > evento nos próximos 14 dias. Nada disso, nada de
 * cartão.
 */
function destaque_(prof, eventos, hj) {
  const deHoje = eventos.filter(function (ev) { return ev.data <= hj && ev.fim >= hj; })[0];
  if (deHoje) return eventoCurto_(deHoje, true);

  const aula = proximaAula_(prof, hj);
  if (aula) return aula;

  const limite = somarDias_(hj, DIAS_EVENTO_DESTAQUE);
  const perto = eventos.filter(function (ev) { return ev.data > hj && ev.data <= limite; })[0];
  return perto ? eventoCurto_(perto, false) : null;
}

function eventoCurto_(ev, deHoje) {
  return { tipo: 'evento', hoje: deHoje, titulo: ev.titulo, data: ev.data, tipoEvento: ev.tipo };
}

/**
 * Qual turma deve estar entrando agora.
 *
 * A planilha não tem grade de horário, e pedir para alguém manter uma
 * seria pedir um cadastro que ninguém faz. Mas cada chamada salva tem a
 * hora exata na coluna Registro. Então: turmas que tiveram aula neste
 * mesmo dia da semana nas últimas 5 semanas, na hora em que costumam
 * ser salvas, e que ainda não têm chamada hoje.
 *
 * Com ?prof=, prefere as turmas que essa pessoa costuma dar.
 */
function proximaAula_(prof, hj) {
  const aba = planilha().getSheetByName(ABA_CHAMADAS);
  if (!aba || aba.getLastRow() < 2) return null;

  const limite = diasAtras_(SEMANAS_PADRAO_AULA * 7);
  const dia = diaDaSemana_(hj);
  const hm = Utilities.formatDate(new Date(), FUSO, 'HH:mm').split(':');
  const agora = Number(hm[0]) * 60 + Number(hm[1]);
  const ativas = listarTurmas();

  const aulas = {}, feitasHoje = {};
  const BLOCO = 2000, TETO = 12000;
  let fim = aba.getLastRow(), lidas = 0;
  while (fim >= 2 && lidas < TETO) {
    const ini = Math.max(2, fim - BLOCO + 1);
    const vals = aba.getRange(ini, 1, fim - ini + 1, 4).getValues();   // Registro, Data, Turma, Professor
    lidas += vals.length;
    let passou = false;
    for (let i = vals.length - 1; i >= 0; i--) {
      const data = textoData(vals[i][1]);
      if (!data) continue;
      if (data < limite) { passou = true; break; }
      const turma = String(vals[i][2] || '').trim();
      if (!turma) continue;
      if (data === hj) { feitasHoje[turma] = 1; continue; }
      if (diaDaSemana_(data) !== dia) continue;
      const a = aulas[turma] || (aulas[turma] = { dias: {}, minutos: [], profs: {} });
      a.profs[chave(vals[i][3])] = 1;
      if (a.dias[data]) continue;           // uma linha por aula basta para a hora
      a.dias[data] = 1;
      if (vals[i][0] instanceof Date) {
        const h = Utilities.formatDate(vals[i][0], FUSO, 'HH:mm').split(':');
        a.minutos.push(Number(h[0]) * 60 + Number(h[1]));
      }
    }
    if (passou || ini === 2) break;
    fim = ini - 1;
  }

  let candidatas = Object.keys(aulas).filter(function (t) {
    return ativas.indexOf(t) !== -1 && !feitasHoje[t];
  });
  if (!candidatas.length) return null;
  const k = chave(prof);
  if (k) {
    const minhas = candidatas.filter(function (t) { return aulas[t].profs[k]; });
    if (minhas.length) candidatas = minhas;
  }

  /* Chamada costuma ser salva no começo da aula. Até 90 min depois do
     horário de costume ainda é "agora"; mais que isso, a aula passou. */
  let melhor = null;
  candidatas.forEach(function (t) {
    const ms = aulas[t].minutos.slice().sort(function (a, b) { return a - b; });
    const tipico = ms.length ? ms[Math.floor(ms.length / 2)] : null;
    let nota;
    if (tipico === null) nota = 5000;                        // sem hora: último recurso
    else if (tipico < agora - 90) return;                    // já passou
    else if (tipico <= agora + 30) nota = Math.abs(tipico - agora);   // agora
    else nota = 1000 + tipico - agora;                       // mais tarde hoje
    if (!melhor || nota < melhor.nota) melhor = { nota: nota, turma: t, tipico: tipico };
  });
  if (!melhor) return null;
  return {
    tipo: 'aula', turma: melhor.turma, agora: melhor.nota < 1000,
    /* Salva às 15h07 é aula das 15h: arredonda para baixo, de meia em meia hora. */
    hora: melhor.tipico === null ? '' : textoHora_(Math.floor(melhor.tipico / 30) * 30)
  };
}

/* 0 = domingo. Calculado na data escrita, sem fuso no meio. */
function diaDaSemana_(iso) {
  const p = String(iso).split('-').map(Number);
  return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
}
function somarDias_(iso, n) {
  const p = String(iso).split('-').map(Number);
  return Utilities.formatDate(new Date(Date.UTC(p[0], p[1] - 1, p[2] + n, 12)), 'UTC', 'yyyy-MM-dd');
}
function textoHora_(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return h + 'h' + (m ? String(m).padStart(2, '0') : '');
}
function ehNao_(v) {
  const s = String(v == null ? '' : v).trim().toUpperCase();
  return s === 'NAO' || s === 'NÃO';
}
