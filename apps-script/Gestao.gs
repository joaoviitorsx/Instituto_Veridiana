/**
 * Área da equipe: PIN, turmas, alunos e professores.
 */

const ABA_TURMAS = 'Turmas';

function exigirPin(pin){
  const certo = PropertiesService.getScriptProperties().getProperty('PIN_ADMIN');
  if (!certo) throw new Error('Ainda não existe código. Abra a planilha no computador, menu Veridiana, "Definir código da gestão".');
  if (String(pin) !== String(certo)) throw new Error('Código errado. Tente de novo.');
}

/** Rode uma vez, na mão, no editor de script. */
function definirPin(pin){
  PropertiesService.getScriptProperties().setProperty('PIN_ADMIN', String(pin));
}

/* ─── aba Turmas ─── */
function abaTurmas(){
  const ss = planilha();
  let aba = ss.getSheetByName(ABA_TURMAS);
  if (!aba){
    aba = ss.insertSheet(ABA_TURMAS);
    aba.appendRow(['Turma', 'Ativa']);
    aba.setFrozenRows(1);
    // semeia com o que já existe na aba Alunos, para não perder nada
    const vistas = [];
    const abaAl = ss.getSheetByName(ABA_ALUNOS);
    if (abaAl){
      abaAl.getDataRange().getValues().slice(1).forEach(function (l){
        const t = String(l[0] || '').trim();
        if (t && vistas.indexOf(t) === -1) vistas.push(t);
      });
    }
    if (vistas.length){
      aba.getRange(2, 1, vistas.length, 2)
         .setValues(vistas.sort().map(function (t){ return [t, 'SIM']; }));
    }
  }
  return aba;
}

function turmasRegistradas(){
  const aba = abaTurmas();
  if (aba.getLastRow() < 2) return [];
  const cols = Math.min(3, aba.getMaxColumns());
  return aba.getRange(2, 1, aba.getLastRow() - 1, cols).getValues()
    .map(function (l, i){
      const min = Number(l[2]);
      return { nome: String(l[0] || '').trim(),
               ativa: String(l[1] || 'SIM').trim().toUpperCase() !== 'NAO',
               /* Duração da aula. Sem ela não existe carga horária no
                  certificado, então 60 min é o palpite padrão. */
               minutos: (min > 0 && min <= 480) ? min : 60,
               linha: i + 2 };
    })
    .filter(function (t){ return t.nome; });
}

/** Cria a coluna C (Minutos por aula) se ainda não existir. */
function garantirColunaTurmas_(){
  const aba = abaTurmas();
  if (aba.getMaxColumns() < 3) aba.insertColumnsAfter(aba.getMaxColumns(), 3 - aba.getMaxColumns());
  if (String(aba.getRange(1, 3).getValue() || '').trim() === ''){
    aba.getRange(1, 3).setValue('Minutos por aula');
  }
  return aba;
}

function contarAlunos(){
  const aba = planilha().getSheetByName(ABA_ALUNOS);
  const mapa = {};
  if (!aba || aba.getLastRow() < 2) return mapa;
  aba.getRange(2, 1, aba.getLastRow() - 1, 3).getValues().forEach(function (l){
    const t = String(l[0] || '').trim();
    const nome = String(l[1] || '').trim();
    if (!t || !nome) return;
    const ativo = String(l[2] || 'SIM').trim().toUpperCase() !== 'NAO' &&
                  String(l[2] || 'SIM').trim().toUpperCase() !== 'NÃO';
    if (!mapa[t]) mapa[t] = { ativos:0, inativos:0 };
    if (ativo) mapa[t].ativos++; else mapa[t].inativos++;
  });
  return mapa;
}

function entrarNaGestao(pin){
  exigirPin(pin);
  const contas = contarAlunos();
  let ativos = 0, inativos = 0;
  Object.keys(contas).forEach(function (t){ ativos += contas[t].ativos; inativos += contas[t].inativos; });
  return {
    ok: true,
    turmas: turmasRegistradas().filter(function (t){ return t.ativa; }).length,
    alunosAtivos: ativos,
    alunosInativos: inativos,
    professores: lerProfessores().length
  };
}

function listarTurmasCompleto(pin){
  exigirPin(pin);
  return doCache('tc', TTL_CACHE, function () { return listarTurmasCompleto_(pin); });
}
function listarTurmasCompleto_(pin){
  const contas = contarAlunos();
  return turmasRegistradas()
    .filter(function (t){ return t.ativa; })
    .map(function (t){
      const c = contas[t.nome] || { ativos:0, inativos:0 };
      return { nome:t.nome, ativos:c.ativos, inativos:c.inativos };
    })
    .sort(function (a, b){ return a.nome.localeCompare(b.nome, 'pt-BR'); });
}

function criarTurma(pin, nome){
  exigirPin(pin);
  const n = exigirNome(nome, 'da turma');
  return comTrava(function (){
    const jas = turmasRegistradas();
    const igual = jas.filter(function (t){ return chave(t.nome) === chave(n); })[0];
    if (igual && igual.ativa) throw new Error('Já existe uma turma com esse nome.');
    if (igual){ abaTurmas().getRange(igual.linha, 2).setValue('SIM'); return { ok:true, nome:igual.nome }; }
    abaTurmas().appendRow([n, 'SIM']);
    return { ok:true, nome:n };
  });
}

function renomearTurma(pin, nomeAtual, nomeNovo){
  exigirPin(pin);
  const novo = exigirNome(nomeNovo, 'da turma');
  const atual = String(nomeAtual || '').trim();
  if (!atual) throw new Error('Turma não informada.');
  if (chave(atual) === chave(novo) && atual === novo) return { ok:true, nome:novo };

  return comTrava(function (){
    const jas = turmasRegistradas();
    if (jas.some(function (t){ return chave(t.nome) === chave(novo) && t.nome !== atual; }))
      throw new Error('Já existe uma turma com esse nome.');

    const alvo = jas.filter(function (t){ return t.nome === atual; })[0];
    if (!alvo) throw new Error('Turma não encontrada.');
    abaTurmas().getRange(alvo.linha, 1).setValue(novo);

    // aba Alunos: coluna A, uma escrita só
    const abaAl = planilha().getSheetByName(ABA_ALUNOS);
    if (abaAl && abaAl.getLastRow() > 1){
      const faixa = abaAl.getRange(2, 1, abaAl.getLastRow() - 1, 1);
      const vals = faixa.getValues();
      let mexeu = false;
      vals.forEach(function (l, i){
        if (String(l[0] || '').trim() === atual){ vals[i][0] = novo; mexeu = true; }
      });
      if (mexeu) faixa.setValues(vals);
    }

    // aba Chamadas: coluna C, uma escrita só. Sem isso o histórico se
    // desliga da turma e a Tabela Dinâmica passa a mostrar duas turmas.
    const abaCh = abaChamadas();
    if (abaCh.getLastRow() > 1){
      const faixa = abaCh.getRange(2, 3, abaCh.getLastRow() - 1, 1);
      const vals = faixa.getValues();
      let mexeu = false;
      vals.forEach(function (l, i){
        if (String(l[0] || '').trim() === atual){ vals[i][0] = novo; mexeu = true; }
      });
      if (mexeu) faixa.setValues(vals);
    }
    return { ok:true, nome:novo };
  });
}

function arquivarTurma(pin, nome){
  exigirPin(pin);
  return comTrava(function (){
    const c = contarAlunos()[nome];
    if (c && c.ativos > 0) throw new Error('Mova ou desative os alunos antes de arquivar.');
    const alvo = turmasRegistradas().filter(function (t){ return t.nome === nome; })[0];
    if (!alvo) throw new Error('Turma não encontrada.');
    abaTurmas().getRange(alvo.linha, 2).setValue('NAO');
    return { ok:true };
  });
}

/* ─── alunos ─── */
/* Lê 6 colunas quando existem. Planilha antiga com 3 colunas continua
   funcionando: o que falta vem vazio. */
function lerAlunos_(){
  const aba = planilha().getSheetByName(ABA_ALUNOS);
  if (!aba || aba.getLastRow() < 2) return [];
  const cols = Math.min(6, aba.getMaxColumns());
  return aba.getRange(2, 1, aba.getLastRow() - 1, cols).getValues()
    .map(function (l, i){
      const at = String(l[2] || 'SIM').trim().toUpperCase();
      return { turma:String(l[0] || '').trim(), nome:String(l[1] || '').trim(),
               ativo: at !== 'NAO' && at !== 'NÃO',
               nascimento: textoData(l[3]),
               responsavel: String(l[4] || '').trim(),
               telefone: String(l[5] || '').trim(),
               linha:i + 2 };
    })
    .filter(function (a){ return a.nome; });
}

/* Cria as colunas D, E e F se ainda não existirem. Roda sozinha antes de
   qualquer escrita, então ninguém precisa mexer na planilha na mão. */
function garantirColunasAlunos_(){
  const aba = planilha().getSheetByName(ABA_ALUNOS);
  if (!aba) throw new Error('A aba "Alunos" não foi encontrada na planilha.');
  if (aba.getMaxColumns() < 6) aba.insertColumnsAfter(aba.getMaxColumns(), 6 - aba.getMaxColumns());
  const cab = aba.getRange(1, 1, 1, 6).getValues()[0];
  const querido = ['Turma', 'Aluno', 'Ativo', 'Nascimento', 'Responsável', 'Telefone'];
  let mexeu = false;
  for (let i = 3; i < 6; i++) {
    if (String(cab[i] || '').trim() === '') { cab[i] = querido[i]; mexeu = true; }
  }
  if (mexeu) aba.getRange(1, 1, 1, 6).setValues([cab]);
  return aba;
}

/** Acha um aluno sem ambiguidade. A turma some da conta quando não vem. */
function acharAluno_(nome, turma){
  const alvo = chave(nome);
  let achados = lerAlunos_().filter(function (a){ return chave(a.nome) === alvo; });
  if (turma) achados = achados.filter(function (a){ return a.turma === turma; });
  if (!achados.length) throw new Error('Aluno não encontrado.');
  if (achados.length > 1)
    throw new Error('Existe mais de um "' + nome + '". Abra pela turma para não mexer no aluno errado.');
  return achados[0];
}

function listarAlunos(pin, turma, incluirInativos){
  exigirPin(pin);
  return doCache('al_' + turma + '_' + !!incluirInativos, TTL_CACHE, function () { return listarAlunos_(pin, turma, incluirInativos); });
}
function listarAlunos_(pin, turma, incluirInativos){
  return lerAlunos_()
    .filter(function (a){
      if (turma && a.turma !== turma) return false;
      if (!incluirInativos && !a.ativo) return false;
      return true;
    })
    .map(function (a){ return { nome:a.nome, turma:a.turma, ativo:a.ativo,
        nascimento:a.nascimento, responsavel:a.responsavel, telefone:a.telefone }; })
    .sort(function (a, b){ return a.nome.localeCompare(b.nome, 'pt-BR'); });
}

function adicionarAluno(pin, turma, nome, dados){
  exigirPin(pin);
  const n = exigirNome(nome, 'do aluno');
  const t = String(turma || '').trim();
  if (!t) throw new Error('Turma não informada.');
  const d = dados || {};
  return comTrava(function (){
    const repetido = lerAlunos_().some(function (a){
      return a.turma === t && chave(a.nome) === chave(n);
    });
    if (repetido) throw new Error('Esse aluno já está nessa turma.');
    /* Reativa a linha existente em vez de criar outra. Sem isto, turma
       arquivada e depois repovoada ficava duplicada em Turmas — e como
       arquivar/renomear pegam o primeiro filter()[0], a turma nunca
       mais conseguia ser arquivada. */
    const jaTem = turmasRegistradas().filter(function (x){ return chave(x.nome) === chave(t); })[0];
    if (!jaTem) abaTurmas().appendRow([t, 'SIM']);
    else if (!jaTem.ativa) abaTurmas().getRange(jaTem.linha, 2).setValue('SIM');
    const aba = garantirColunasAlunos_();
    aba.appendRow([t, n, 'SIM',
      dataValida_(d.nascimento), String(d.responsavel || '').trim(), soDigitos_(d.telefone)]);
    return { ok:true };
  });
}

/* Edita nascimento, responsável e telefone de quem já está cadastrado. */
function atualizarAluno(pin, nome, turma, dados){
  exigirPin(pin);
  const d = dados || {};
  return comTrava(function (){
    const a = acharAluno_(nome, turma);
    const aba = garantirColunasAlunos_();
    aba.getRange(a.linha, 4, 1, 3).setValues([[
      dataValida_(d.nascimento), String(d.responsavel || '').trim(), soDigitos_(d.telefone)
    ]]);
    return { ok:true };
  });
}

/* Guarda a data como texto aaaa-mm-dd: não depende do idioma da planilha. */
function dataValida_(v){
  const s = String(v || '').trim();
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s) ? s : '';
}
function soDigitos_(v){
  return String(v || '').replace(/[^0-9]/g, '');
}

function moverAluno(pin, nome, turmaDestino, turmaOrigem){
  exigirPin(pin);
  const destino = String(turmaDestino || '').trim();
  if (!destino) throw new Error('Turma de destino não informada.');
  return comTrava(function (){
    const a = acharAluno_(nome, turmaOrigem);
    if (a.turma === destino) return { ok:true };
    const repetido = lerAlunos_().some(function (x){
      return x.turma === destino && chave(x.nome) === chave(a.nome);
    });
    if (repetido) throw new Error('Já existe um aluno com esse nome em ' + destino + '.');
    planilha().getSheetByName(ABA_ALUNOS).getRange(a.linha, 1).setValue(destino);
    return { ok:true };
  });
}

/* Nada é alterado na aba Chamadas: o histórico do aluno continua inteiro. */
function desativarAluno(pin, nome, turma){
  exigirPin(pin);
  return comTrava(function (){
    const a = acharAluno_(nome, turma);
    planilha().getSheetByName(ABA_ALUNOS).getRange(a.linha, 3).setValue('NAO');
    return { ok:true };
  });
}

function reativarAluno(pin, nome, turma){
  exigirPin(pin);
  return comTrava(function (){
    const a = acharAluno_(nome, turma);
    planilha().getSheetByName(ABA_ALUNOS).getRange(a.linha, 3).setValue('SIM');
    return { ok:true };
  });
}

/* ─── professores ─── */
function lerProfessores(){
  const aba = planilha().getSheetByName(ABA_PROFESSORES);
  if (!aba || aba.getLastRow() < 2) return [];
  return aba.getRange(2, 1, aba.getLastRow() - 1, 1).getValues()
    .map(function (l, i){ return { nome:String(l[0] || '').trim(), linha:i + 2 }; })
    .filter(function (p){ return p.nome; });
}

function listarProfessores(pin){
  exigirPin(pin);
  return doCache('pf', TTL_CACHE, function () { return listarProfessores_(pin); });
}
function listarProfessores_(pin){
  return lerProfessores()
    .map(function (p){ return p.nome; })
    .sort(function (a, b){ return a.localeCompare(b, 'pt-BR'); });
}

function adicionarProfessor(pin, nome){
  exigirPin(pin);
  const n = exigirNome(nome, 'do professor');
  return comTrava(function (){
    if (lerProfessores().some(function (p){ return chave(p.nome) === chave(n); }))
      throw new Error('Esse professor já está na equipe.');
    let aba = planilha().getSheetByName(ABA_PROFESSORES);
    if (!aba){
      aba = planilha().insertSheet(ABA_PROFESSORES);
      aba.appendRow(['Professor']);
      aba.setFrozenRows(1);
    }
    aba.appendRow([n]);
    return { ok:true };
  });
}

/* O nome sai da escolha na chamada, mas continua nas chamadas já salvas. */
function removerProfessor(pin, nome){
  exigirPin(pin);
  return comTrava(function (){
    const p = lerProfessores().filter(function (x){ return chave(x.nome) === chave(nome); })[0];
    if (!p) throw new Error('Professor não encontrado.');
    planilha().getSheetByName(ABA_PROFESSORES).deleteRow(p.linha);
    return { ok:true };
  });
}
