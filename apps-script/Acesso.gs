/**
 * Acesso: e-mail e senha de cada pessoa da equipe, sessão e papéis.
 *
 * Quem entra está na aba Professores, com e-mail e papel:
 *   Professor -> chamada, agenda e materiais (o que antes era aberto)
 *   Gestão    -> tudo (o que antes pedia o PIN)
 *
 * A senha NUNCA fica na planilha. Mora nas Script Properties, só como
 * hash com sal: quem tem acesso de edição à planilha vê e-mail e papel,
 * não senha. Senha temporária nasce no cadastro e é trocada no primeiro
 * acesso.
 *
 * A sessão é um token aleatório que o cliente manda em toda chamada ao
 * servidor. Guardamos o hash do token, não o token: quem lê as
 * propriedades não consegue se passar por ninguém.
 */

const PAPEL_GESTAO = 'Gestão';
const PAPEL_PROFESSOR = 'Professor';
const PAPEIS = [PAPEL_PROFESSOR, PAPEL_GESTAO];

const DIAS_SESSAO = 30;
const MAX_ERROS = 5;            // senhas erradas seguidas por e-mail
const BLOQUEIO_SEG = 900;       // 15 min de espera depois disso
const VOLTAS_HASH = 200;
const SENHA_MIN = 6;

/* Mensagem com prefixo fixo: o cliente reconhece e volta para o login. */
const SEM_SESSAO = 'SESSAO: Sua sessão terminou. Entre de novo.';

/* ─── propriedades ─── */
function props_() { return PropertiesService.getScriptProperties(); }
function lerJson_(k) {
  const v = props_().getProperty(k);
  if (!v) return null;
  try { return JSON.parse(v); } catch (e) { return null; }
}

function normEmail_(e) { return String(e || '').trim().toLowerCase(); }
function emailValido_(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function normPapel_(p) { return chave(p) === chave(PAPEL_GESTAO) ? PAPEL_GESTAO : PAPEL_PROFESSOR; }

/* ─── hash ─── */
function b64_(bytes) { return Utilities.base64EncodeWebSafe(bytes); }
function hashSenha_(senha, sal) {
  let h = b64_(Utilities.computeHmacSha256Signature(String(senha), sal));
  for (let i = 1; i < VOLTAS_HASH; i++) {
    h = b64_(Utilities.computeHmacSha256Signature(h + String(senha), sal));
  }
  return h;
}
function hashToken_(t) {
  return b64_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(t)));
}
function aleatorio_() { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); }

/* Sem 0/O, 1/l/i: vai ser ditada no WhatsApp e digitada no celular. */
function senhaTemporaria_() {
  const alfa = 'abcdefghjkmnpqrstuvwxyz23456789';
  const hex = aleatorio_();
  let s = '';
  for (let i = 0; i < 8; i++) s += alfa.charAt(parseInt(hex.substr(i * 4, 4), 16) % alfa.length);
  return s;
}

/* ─── credencial ─── */
function credKey_(email) { return 'CRED_' + email; }
function gravarSenha_(email, senha, temporaria) {
  const sal = aleatorio_().slice(0, 32);
  props_().setProperty(credKey_(email), JSON.stringify({
    h: hashSenha_(senha, sal), s: sal, tmp: !!temporaria, em: Date.now()
  }));
}
function apagarCredencial_(email) { props_().deleteProperty(credKey_(email)); }
function temSenhaDefinitiva_(email) {
  const c = lerJson_(credKey_(email));
  return !!(c && !c.tmp);
}

/* ─── sessão ─── */
function criarSessao_(u, soTroca) {
  const token = aleatorio_();
  props_().setProperty('SES_' + hashToken_(token), JSON.stringify({
    e: u.email, n: u.nome, p: u.papel, x: Date.now() + DIAS_SESSAO * 86400000, t: !!soTroca
  }));
  return token;
}
function lerSessao_(token) {
  if (!token || typeof token !== 'string' || token.length < 32) return null;
  const k = 'SES_' + hashToken_(token);
  const s = lerJson_(k);
  if (!s) return null;
  if (s.x < Date.now()) { props_().deleteProperty(k); return null; }
  return s;
}
/* Tira do ar as sessões de uma pessoa (senha trocada, papel mudou,
   saiu da equipe) e, de quebra, as vencidas de todo mundo. */
function derrubarSessoes_(email) {
  const todas = props_().getProperties(), agora = Date.now();
  Object.keys(todas).forEach(function (k) {
    if (k.indexOf('SES_') !== 0) return;
    let s = null;
    try { s = JSON.parse(todas[k]); } catch (e) {}
    if (!s || s.x < agora || (email && s.e === email)) props_().deleteProperty(k);
  });
}

/**
 * Porta de toda função chamada pelo app. Devolve {email, nome, papel}.
 * Sessão que só serve para trocar a senha temporária não passa daqui.
 */
function exigirSessao(token) {
  const s = lerSessao_(token);
  if (!s || s.t) throw new Error(SEM_SESSAO);
  return { email: s.e, nome: s.n, papel: s.p };
}
function exigirGestao(token) {
  const u = exigirSessao(token);
  if (u.papel !== PAPEL_GESTAO) throw new Error('Só a gestão pode fazer isso.');
  return u;
}

/* ─── tentativas ─── */
function errosKey_(email) { return 'ERR_' + hashToken_(email); }
function bloqueado_(email) {
  return Number(CacheService.getScriptCache().get(errosKey_(email)) || 0) >= MAX_ERROS;
}
function contarErro_(email) {
  const c = CacheService.getScriptCache(), k = errosKey_(email);
  c.put(k, String(Number(c.get(k) || 0) + 1), BLOQUEIO_SEG);
}

/* ══════════════ chamadas do app ══════════════ */

/** Login. Não recebe sessão: é daqui que ela sai. */
function entrar(email, senha) {
  const e = normEmail_(email);
  const erro = 'E-mail ou senha não conferem.';
  if (!e || !senha) throw new Error('Preencha e-mail e senha.');
  if (bloqueado_(e)) throw new Error('Muitas tentativas erradas. Espere 15 minutos e tente de novo.');

  const u = acharPessoaPorEmail_(e);
  const c = u && lerJson_(credKey_(e));
  if (!u || !c || hashSenha_(senha, c.s) !== c.h) { contarErro_(e); throw new Error(erro); }

  CacheService.getScriptCache().remove(errosKey_(e));
  try { derrubarSessoes_(null); } catch (x) {}   // limpeza das vencidas
  const trocar = !!c.tmp;
  return {
    token: criarSessao_(u, trocar),
    trocar: trocar,
    usuario: { nome: u.nome, email: u.email, papel: u.papel }
  };
}

/** Quem é o dono deste token. O app chama ao abrir. */
function quemSou(token) {
  return exigirSessao(token);
}

/**
 * Troca de senha. Serve para a temporária do primeiro acesso (sessão
 * marcada só-troca) e para quem quiser trocar depois.
 */
function trocarSenha(token, atual, nova) {
  const s = lerSessao_(token);
  if (!s) throw new Error(SEM_SESSAO);
  const n = String(nova || '');
  if (n.length < SENHA_MIN) throw new Error('A senha nova precisa ter pelo menos ' + SENHA_MIN + ' caracteres.');
  const c = lerJson_(credKey_(s.e));
  if (!c || hashSenha_(atual, c.s) !== c.h) throw new Error('A senha atual não confere.');
  if (n === String(atual)) throw new Error('A senha nova precisa ser diferente da atual.');

  const u = acharPessoaPorEmail_(s.e);
  if (!u) throw new Error(SEM_SESSAO);
  gravarSenha_(s.e, n, false);
  derrubarSessoes_(s.e);
  return { token: criarSessao_(u, false), usuario: { nome: u.nome, email: u.email, papel: u.papel } };
}

function sair(token) {
  if (token && typeof token === 'string') props_().deleteProperty('SES_' + hashToken_(token));
  return { ok: true };
}

/* ══════════════ gestão da equipe ══════════════ */

/** Lista para a tela Professores da gestão: e-mail, papel e situação. */
function listarEquipe(sessao) {
  exigirGestao(sessao);
  return lerProfessores().map(function (p) {
    return {
      nome: p.nome, email: p.email, papel: p.papel,
      situacao: !p.email ? 'sem-acesso' : temSenhaDefinitiva_(p.email) ? 'ativo' : 'pendente'
    };
  }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
}

/**
 * Liga (ou troca) o e-mail e o papel de alguém da equipe e gera uma
 * senha temporária. Devolve a senha UMA vez: ela não fica guardada em
 * texto em lugar nenhum.
 */
function definirAcesso(sessao, nome, email, papel) {
  const quem = exigirGestao(sessao);
  const e = normEmail_(email);
  if (!emailValido_(e)) throw new Error('Esse e-mail não parece certo.');
  const pap = normPapel_(papel);
  return comTrava(function () {
    const p = lerProfessores().filter(function (x) { return chave(x.nome) === chave(nome); })[0];
    if (!p) throw new Error('Professor não encontrado.');
    const outro = lerProfessores().filter(function (x) { return x.email === e && x.linha !== p.linha; })[0];
    if (outro) throw new Error('Esse e-mail já é de ' + outro.nome + '.');
    /* Senha nova da própria conta derrubaria a sessão com a senha
       ainda na tela. Para si mesmo, o caminho é "Trocar senha". */
    if (p.email && p.email === quem.email)
      throw new Error('Para a sua própria conta, use "Trocar senha" na tela inicial.');

    const aba = planilha().getSheetByName(ABA_PROFESSORES);
    aba.getRange(p.linha, 2, 1, 2).setValues([[e, pap]]);
    if (p.email && p.email !== e) { apagarCredencial_(p.email); derrubarSessoes_(p.email); }
    const senha = senhaTemporaria_();
    gravarSenha_(e, senha, true);
    derrubarSessoes_(e);
    return { ok: true, nome: p.nome, email: e, papel: pap, senha: senha };
  });
}

/** Muda só o papel, sem mexer na senha. */
function mudarPapel(sessao, nome, papel) {
  const quem = exigirGestao(sessao);
  const pap = normPapel_(papel);
  return comTrava(function () {
    const p = lerProfessores().filter(function (x) { return chave(x.nome) === chave(nome); })[0];
    if (!p) throw new Error('Professor não encontrado.');
    if (p.email && p.email === quem.email && pap !== PAPEL_GESTAO)
      throw new Error('Você não pode tirar o seu próprio acesso de gestão.');
    planilha().getSheetByName(ABA_PROFESSORES).getRange(p.linha, 3).setValue(pap);
    if (p.email) derrubarSessoes_(p.email);
    return { ok: true };
  });
}

/* ─── primeiro acesso da gestão, pelo menu da planilha ───
   Sem ninguém cadastrado, ninguém entra no app. Isto roda como o dono
   da planilha, que é quem já manda em tudo. */
function criarAcessoGestaoMenu() {
  const ui = SpreadsheetApp.getUi();
  const r1 = ui.prompt('Acesso da gestão', 'Nome da pessoa (como aparece na equipe):', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  const nome = String(r1.getResponseText() || '').trim().replace(/\s+/g, ' ');
  if (nome.length < 2) { ui.alert('Escreva o nome.'); return; }
  const r2 = ui.prompt('Acesso da gestão', 'E-mail de ' + nome + ':', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  const e = normEmail_(r2.getResponseText());
  if (!emailValido_(e)) { ui.alert('Esse e-mail não parece certo.'); return; }

  const senha = comTrava(function () {
    const aba = abaProfessores_();
    const ps = lerProfessores();
    const outro = ps.filter(function (x) { return x.email === e && chave(x.nome) !== chave(nome); })[0];
    if (outro) throw new Error('Esse e-mail já é de ' + outro.nome + '.');
    const p = ps.filter(function (x) { return chave(x.nome) === chave(nome); })[0];
    if (p) aba.getRange(p.linha, 2, 1, 2).setValues([[e, PAPEL_GESTAO]]);
    else aba.appendRow([nome, e, PAPEL_GESTAO]);
    const s = senhaTemporaria_();
    gravarSenha_(e, s, true);
    derrubarSessoes_(e);
    return s;
  });
  ui.alert('Acesso criado',
    nome + ' entra no app com:\n\nE-mail: ' + e + '\nSenha temporária: ' + senha +
    '\n\nNo primeiro acesso o app pede para trocar a senha. Anote agora: ela não aparece de novo.',
    ui.ButtonSet.OK);
}
