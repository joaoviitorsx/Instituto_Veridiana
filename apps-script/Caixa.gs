/**
 * Fluxo de caixa.
 *
 * Simples de propósito: a Vera lança do celular, entre uma aula e outra.
 * Tipo, valor, categoria, salvar. O resto é opcional.
 *
 * POR QUE EXISTE "FONTE"
 * O instituto vive de edital, e prestação de contas exige mostrar de
 * qual bolso saiu cada real. Dinheiro de edital misturado com doação
 * num pote só é o que faz a prestação ser recusada. A fonte separa
 * sem obrigar a Vera a manter duas planilhas.
 *
 * O COMPROVANTE É O QUE VALE
 * Despesa sem nota não entra na prestação de contas. Por isso dá para
 * fotografar na hora — a foto é reduzida no celular antes de subir,
 * senão 4 MB em 4G instável não chegam nunca.
 */

const ABA_CAIXA = 'Caixa';
const JANELA_CAIXA = 5000;   // linhas recentes lidas

const CAT_ENTRADA = ['Doação', 'Bazar', 'Edital', 'Rifa', 'Evento', 'Outro'];
const CAT_SAIDA   = ['Aluguel', 'Água e luz', 'Internet', 'Figurino', 'Material de dança',
                     'Transporte', 'Lanche', 'Manutenção', 'Outro'];

function abaCaixa() {
  const ss = planilha();
  let aba = ss.getSheetByName(ABA_CAIXA);
  if (!aba) {
    aba = ss.insertSheet(ABA_CAIXA);
    aba.appendRow(['Registro', 'Data', 'Tipo', 'Valor', 'Categoria',
                   'Descrição', 'Fonte', 'Comprovante', 'Quem registrou']);
    aba.setFrozenRows(1);
  }
  return aba;
}

/** Aceita 1.234,56 / 1234.56 / 1234 / R$ 50,00 */
function valorNumero_(v) {
  if (typeof v === 'number') return v;
  let s = String(v == null ? '' : v).replace(/[^0-9,.-]/g, '').trim();
  if (!s) return NaN;
  const virgula = s.lastIndexOf(','), ponto = s.lastIndexOf('.');
  if (virgula > ponto) s = s.replace(/\./g, '').replace(',', '.');   // 1.234,56
  else s = s.replace(/,/g, '');                                      // 1,234.56
  return parseFloat(s);
}

function lerCaixa_() {
  const aba = abaCaixa();
  const ultima = aba.getLastRow();
  if (ultima < 2) return [];
  const inicio = Math.max(2, ultima - JANELA_CAIXA + 1);
  return aba.getRange(inicio, 1, ultima - inicio + 1, 9).getValues()
    .map(function (l, i) {
      return {
        registro: String(l[0] || ''),
        data: textoData(l[1]),
        tipo: String(l[2] || '').trim(),
        valor: Number(l[3]) || 0,
        categoria: String(l[4] || '').trim(),
        descricao: String(l[5] || '').trim(),
        fonte: String(l[6] || '').trim(),
        comprovante: String(l[7] || '').trim(),
        quem: String(l[8] || '').trim(),
        linha: inicio + i
      };
    })
    .filter(function (r) { return r.data && r.tipo; });
}

function pastaComprovantes_() {
  const nome = 'Comprovantes — ' + CERT_INSTITUTO;
  const achadas = DriveApp.getFoldersByName(nome);
  return achadas.hasNext() ? achadas.next() : DriveApp.createFolder(nome);
}

/**
 * dados = { tipo, valor, data, categoria, descricao, fonte, quem,
 *           foto: 'data:image/jpeg;base64,...' }
 * O comprovante NÃO é liberado por link: é documento financeiro e fica
 * restrito a quem já tem acesso ao Drive do instituto.
 */
function lancarCaixa(pin, dados) {
  exigirPin(pin);
  const d = dados || {};
  const tipo = d.tipo === 'Entrada' ? 'Entrada' : (d.tipo === 'Saída' ? 'Saída' : '');
  if (!tipo) throw new Error('Diga se é entrada ou saída.');

  const valor = valorNumero_(d.valor);
  if (!(valor > 0)) throw new Error('Escreva um valor maior que zero.');
  if (valor > 1000000) throw new Error('Valor alto demais. Confira se digitou certo.');

  const data = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(d.data || '')) ? d.data : hoje();
  const categoria = String(d.categoria || '').trim() || 'Outro';

  return comTravaCaixa_(function () {
    let urlFoto = '';
    if (d.foto && String(d.foto).indexOf('base64,') !== -1) {
      try {
        const partes = String(d.foto).split('base64,');
        const tipoImg = (partes[0].match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
        const ext = tipoImg.indexOf('png') !== -1 ? 'png' : 'jpg';
        const blob = Utilities.newBlob(Utilities.base64Decode(partes[1]), tipoImg,
          'comprovante ' + data + ' ' + categoria + '.' + ext);
        urlFoto = pastaComprovantes_().createFile(blob).getUrl();
      } catch (e) {
        /* Foto que falha não pode derrubar o lançamento: o dinheiro
           tem que entrar na planilha mesmo sem o comprovante. */
        urlFoto = '';
      }
    }

    abaCaixa().appendRow([
      new Date(), data, tipo, valor, categoria,
      String(d.descricao || '').trim(), String(d.fonte || '').trim(),
      urlFoto, String(d.quem || '').trim()
    ]);
    invalidarCache();
    return { ok: true, comFoto: !!urlFoto, pediuFoto: !!d.foto };
  });
}

/* Trava própria: lançamento de dinheiro não pode disputar com chamada. */
function comTravaCaixa_(fn) {
  const trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try { return fn(); } finally { trava.releaseLock(); }
}

function mesesCaixa(pin) {
  exigirPin(pin);
  const vistos = {};
  lerCaixa_().forEach(function (r) {
    if (r.data.length >= 7) vistos[r.data.slice(0, 7)] = 1;
  });
  const ms = Object.keys(vistos).sort().reverse();
  const agora = hoje().slice(0, 7);
  if (ms.indexOf(agora) === -1) ms.unshift(agora);
  return ms.slice(0, 24);
}

/** Lançamentos do mês, do mais novo para o mais velho, com o saldo. */
function listarCaixa(pin, mes) {
  exigirPin(pin);
  if (!/^[0-9]{4}-[0-9]{2}$/.test(String(mes || ''))) throw new Error('Mês inválido.');

  const todos = lerCaixa_();
  const doMes = todos.filter(function (r) { return r.data.slice(0, 7) === mes; });

  let entrou = 0, saiu = 0;
  doMes.forEach(function (r) {
    if (r.tipo === 'Entrada') entrou += r.valor; else saiu += r.valor;
  });

  /* Saldo acumulado: tudo que já entrou menos tudo que já saiu, até o
     fim deste mês. É o número que responde "tem quanto em caixa?". */
  let acumulado = 0;
  todos.forEach(function (r) {
    if (r.data.slice(0, 7) > mes) return;
    acumulado += (r.tipo === 'Entrada' ? r.valor : -r.valor);
  });

  doMes.sort(function (a, b) {
    if (a.data !== b.data) return a.data < b.data ? 1 : -1;
    return a.linha < b.linha ? 1 : -1;
  });

  return {
    mes: mes,
    lancamentos: doMes.map(function (r) {
      return { data: r.data, tipo: r.tipo, valor: r.valor, categoria: r.categoria,
               descricao: r.descricao, fonte: r.fonte, comprovante: r.comprovante,
               quem: r.quem, linha: r.linha };
    }),
    entrou: entrou, saiu: saiu, doMes: entrou - saiu, acumulado: acumulado,
    categorias: { Entrada: CAT_ENTRADA, 'Saída': CAT_SAIDA },
    fontes: fontesUsadas_(todos)
  };
}

function fontesUsadas_(todos) {
  const vistas = {};
  (todos || lerCaixa_()).forEach(function (r) { if (r.fonte) vistas[r.fonte] = 1; });
  return Object.keys(vistas).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
}

/** Apagar é para corrigir digitação. Só pela linha exata. */
function apagarLancamento(pin, linha, valorConfere) {
  exigirPin(pin);
  const n = Number(linha);
  if (!(n > 1)) throw new Error('Lançamento não encontrado.');
  return comTravaCaixa_(function () {
    const aba = abaCaixa();
    if (n > aba.getLastRow()) throw new Error('Lançamento não encontrado.');
    const atual = Number(aba.getRange(n, 4).getValue()) || 0;
    /* Confere o valor antes de apagar: se alguém lançou nesse meio-tempo
       as linhas andaram, e apagar a errada é perder dinheiro do registro. */
    if (valorConfere !== undefined && Math.abs(atual - Number(valorConfere)) > 0.005)
      throw new Error('A lista mudou desde que você abriu. Recarregue e tente de novo.');
    aba.deleteRow(n);
    invalidarCache();
    return { ok: true };
  });
}

/** Totais por categoria e por fonte, para colar na prestação de contas. */
function resumoCaixa(pin, inicio, fim) {
  exigirPin(pin);
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(inicio || '')) ||
      !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(fim || '')))
    throw new Error('Escolha as duas datas do período.');
  if (inicio > fim) throw new Error('A data de início vem depois da data de fim.');

  const doPeriodo = lerCaixa_().filter(function (r) {
    return r.data >= inicio && r.data <= fim;
  });

  const porCat = { Entrada: {}, 'Saída': {} }, porFonte = {};
  let entrou = 0, saiu = 0, semComprovante = 0;

  doPeriodo.forEach(function (r) {
    const lado = r.tipo === 'Entrada' ? 'Entrada' : 'Saída';
    porCat[lado][r.categoria] = (porCat[lado][r.categoria] || 0) + r.valor;
    const f = r.fonte || 'Sem fonte informada';
    if (!porFonte[f]) porFonte[f] = { fonte: f, entrou: 0, saiu: 0 };
    if (lado === 'Entrada') { porFonte[f].entrou += r.valor; entrou += r.valor; }
    else {
      porFonte[f].saiu += r.valor; saiu += r.valor;
      if (!r.comprovante) semComprovante++;
    }
  });

  function ordena(mapa) {
    return Object.keys(mapa).map(function (k) { return { nome: k, valor: mapa[k] }; })
      .sort(function (a, b) { return b.valor - a.valor; });
  }

  return {
    inicio: inicio, fim: fim, entrou: entrou, saiu: saiu, saldo: entrou - saiu,
    lancamentos: doPeriodo.length, semComprovante: semComprovante,
    entradas: ordena(porCat.Entrada), saidas: ordena(porCat['Saída']),
    fontes: Object.keys(porFonte).map(function (k) { return porFonte[k]; })
      .sort(function (a, b) { return (b.entrou + b.saiu) - (a.entrou + a.saiu); })
  };
}
