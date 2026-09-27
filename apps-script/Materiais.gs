/**
 * Materiais: o que o instituto tem, onde está e para que serve.
 *
 * ESTRUTURA FIXA, CATEGORIAS LIVRES
 * A coordenação pediu liberdade para "criar o que achar necessário".
 * Isso NÃO virou campo personalizado nem estrutura que ela desenha: esse
 * caminho explode a interface e termina numa aba que ninguém alimenta.
 * Os campos são sempre os mesmos. Categoria e local são listas que ela
 * mesma cria no cadastro, digitando, sem pedir nada a ninguém.
 *
 * Aba Materiais:
 *   A: ID | B: Item | C: Categoria | D: Finalidade | E: Quantidade |
 *   F: Estado | G: Local | H: Observacao | I: Ativo (SIM/NAO)
 *
 * Item descartado nunca é apagado: vira Ativo = NAO, como aluno.
 *
 * FORA DA V1, DE PROPÓSITO: histórico de quem pegou, foto, código de
 * barras, valor patrimonial. Se a lista simples não for alimentada nas
 * primeiras semanas, o problema é cadastro trabalhoso, não falta de
 * recurso.
 */

const ABA_MATERIAIS = 'Materiais';
const CAB_MATERIAIS = ['ID', 'Item', 'Categoria', 'Finalidade', 'Quantidade', 'Estado', 'Local', 'Observacao', 'Ativo'];
const FINALIDADES = ['Instituto', 'Bazar', 'Espetáculo', 'Ambos'];
const ESTADOS = ['Novo', 'Bom', 'Usado', 'Precisa reparo', 'Inservível'];

/* Sugestões que aparecem enquanto ela ainda não criou as próprias. */
const SUGESTAO_CATEGORIAS = ['Som e áudio', 'Figurino', 'Material de aula', 'Móveis', 'Limpeza', 'Bazar', 'Cenário'];
const SUGESTAO_LOCAIS = ['Sala de dança', 'Depósito', 'Recepção', 'Armário 1'];
const MINIMO_PARA_ESCONDER_SUGESTAO = 3;

function abaMateriais() {
  const ss = planilha();
  let aba = ss.getSheetByName(ABA_MATERIAIS);
  if (!aba) {
    aba = ss.insertSheet(ABA_MATERIAIS);
    aba.getRange(1, 1, 1, CAB_MATERIAIS.length).setValues([CAB_MATERIAIS]);
    aba.setFrozenRows(1);
  }
  return aba;
}

function lerMateriais_(incluirInativos) {
  const aba = planilha().getSheetByName(ABA_MATERIAIS);
  if (!aba || aba.getLastRow() < 2) return [];
  return aba.getRange(2, 1, aba.getLastRow() - 1, 9).getValues()
    .map(function (l, i) {
      const q = Number(l[4]);
      return {
        id: String(l[0] || '').trim(),
        item: String(l[1] || '').trim(),
        categoria: String(l[2] || '').trim() || 'Sem categoria',
        finalidade: String(l[3] || '').trim() || 'Instituto',
        quantidade: q >= 0 ? Math.floor(q) : 0,
        estado: String(l[5] || '').trim() || 'Bom',
        local: String(l[6] || '').trim(),
        obs: String(l[7] || '').trim(),
        ativo: !ehNao_(l[8]),
        linha: i + 2
      };
    })
    .filter(function (m) { return m.item && (incluirInativos || m.ativo); });
}

/* Linha cadastrada direto na planilha não tem ID. Completa ao ler, se a
   trava estiver livre — igual à agenda. */
function lerMateriaisComIds_() {
  const ms = lerMateriais_(false);
  const sem = ms.filter(function (m) { return !m.id; });
  if (!sem.length) return ms;
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(3000)) return ms.filter(function (m) { return m.id; });
  try {
    const aba = abaMateriais();
    sem.forEach(function (m) { m.id = novoId_('M'); aba.getRange(m.linha, 1).setValue(m.id); });
  } finally { trava.releaseLock(); }
  return ms;
}

function distintos_(lista, campo) {
  const vistos = {}, fora = [];
  lista.forEach(function (m) {
    const v = m[campo];
    if (v && v !== 'Sem categoria' && !vistos[chave(v)]) { vistos[chave(v)] = 1; fora.push(v); }
  });
  return fora.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
}

/* Usadas primeiro. Sugestões só enquanto ela ainda tem poucas próprias,
   e nunca uma que ela já usa com outra grafia. */
function comSugestoes_(usadas, sugestoes) {
  const tem = {};
  usadas.forEach(function (u) { tem[chave(u)] = 1; });
  return {
    usadas: usadas,
    sugestoes: usadas.length >= MINIMO_PARA_ESCONDER_SUGESTAO ? []
      : sugestoes.filter(function (s) { return !tem[chave(s)]; })
  };
}

function listarCategorias() {
  return comSugestoes_(distintos_(lerMateriais_(true), 'categoria'), SUGESTAO_CATEGORIAS);
}
function listarLocais() {
  return comSugestoes_(distintos_(lerMateriais_(true), 'local'), SUGESTAO_LOCAIS);
}

/**
 * Lista para a tela. filtros = { categoria, finalidade, estado, busca },
 * todos opcionais. A tela carrega sem filtro e filtra no celular — busca
 * letra a letra não pode esperar o servidor —, mas os filtros existem
 * aqui para quem chamar de outro lugar.
 */
function listarMateriais(filtros) {
  return doCache('mt_' + Utilities.base64EncodeWebSafe(JSON.stringify(filtros || {})).slice(0, 200), TTL_CACHE, function () { return listarMateriais_(filtros); });
}
function listarMateriais_(filtros) {
  const f = filtros || {};
  const todos = lerMateriaisComIds_();
  const b = chave(f.busca);
  const itens = todos.filter(function (m) {
    if (f.categoria && m.categoria !== f.categoria) return false;
    if (f.finalidade && m.finalidade !== f.finalidade) return false;
    if (f.estado && m.estado !== f.estado) return false;
    if (b && chave(m.item).indexOf(b) === -1) return false;
    return true;
  }).map(function (m) {
    return { id: m.id, item: m.item, categoria: m.categoria, finalidade: m.finalidade,
             quantidade: m.quantidade, estado: m.estado, local: m.local, obs: m.obs };
  }).sort(function (x, y) {
    return x.categoria.localeCompare(y.categoria, 'pt-BR') || x.item.localeCompare(y.item, 'pt-BR');
  });
  const inclusiveInativos = lerMateriais_(true);
  return {
    itens: itens,
    categorias: comSugestoes_(distintos_(inclusiveInativos, 'categoria'), SUGESTAO_CATEGORIAS),
    locais: comSugestoes_(distintos_(inclusiveInativos, 'local'), SUGESTAO_LOCAIS),
    finalidades: FINALIDADES, estados: ESTADOS
  };
}

function normalizarMaterial_(d, base) {
  const b = base || {};
  function pega(k) { return d[k] !== undefined ? d[k] : b[k]; }
  const item = textoSeguro_(pega('item'), 120);
  if (item.replace(/^'/, '').length < 2) throw new Error('Escreva o nome do item.');
  const q = Number(pega('quantidade'));
  if (!(q >= 0) || Math.floor(q) !== q) throw new Error('A quantidade precisa ser um número inteiro.');
  if (q > 99999) throw new Error('Quantidade alta demais. Confira se digitou certo.');
  const fin = String(pega('finalidade') || '').trim();
  const est = String(pega('estado') || '').trim();
  const cat = textoSeguro_(pega('categoria'), 60);
  return {
    item: item,
    categoria: cat === 'Sem categoria' ? '' : cat,
    finalidade: FINALIDADES.indexOf(fin) !== -1 ? fin : 'Instituto',
    quantidade: q,
    estado: ESTADOS.indexOf(est) !== -1 ? est : 'Bom',
    local: textoSeguro_(pega('local'), 60),
    obs: textoSeguro_(pega('obs'), 500)
  };
}

function linhaMaterial_(id, m, ativo) {
  return [id, m.item, m.categoria, m.finalidade, m.quantidade, m.estado, m.local, m.obs, ativo ? 'SIM' : 'NAO'];
}

function acharMaterial_(id) {
  const alvo = String(id || '').trim();
  const m = alvo && lerMateriais_(true).filter(function (x) { return x.id === alvo; })[0];
  if (!m) throw new Error('Esse item não existe mais. Alguém pode ter mexido na planilha.');
  return m;
}

function criarMaterial(pin, dados) {
  exigirPin(pin);
  const m = normalizarMaterial_(dados || {});
  return comTrava(function () {
    const aba = abaMateriais();
    const id = novoId_('M');
    const r = aba.getLastRow() + 1;
    garantirLinhas_(aba, r);
    aba.getRange(r, 1, 1, 9).setValues([linhaMaterial_(id, m, true)]);
    return { ok: true, id: id };
  });
}

function editarMaterial(pin, id, dados) {
  exigirPin(pin);
  return comTrava(function () {
    const atual = acharMaterial_(id);
    const m = normalizarMaterial_(dados || {}, atual);
    abaMateriais().getRange(atual.linha, 1, 1, 9).setValues([linhaMaterial_(atual.id, m, atual.ativo)]);
    return { ok: true, id: atual.id };
  });
}

/* Os botões de mais e menos. delta vem somado do celular: cinco toques
   rápidos viram uma escrita só. */
function ajustarQuantidade(pin, id, delta) {
  exigirPin(pin);
  const d = Math.round(Number(delta));
  if (!isFinite(d) || Math.abs(d) > 9999) throw new Error('Ajuste inválido.');
  return comTrava(function () {
    const m = acharMaterial_(id);
    const q = Math.max(0, m.quantidade + d);
    abaMateriais().getRange(m.linha, 5).setValue(q);
    return { ok: true, quantidade: q };
  });
}

/* Descartado. Sai da lista, a linha fica na planilha. */
function inativarMaterial(pin, id) {
  exigirPin(pin);
  return comTrava(function () {
    const m = acharMaterial_(id);
    abaMateriais().getRange(m.linha, 9).setValue('NAO');
    return { ok: true };
  });
}

/**
 * Renomeia uma categoria ou um local em todos os itens de uma vez.
 * É o "editar" das listas livres: corrigir "Som" para "Som e áudio"
 * sem abrir item por item.
 */
function renomearNaLista(pin, campo, de, para) {
  exigirPin(pin);
  const col = campo === 'categoria' ? 3 : campo === 'local' ? 7 : 0;
  if (!col) throw new Error('Lista desconhecida.');
  const novo = textoSeguro_(para, 60);
  if (novo.replace(/^'/, '').length < 2) throw new Error('Escreva o nome novo com pelo menos 2 letras.');
  const velho = String(de || '').trim();
  return comTrava(function () {
    const aba = abaMateriais();
    if (aba.getLastRow() < 2) return { ok: true, mudou: 0 };
    const faixa = aba.getRange(2, col, aba.getLastRow() - 1, 1);
    const vals = faixa.getValues();
    let mudou = 0;
    vals.forEach(function (l) {
      if (String(l[0] || '').trim() === velho) { l[0] = novo; mudou++; }
    });
    if (mudou) faixa.setValues(vals);
    return { ok: true, mudou: mudou };
  });
}
