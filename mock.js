/* ══════════════════════════════════════════════════════════════
   Mock do google.script.run — SÓ PARA ABRIR NO NAVEGADOR.
   Não vai para o Apps Script. O gerar-preview.sh injeta este
   arquivo no topo do Index.html e cria o preview.html.

   Ativa apenas quando window.google não existe.

   Abra assim:
     preview.html                      -> tela inicial
     preview.html?turma=Jazz%20Juvenil -> como se viesse do QR
     preview.html?dev=1                -> painel de rede e falhas
   Logins no mock (ver EQUIPE abaixo):
     vera@exemplo.org  / veridiana   -> Gestão
     aline@exemplo.org / aline123    -> Professor
     bruno@exemplo.org / temp2345    -> Professor, senha temporária
   ══════════════════════════════════════════════════════════════ */
(function () {
  if (window.google) return;

  var P = new URLSearchParams(location.search);
  var CFG = { atraso: 420, falha: 0, offline: false };

  /* ─── dados de mentira, no formato da planilha ─── */
  var TURMAS = [
    { nome:'Ballet Infantil I', ativa:true, minutos:60 },
    { nome:'Ballet Infantil II', ativa:true, minutos:60 },
    { nome:'Jazz Juvenil', ativa:true, minutos:90 },
    { nome:'Danças Urbanas', ativa:true, minutos:90 },
    { nome:'Contemporâneo Avançado', ativa:true, minutos:120 },
    { nome:'Teatro', ativa:true, minutos:90 }
  ];
  var PROFS = ['Vera Lúcia Sampaio','Aline Ferreira','Bruno Tavares','Cláudia Nogueira',
               'Denise Rocha','Iara Mendes','Rafael Duarte','Sâmia Alencar'];
  var ALUNOS = [];
  var DDD = ['85'];
  function fone(i){ return DDD[0] + '9' + String(90000000 + i * 137 % 9999999).padStart(8,'0'); }
  function nasc(i, idadeBase){
    var ano = 2026 - idadeBase - (i % 3);
    var mes = String(1 + (i * 7) % 12).padStart(2,'0');
    var dia = String(1 + (i * 11) % 27).padStart(2,'0');
    return ano + '-' + mes + '-' + dia;
  }
  var RESP = ['Ana Paula Sousa','Josefa Lima','Marcos Ferreira','Rita de Cássia Alves',
              'Cleide Nunes','Antônio Barbosa','Sandra Rodrigues','Fabiana Vasconcelos',
              'Elisângela Pinheiro','Raimundo Costa','Vanessa Gomes','Cícero Freitas'];
  var seqAluno = 0;
  function povoar(turma, nomes, inativos, idadeBase){
    nomes.forEach(function (n){
      seqAluno++;
      ALUNOS.push({ turma:turma, nome:n, ativo:true,
        nascimento: nasc(seqAluno, idadeBase || 8),
        responsavel: RESP[seqAluno % RESP.length],
        telefone: fone(seqAluno) });
    });
    (inativos || []).forEach(function (n){
      seqAluno++;
      ALUNOS.push({ turma:turma, nome:n, ativo:false,
        nascimento: nasc(seqAluno, idadeBase || 8), responsavel:'', telefone:'' });
    });
  }
  povoar('Ballet Infantil I', [
    'Ana Beatriz Sousa','Alice Ferreira Lima','Cecília Marques','Clara Nunes Barbosa',
    'Elisa Rodrigues','Emanuelly Vasconcelos','Gabriela Pinheiro','Helena Costa Braga',
    'Isabelly Gomes','Júlia Freitas','Lara Cavalcante','Laura Bezerra Pontes',
    'Lívia Andrade','Maitê Oliveira','Manuela Teixeira','Maria Clara Silva',
    'Melissa Farias','Sophia Ribeiro','Valentina Moreira','Yasmin Carvalho'
  ], ['Beatriz Aguiar','Rebeca Lopes'], 8);
  povoar('Ballet Infantil II', [
    'Agatha Correia','Bianca Rocha','Catarina Melo','Eloá Santiago','Esther Pereira',
    'Fernanda Duarte','Giovanna Alves','Heloísa Martins','Ingrid Barros','Larissa Cunha',
    'Letícia Ramos','Luiza Sales','Marina Fontenele','Nicole Batista','Rafaela Queiroz',
    'Sarah Colares'
  ], ['Vitória Amorim'], 10);
  povoar('Jazz Juvenil', [
    'Amanda Furtado','Camila Verissimo','Daniel Aragão','Emanuel Girão','Gabriel Uchôa',
    'Isadora Paiva','João Pedro Bastos','Kauã Nascimento','Lucas Timbó','Mariana Frota',
    'Matheus Bandeira','Nathália Coelho','Pedro Henrique Rios','Rebeca Studart',
    'Samuel Linhares','Thaís Girão','Vinícius Parente','Yago Menezes'
  ], [], 15);
  povoar('Danças Urbanas', [
    'Alan Saraiva','Breno Vidal','Caio Feitosa','Davi Lucas Aguiar','Erick Monteiro',
    'Felipe Cordeiro','Gustavo Bonfim','Igor Marinho','Jonas Peixoto','Kaique Torres',
    'Lucas Gadelha','Miguel Arruda','Nicolas Viana','Otávio Praxedes','Renan Chaves',
    'Thiago Bastos','Wesley Simões'
  ], ['Arthur Pontes'], 16);
  povoar('Contemporâneo Avançado', [
    'Beatriz Holanda','Carolina Ximenes','Débora Feijó','Eduarda Salgado','Flávia Rocha',
    'Isabela Fiúza','Juliana Bastos','Karina Mota','Letícia Sampaio','Marcela Tavares',
    'Priscila Gondim','Raquel Belchior','Talita Moura','Verônica Lessa'
  ], [], 19);
  povoar('Teatro', [
    'André Luiz Cabral','Bruna Siqueira','Carlos Eduardo Pires','Diana Castelo',
    'Elias Fontes','Giovana Prado','Henrique Mesquita','Iasmin Vieira','Kelly Damasceno',
    'Leonardo Pires','Milena Aguiar','Otávio Brandão'
  ], ['Sabrina Lira'], 14);

  var AULAS = [
    { data:'2026-08-04', turma:'Ballet Infantil I', professor:'Vera Lúcia Sampaio' },
    { data:'2026-08-06', turma:'Jazz Juvenil', professor:'Bruno Tavares' },
    { data:'2026-08-11', turma:'Ballet Infantil I', professor:'Vera Lúcia Sampaio' },
    { data:'2026-08-13', turma:'Jazz Juvenil', professor:'Bruno Tavares' },
    { data:'2026-08-18', turma:'Ballet Infantil I', professor:'Vera Lúcia Sampaio' },
    { data:'2026-08-20', turma:'Jazz Juvenil', professor:'Bruno Tavares' },
    { data:'2026-08-21', turma:'Danças Urbanas', professor:'Rafael Duarte' },
    { data:'2026-08-25', turma:'Ballet Infantil I', professor:'Vera Lúcia Sampaio' },
    { data:'2026-08-27', turma:'Jazz Juvenil', professor:'Bruno Tavares' },
    { data:'2026-08-28', turma:'Contemporâneo Avançado', professor:'Aline Ferreira' },
    { data:'2026-08-28', turma:'Danças Urbanas', professor:'Rafael Duarte' },
    { data:'2026-09-01', turma:'Ballet Infantil I', professor:'Vera Lúcia Sampaio' },
    { data:'2026-09-01', turma:'Danças Urbanas', professor:'Rafael Duarte' },
    { data:'2026-09-02', turma:'Jazz Juvenil', professor:'Bruno Tavares' },
    { data:'2026-09-02', turma:'Teatro', professor:'Iara Mendes' },
    { data:'2026-09-02', turma:'Ballet Infantil II', professor:'Cláudia Nogueira' }
  ];
  /* Quem sumiu de verdade, para a tela de evasão ter o que mostrar. */
  var SUMIDOS = { 'Cecília Marques':'2026-08-11', 'Kauã Nascimento':'2026-08-13',
                  'Igor Marinho':'2026-08-21' };
  var REGISTROS = [];
  AULAS.forEach(function (aula, ai){
    ALUNOS.forEach(function (al, i){
      if (al.turma !== aula.turma || !al.ativo) return;
      var st = 'Presente';
      if (SUMIDOS[al.nome] && aula.data >= SUMIDOS[al.nome]) st = 'Falta';
      else if ((i * 13 + ai * 7) % 23 === 0) st = 'Falta';
      else if ((i * 13 + ai * 7) % 37 === 0) st = 'Justificada';
      REGISTROS.push({ data:aula.data, turma:aula.turma, professor:aula.professor,
                       aluno:al.nome, status:st });
    });
  });
  var CHAMADAS = AULAS.slice();

  var CAT_ENTRADA = ['Doação','Bazar','Edital','Rifa','Evento','Outro'];
  var CAT_SAIDA   = ['Aluguel','Água e luz','Internet','Figurino','Material de dança',
                     'Transporte','Lanche','Manutenção','Outro'];
  var CAIXA = [
    {registro:'', data:'2026-08-05', tipo:'Entrada', valor:2500,   categoria:'Edital',   descricao:'1ª parcela', fonte:'Edital Secult 2026', comprovante:'https://drive.google.com/x1', quem:'Vera Lúcia Sampaio', linha:2},
    {registro:'', data:'2026-08-07', tipo:'Saída',   valor:1200,   categoria:'Aluguel',  descricao:'sala de ensaio', fonte:'Edital Secult 2026', comprovante:'https://drive.google.com/x2', quem:'Vera Lúcia Sampaio', linha:3},
    {registro:'', data:'2026-08-12', tipo:'Entrada', valor:340.50, categoria:'Bazar',    descricao:'bazar de sábado', fonte:'Recursos próprios', comprovante:'', quem:'Vera Lúcia Sampaio', linha:4},
    {registro:'', data:'2026-08-19', tipo:'Saída',   valor:186.90, categoria:'Figurino', descricao:'collants do infantil', fonte:'Recursos próprios', comprovante:'', quem:'Aline Ferreira', linha:5},
    {registro:'', data:'2026-08-28', tipo:'Saída',   valor:220,    categoria:'Água e luz', descricao:'', fonte:'Edital Secult 2026', comprovante:'https://drive.google.com/x3', quem:'Vera Lúcia Sampaio', linha:6},
    {registro:'', data:'2026-09-02', tipo:'Entrada', valor:150,    categoria:'Doação',   descricao:'doação da vizinha', fonte:'Recursos próprios', comprovante:'', quem:'Vera Lúcia Sampaio', linha:7},
    {registro:'', data:'2026-09-02', tipo:'Saída',   valor:95.40,  categoria:'Lanche',   descricao:'lanche do ensaio geral', fonte:'Recursos próprios', comprovante:'https://drive.google.com/x4', quem:'Vera Lúcia Sampaio', linha:8}
  ];
  var proximaLinha = 9;
  function valorNumero(v){
    if (typeof v === 'number') return v;
    var s2 = String(v==null?'':v).replace(/[^0-9,.-]/g,'').trim();
    if (!s2) return NaN;
    var vi = s2.lastIndexOf(','), po = s2.lastIndexOf('.');
    if (vi !== -1 && po !== -1) s2 = vi > po ? s2.replace(/\./g,'').replace(',','.') : s2.replace(/,/g,'');
    else if (vi !== -1) s2 = s2.replace(/\./g,'').replace(',','.');
    else if (po !== -1) s2 = /^-?\d+(\.\d{3})+$/.test(s2) ? s2.replace(/\./g,'') : s2;
    return parseFloat(s2);
  }

  function fontesUsadas(){
    var v = {}; CAIXA.forEach(function(r){ if (r.fonte) v[r.fonte] = 1; });
    return Object.keys(v).sort(function(a,b){ return pt(a,b); });
  }

  /* ─── agenda ─── */
  var TIPOS_EV = ['Apresentação','Competição','Data comemorativa','Bazar','Ensaio geral','Reunião','Mídia','Outro'];
  var STATUS_EV = ['Planejado','Confirmado','Realizado','Cancelado'];
  var COR_TIPO = { 'Apresentação':'#4A1D6E','Competição':'#A34A12','Data comemorativa':'#AF2338',
    'Bazar':'#16704A','Ensaio geral':'#1D5FA8','Reunião':'#56505E','Mídia':'#8A6314','Outro':'#6B5E78' };
  var DATAS_FIXAS = [{ dia:'04-29', titulo:'Dia Internacional da Dança', tipo:'Data comemorativa' }];
  var seqEv = 0;
  function ev(data, titulo, tipo, o){
    o = o || {};
    return { id:'E' + (++seqEv), data:data, dataFim:o.fim || '', titulo:titulo, tipo:tipo,
             turmas:o.turmas || [], local:o.local || '', status:o.status || 'Confirmado', obs:o.obs || '' };
  }
  var AGENDA = [
    ev('2026-04-29','Dia Internacional da Dança','Data comemorativa',{status:'Realizado'}),
    ev('2026-08-22','Bazar de agosto','Bazar',{status:'Realizado', local:'Pátio do instituto'}),
    ev('2026-09-30','Gravação de vídeo para o Instagram','Mídia',{turmas:['Jazz Juvenil','Danças Urbanas']}),
    ev('2026-10-03','Reunião com as famílias','Reunião',{local:'Sala de dança'}),
    ev('2026-10-10','Bazar de primavera','Bazar',{local:'Pátio do instituto', status:'Planejado'}),
    ev('2026-10-17','Festival de Dança de Fortaleza','Competição',{fim:'2026-10-19', turmas:['Contemporâneo Avançado','Jazz Juvenil'], local:'Theatro José de Alencar'}),
    ev('2026-11-28','Ensaio geral do espetáculo','Ensaio geral',{status:'Planejado'}),
    ev('2026-12-05','Espetáculo de fim de ano','Apresentação',{local:'Teatro do bairro', status:'Planejado'})
  ];
  function evFim(e){ return e.dataFim || e.data; }
  function porData(a, b){ return a.data === b.data ? pt(a.titulo, b.titulo) : (a.data < b.data ? -1 : 1); }
  function normEv(d, b){
    b = b || {};
    function pg(k){ return d[k] !== undefined ? d[k] : b[k]; }
    var titulo = String(pg('titulo') || '').trim();
    if (titulo.length < 2) throw new Error('Escreva o nome do evento.');
    var data = String(pg('data') || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error('Escolha a data do evento.');
    var fim = String(pg('dataFim') || '');
    if (fim === data) fim = '';
    if (fim && fim < data) throw new Error('O evento termina antes de começar. Confira as datas.');
    var tipo = pg('tipo');
    return { titulo:titulo, data:data, dataFim:fim, tipo: TIPOS_EV.indexOf(tipo) !== -1 ? tipo : 'Outro',
      turmas: pg('turmas') || [], local: String(pg('local') || ''), obs: String(pg('obs') || ''),
      status: STATUS_EV.indexOf(pg('status')) !== -1 ? pg('status') : 'Planejado' };
  }
  function turmasAtivas(){ return TURMAS.filter(function(t){ return t.ativa; }).map(function(t){ return t.nome; }).sort(pt); }

  /* ─── materiais ─── */
  var FINALIDADES = ['Instituto','Bazar','Espetáculo','Ambos'];
  var ESTADOS = ['Novo','Bom','Usado','Precisa reparo','Inservível'];
  var SUG_CAT = ['Som e áudio','Figurino','Material de aula','Móveis','Limpeza','Bazar','Cenário'];
  var SUG_LOC = ['Sala de dança','Depósito','Recepção','Armário 1'];
  var seqMt = 0;
  function mt(item, cat, fin, q, est, loc, obs){
    return { id:'M' + (++seqMt), item:item, categoria:cat, finalidade:fin, quantidade:q,
             estado:est, local:loc, obs:obs || '', ativo:true };
  }
  var MATERIAIS = [
    mt('Caixa de som JBL','Som e áudio','Instituto',1,'Bom','Sala de dança'),
    mt('Microfone sem fio','Som e áudio','Espetáculo',2,'Precisa reparo','Armário 1','um dos dois chia'),
    mt('Extensão elétrica 10 m','Som e áudio','Instituto',3,'Usado','Depósito'),
    mt('Collant preto infantil','Figurino','Espetáculo',24,'Bom','Armário 1'),
    mt('Saia de tule rosa','Figurino','Espetáculo',18,'Usado','Armário 1'),
    mt('Figurino do espetáculo 2024','Figurino','Bazar',11,'Usado','Depósito','peças avulsas para vender'),
    mt('Sapatilha meia-ponta (vários tamanhos)','Figurino','Instituto',30,'Bom','Armário 1'),
    mt('Colchonete','Material de aula','Instituto',15,'Bom','Sala de dança'),
    mt('Barra portátil','Material de aula','Instituto',2,'Precisa reparo','Sala de dança','pé solto'),
    mt('Bambolê','Material de aula','Instituto',12,'Bom','Depósito'),
    mt('Fita de ginástica','Material de aula','Instituto',20,'Novo','Armário 1'),
    mt('Cadeira de plástico','Móveis','Ambos',40,'Bom','Depósito'),
    mt('Mesa dobrável','Móveis','Ambos',4,'Bom','Depósito'),
    mt('Arara de roupas','Móveis','Bazar',2,'Bom','Depósito'),
    mt('Espelho de parede','Móveis','Instituto',3,'Bom','Sala de dança'),
    mt('Vassoura','Limpeza','Instituto',3,'Usado','Recepção'),
    mt('Rodo','Limpeza','Instituto',2,'Usado','Recepção'),
    mt('Roupas doadas (sacos)','Bazar','Bazar',9,'Bom','Depósito'),
    mt('Calçados doados (pares)','Bazar','Bazar',27,'Bom','Depósito'),
    mt('Brinquedos doados','Bazar','Bazar',14,'Usado','Depósito'),
    mt('Painel de TNT estrelado','Cenário','Espetáculo',1,'Bom','Depósito'),
    mt('Refletor de LED','Cenário','Espetáculo',4,'Precisa reparo','Depósito','dois não acendem')
  ];
  function lerMt(){ return MATERIAIS.filter(function(m){ return m.ativo; }); }
  function distintos(campo){
    var v = {}, fora = [];
    MATERIAIS.forEach(function(m){ var x = m[campo]; if (x && !v[chave(x)]){ v[chave(x)] = 1; fora.push(x); } });
    return fora.sort(pt);
  }
  function comSug(usadas, sug){
    var tem = {}; usadas.forEach(function(u){ tem[chave(u)] = 1; });
    return { usadas:usadas, sugestoes: usadas.length >= 3 ? [] : sug.filter(function(s){ return !tem[chave(s)]; }) };
  }
  function normMt(d, b){
    b = b || {};
    function pg(k){ return d[k] !== undefined ? d[k] : b[k]; }
    var item = String(pg('item') || '').trim();
    if (item.length < 2) throw new Error('Escreva o nome do item.');
    var q = Number(pg('quantidade'));
    if (!(q >= 0) || Math.floor(q) !== q) throw new Error('A quantidade precisa ser um número inteiro.');
    return { item:item, categoria:String(pg('categoria') || '') || 'Sem categoria',
      finalidade: FINALIDADES.indexOf(pg('finalidade')) !== -1 ? pg('finalidade') : 'Instituto',
      quantidade:q, estado: ESTADOS.indexOf(pg('estado')) !== -1 ? pg('estado') : 'Bom',
      local:String(pg('local') || ''), obs:String(pg('obs') || '') };
  }
  function acharMt(id){
    var m = MATERIAIS.filter(function(x){ return x.id === id; })[0];
    if (!m) throw new Error('Esse item não existe mais. Alguém pode ter mexido na planilha.');
    return m;
  }

  var TOKENS = {};
  /* e-mail -> acesso. Quem não está aqui não entra. */
  var EQUIPE = {
    'vera@exemplo.org':  { nome:'Vera Lúcia Sampaio', papel:'Gestão',    senha:'veridiana', tmp:false },
    'aline@exemplo.org': { nome:'Aline Ferreira',     papel:'Professor', senha:'aline123',  tmp:false },
    'bruno@exemplo.org': { nome:'Bruno Tavares',      papel:'Professor', senha:'temp2345',  tmp:true }
  };
  var SESS = {};   /* token -> {email, so troca?} */
  function emailDe(nome){
    for (var e in EQUIPE) if (chave(EQUIPE[e].nome) === chave(nome)) return e;
    return '';
  }
  function exigirSessao(t){
    var s = SESS[t];
    if (!s || s.t || !EQUIPE[s.e]) throw new Error('SESSAO: Sua sessão terminou. Entre de novo.');
    var u = EQUIPE[s.e];
    return { email:s.e, nome:u.nome, papel:u.papel };
  }
  function novaSessao(email, soTroca){
    var t = 'T' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now();
    SESS[t] = { e:email, t:!!soTroca };
    return t;
  }
  function derrubar(email){ for (var t in SESS) if (SESS[t].e === email) delete SESS[t]; }
  /* A sessão sobrevive ao recarregar o preview, como no app de verdade. */
  try { SESS = JSON.parse(sessionStorage.getItem('mockSess') || '{}'); } catch(e){}
  function salvarSess(){ try { sessionStorage.setItem('mockSess', JSON.stringify(SESS)); } catch(e){} }
  var URL_APP = 'https://script.google.com/macros/s/AKfycbwEXEMPLO0000000000000000000000000000/exec';

  function hoje(){
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function chave(s){
    return String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .trim().toLowerCase().replace(/\s+/g,' ');
  }
  function pt(a,b){ return String(a).localeCompare(String(b),'pt-BR'); }
  function idadeEm(nascISO, refISO){
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(nascISO||''))) return null;
    var n = nascISO.split('-').map(Number), r = (refISO || hoje()).split('-').map(Number);
    var i = r[0]-n[0];
    if (r[1]<n[1] || (r[1]===n[1] && r[2]<n[2])) i--;
    return i >= 0 ? i : null;
  }
  function aniversariosEntre(de, ate, turma){
    var base = new Date(), alvos = {};
    for (var d = de; d <= ate; d++){
      var x = new Date(base.getTime() + d*86400000);
      var iso = x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
      alvos[iso.slice(5)] = iso;
    }
    var fora = [];
    ALUNOS.forEach(function(a){
      if (!a.ativo || !a.nascimento) return;
      if (turma && a.turma !== turma) return;
      var md = a.nascimento.slice(5);
      if (!alvos[md]) return;
      fora.push({aluno:a.nome, turma:a.turma, dia:alvos[md], faz:idadeEm(a.nascimento, alvos[md])});
    });
    return fora.sort(function(x,y){ return x.dia===y.dia ? pt(x.aluno,y.aluno) : (x.dia<y.dia?-1:1); });
  }
  function exigirPin(p){
    var u = exigirSessao(p);
    if (u.papel !== 'Gestão') throw new Error('Só a gestão pode fazer isso.');
    return u;
  }
  function exigirNome(n){
    var v = String(n==null?'':n).trim().replace(/\s+/g,' ');
    if (v.length < 2) throw new Error('Escreva o nome com pelo menos 2 letras.');
    return v;
  }
  function acharAluno(nome, turma){
    var a = ALUNOS.filter(function(x){
      return chave(x.nome)===chave(nome) && (!turma || x.turma===turma);
    });
    if (!a.length) throw new Error('Aluno não encontrado.');
    if (a.length > 1) throw new Error('Existe mais de um "'+nome+'". Abra pela turma para não mexer no aluno errado.');
    return a[0];
  }

  /* ─── as funções que existem no Codigo.gs ─── */
  var API = {
    /* Só usado pelo preview --lazy: devolve o módulo embutido. */
    modulo: function(nome){
      if (!window.__MODULOS || !window.__MODULOS[nome]) throw new Error('Parte do app desconhecida: ' + nome);
      return window.__MODULOS[nome];
    },
    resumoInicial: function(prof){
      var h = hoje(), saldo = 0;
      CAIXA.forEach(function(r){ if (r.data.slice(0,7) <= h.slice(0,7)) saldo += r.tipo === 'Entrada' ? r.valor : -r.valor; });
      var prox = AGENDA.filter(function(e){ return e.status !== 'Cancelado' && evFim(e) >= h; }).sort(porData);
      var dia = new Date().getDay(), feitas = {}, cand = {};
      CHAMADAS.forEach(function(c){
        if (c.data === h){ feitas[c.turma] = 1; return; }
        var p = c.data.split('-');
        if (new Date(+p[0], +p[1]-1, +p[2]).getDay() === dia) cand[c.turma] = c.professor;
      });
      var k = chave(prof), turmas = Object.keys(cand).filter(function(t){ return !feitas[t]; });
      var minhas = turmas.filter(function(t){ return chave(cand[t]) === k; });
      if (k && minhas.length) turmas = minhas;
      var destaque = null;
      var deHoje = prox.filter(function(e){ return e.data <= h; })[0];
      if (deHoje) destaque = {tipo:'evento', hoje:true, titulo:deHoje.titulo, data:deHoje.data, tipoEvento:deHoje.tipo};
      else if (turmas.length) destaque = {tipo:'aula', turma:turmas.sort(pt)[0], hora:'15h', agora:new Date().getHours() === 15};
      else if (prox[0]) destaque = {tipo:'evento', hoje:false, titulo:prox[0].titulo, data:prox[0].data, tipoEvento:prox[0].tipo};
      return { turmas: API.listarTurmas().length,
               proximo: prox[0] ? {titulo:prox[0].titulo, data:prox[0].data} : null,
               /* MOSTRAR_SALDO_NA_ENTRADA = false no servidor */
               saldo: null, materiais: lerMt().length, destaque: destaque };
    },
    listarAgenda: function(ano, mes){
      var mm = String(mes).padStart(2,'0'), ini = ano + '-' + mm + '-01', fim = ano + '-' + mm + '-31';
      return { ano:+ano, mes:+mes, hoje:hoje(), tipos:TIPOS_EV, status:STATUS_EV, cores:COR_TIPO, turmas:turmasAtivas(),
        eventos: AGENDA.filter(function(e){ return e.data <= fim && evFim(e) >= ini; }).sort(porData) };
    },
    listarAgendaAno: function(ano){
      var meses = [], total = 0;
      for (var m = 1; m <= 12; m++) meses.push({mes:m, total:0, tipos:{}});
      AGENDA.forEach(function(e){
        if (e.status === 'Cancelado' || e.data > ano + '-12-31' || evFim(e) < ano + '-01-01') return;
        total++;
        var de = e.data < ano + '-01-01' ? 1 : +e.data.slice(5,7), ate = evFim(e) > ano + '-12-31' ? 12 : +evFim(e).slice(5,7);
        for (var x = de; x <= ate; x++){ meses[x-1].total++; meses[x-1].tipos[e.tipo] = (meses[x-1].tipos[e.tipo] || 0) + 1; }
      });
      return { ano:+ano, hoje:hoje(), meses:meses, total:total, cores:COR_TIPO, tipos:TIPOS_EV };
    },
    criarEvento: function(pin, d){
      exigirPin(pin); var e = normEv(d || {}); e.id = 'E' + (++seqEv); AGENDA.push(e);
      return { ok:true, id:e.id, data:e.data };
    },
    editarEvento: function(pin, id, d){
      exigirPin(pin);
      var e = AGENDA.filter(function(x){ return x.id === id; })[0];
      if (!e) throw new Error('Esse evento não existe mais. Alguém pode ter apagado na planilha.');
      var n = normEv(d || {}, e); Object.keys(n).forEach(function(k){ e[k] = n[k]; });
      return { ok:true, id:id, data:e.data };
    },
    excluirEvento: function(pin, id){
      exigirPin(pin);
      var i = AGENDA.findIndex(function(x){ return x.id === id; });
      if (i === -1) throw new Error('Esse evento não existe mais.');
      AGENDA.splice(i, 1); return { ok:true };
    },
    datasFixas: function(ano){
      return { ano:+ano, cores:COR_TIPO, datas: DATAS_FIXAS.map(function(df){
        var data = ano + '-' + df.dia;
        return { dia:df.dia, data:data, titulo:df.titulo, tipo:df.tipo,
          jaTem: AGENDA.some(function(e){ return e.data === data && chave(e.titulo) === chave(df.titulo); }) };
      }) };
    },
    precarregarDatas: function(pin, ano, lista){
      exigirPin(pin);
      var criados = 0, ja = 0;
      DATAS_FIXAS.forEach(function(df){
        if ((lista || []).indexOf(df.dia) === -1) return;
        var data = ano + '-' + df.dia;
        if (AGENDA.some(function(e){ return e.data === data && chave(e.titulo) === chave(df.titulo); })){ ja++; return; }
        API.criarEvento(pin, {titulo:df.titulo, data:data, tipo:df.tipo, status:'Confirmado'}); criados++;
      });
      if (!criados && !ja) throw new Error('Marque pelo menos uma data.');
      return { ok:true, criados:criados, jaTinha:ja };
    },
    gerarCalendarioPdf: function(pin, ano){
      exigirPin(pin);
      return { ok:true, url:'https://drive.google.com/file/d/1EXEMPLO_CALENDARIO_000/view',
        baixar:'https://drive.google.com/uc?export=download&id=1EXEMPLO_CALENDARIO_000',
        nome:'Calendário ' + ano + ' — Instituto Veridiana.pdf', publico:true, paginas:4,
        tempo:{ montar:0.3, exportar:0.1, total:0.4 },
        eventos: API.listarAgendaAno(ano).total };
    },
    listarMateriais: function(){
      return { itens: lerMt().slice().sort(function(a, b){ return pt(a.categoria, b.categoria) || pt(a.item, b.item); }),
        categorias: comSug(distintos('categoria'), SUG_CAT), locais: comSug(distintos('local'), SUG_LOC),
        finalidades:FINALIDADES, estados:ESTADOS };
    },
    listarCategorias: function(){ return comSug(distintos('categoria'), SUG_CAT); },
    listarLocais: function(){ return comSug(distintos('local'), SUG_LOC); },
    criarMaterial: function(pin, d){
      exigirPin(pin); var m = normMt(d || {}); m.id = 'M' + (++seqMt); m.ativo = true; MATERIAIS.push(m);
      return { ok:true, id:m.id };
    },
    editarMaterial: function(pin, id, d){
      exigirPin(pin); var m = acharMt(id), n = normMt(d || {}, m);
      Object.keys(n).forEach(function(k){ m[k] = n[k]; }); return { ok:true, id:id };
    },
    ajustarQuantidade: function(pin, id, delta){
      exigirPin(pin); var m = acharMt(id); m.quantidade = Math.max(0, m.quantidade + Number(delta));
      return { ok:true, quantidade:m.quantidade };
    },
    inativarMaterial: function(pin, id){ exigirPin(pin); acharMt(id).ativo = false; return { ok:true }; },
    renomearNaLista: function(pin, campo, de, para){
      exigirPin(pin); var n = 0;
      MATERIAIS.forEach(function(m){ if (m[campo] === de){ m[campo] = para; n++; } });
      return { ok:true, mudou:n };
    },
    listarTurmas: function(){
      var comAluno = {};
      ALUNOS.forEach(function(a){ if (a.ativo) comAluno[a.turma] = 1; });
      return TURMAS.filter(function(t){ return t.ativa && comAluno[t.nome]; })
                   .map(function(t){ return t.nome; }).sort(pt);
    },
    carregarTurma: function(turma){
      var alunos = ALUNOS.filter(function(a){ return a.turma===turma && a.ativo; })
                         .map(function(a){ return a.nome; }).sort(pt);
      var ult = '';
      for (var i = CHAMADAS.length-1; i >= 0; i--)
        if (CHAMADAS[i].turma === turma && PROFS.indexOf(CHAMADAS[i].professor) !== -1){
          ult = CHAMADAS[i].professor; break;
        }
      return {
        turma:turma, alunos:alunos, professores:PROFS.slice().sort(pt),
        professorSugerido:ult, data:hoje(),
        jaRegistrada: CHAMADAS.some(function(c){ return c.data===hoje() && c.turma===turma; }),
        aniversarios: aniversariosEntre(0, 0, turma)
      };
    },
    salvarChamada: function(d){
      if (!d || !d.turma) throw new Error('Turma não informada.');
      if (!d.professor) throw new Error('Escolha quem está dando a aula.');
      if (!d.presencas || !d.presencas.length) throw new Error('Nenhum aluno na lista.');
      if (d.token && TOKENS[d.token]) return TOKENS[d.token];
      var VALIDOS = ['Presente','Falta','Justificada'];
      d.presencas.forEach(function(p){
        if (VALIDOS.indexOf(p.status) === -1) throw new Error('Status inválido: '+p.status);
      });
      if (!d.forcar && CHAMADAS.some(function(c){ return c.data===hoje() && c.turma===d.turma; }))
        throw new Error('DUPLICADA: já existe chamada de '+d.turma+' hoje.');
      CHAMADAS.push({ data:hoje(), turma:d.turma, professor:d.professor });
      d.presencas.forEach(function(p){
        REGISTROS.push({ data:hoje(), turma:d.turma, professor:d.professor,
                         aluno:p.aluno, status:p.status });
      });
      var pres = d.presencas.filter(function(p){ return p.status==='Presente'; }).length;
      var r = { ok:true, turma:d.turma, professor:d.professor, data:hoje(),
                total:d.presencas.length, presentes:pres, faltas:d.presencas.length-pres };
      if (d.token) TOKENS[d.token] = r;
      return r;
    },
    entrarNaGestao: function(pin){
      exigirPin(pin);
      return {
        ok:true,
        turmas: TURMAS.filter(function(t){ return t.ativa; }).length,
        alunosAtivos: ALUNOS.filter(function(a){ return a.ativo; }).length,
        alunosInativos: ALUNOS.filter(function(a){ return !a.ativo; }).length,
        professores: PROFS.length
      };
    },
    listarTurmasCompleto: function(pin){
      exigirPin(pin);
      return TURMAS.filter(function(t){ return t.ativa; }).map(function(t){
        return { nome:t.nome,
          ativos: ALUNOS.filter(function(a){ return a.turma===t.nome && a.ativo; }).length,
          inativos: ALUNOS.filter(function(a){ return a.turma===t.nome && !a.ativo; }).length };
      }).sort(function(a,b){ return pt(a.nome,b.nome); });
    },
    criarTurma: function(pin, nome){
      exigirPin(pin); var n = exigirNome(nome);
      var j = TURMAS.filter(function(t){ return chave(t.nome)===chave(n); })[0];
      if (j && j.ativa) throw new Error('Já existe uma turma com esse nome.');
      if (j){ j.ativa = true; return {ok:true, nome:j.nome}; }
      TURMAS.push({ nome:n, ativa:true }); return {ok:true, nome:n};
    },
    renomearTurma: function(pin, atual, novo){
      exigirPin(pin); var n = exigirNome(novo);
      if (TURMAS.some(function(t){ return chave(t.nome)===chave(n) && t.nome!==atual; }))
        throw new Error('Já existe uma turma com esse nome.');
      var t = TURMAS.filter(function(x){ return x.nome===atual; })[0];
      if (!t) throw new Error('Turma não encontrada.');
      t.nome = n;
      ALUNOS.forEach(function(a){ if (a.turma===atual) a.turma = n; });
      CHAMADAS.forEach(function(c){ if (c.turma===atual) c.turma = n; });
      REGISTROS.forEach(function(r){ if (r.turma===atual) r.turma = n; });
      return {ok:true, nome:n};
    },
    arquivarTurma: function(pin, nome){
      exigirPin(pin);
      if (ALUNOS.some(function(a){ return a.turma===nome && a.ativo; }))
        throw new Error('Mova ou desative os alunos antes de arquivar.');
      var t = TURMAS.filter(function(x){ return x.nome===nome; })[0];
      if (!t) throw new Error('Turma não encontrada.');
      t.ativa = false; return {ok:true};
    },
    listarAlunos: function(pin, turma, incluirInativos){
      exigirPin(pin);
      return ALUNOS.filter(function(a){
        if (turma && a.turma!==turma) return false;
        if (!incluirInativos && !a.ativo) return false;
        return true;
      }).map(function(a){ return {nome:a.nome, turma:a.turma, ativo:a.ativo,
          nascimento:a.nascimento, responsavel:a.responsavel, telefone:a.telefone}; })
        .sort(function(a,b){ return pt(a.nome,b.nome); });
    },
    adicionarAluno: function(pin, turma, nome, dados){
      exigirPin(pin); var n = exigirNome(nome);
      if (ALUNOS.some(function(a){ return a.turma===turma && chave(a.nome)===chave(n); }))
        throw new Error('Esse aluno já está nessa turma.');
      if (!TURMAS.some(function(t){ return t.nome===turma && t.ativa; }))
        TURMAS.push({nome:turma, ativa:true});
      var d = dados || {};
      ALUNOS.push({turma:turma, nome:n, ativo:true, nascimento:d.nascimento||'',
                   responsavel:d.responsavel||'', telefone:(d.telefone||'').replace(/[^0-9]/g,'')});
      return {ok:true};
    },
    moverAluno: function(pin, nome, destino, origem){
      exigirPin(pin);
      var a = acharAluno(nome, origem);
      if (a.turma === destino) return {ok:true};
      if (ALUNOS.some(function(x){ return x.turma===destino && chave(x.nome)===chave(a.nome); }))
        throw new Error('Já existe um aluno com esse nome em '+destino+'.');
      a.turma = destino; return {ok:true};
    },
    desativarAluno: function(pin, nome, turma){ exigirPin(pin); acharAluno(nome,turma).ativo = false; return {ok:true}; },
    reativarAluno:  function(pin, nome, turma){ exigirPin(pin); acharAluno(nome,turma).ativo = true;  return {ok:true}; },
    listarProfessores: function(pin){ exigirPin(pin); return PROFS.slice().sort(pt); },
    entrar: function(email, senha){
      var e = String(email || '').trim().toLowerCase(), u = EQUIPE[e];
      if (!e || !senha) throw new Error('Preencha e-mail e senha.');
      if (!u || u.senha !== senha) throw new Error('E-mail ou senha não conferem.');
      var t = novaSessao(e, u.tmp); salvarSess();
      return { token:t, trocar:u.tmp, usuario:{ nome:u.nome, email:e, papel:u.papel } };
    },
    quemSou: function(t){ return exigirSessao(t); },
    trocarSenha: function(t, atual, nova){
      var s = SESS[t];
      if (!s) throw new Error('SESSAO: Sua sessão terminou. Entre de novo.');
      var u = EQUIPE[s.e];
      if (String(nova || '').length < 6) throw new Error('A senha nova precisa ter pelo menos 6 caracteres.');
      if (u.senha !== atual) throw new Error('A senha atual não confere.');
      if (nova === atual) throw new Error('A senha nova precisa ser diferente da atual.');
      u.senha = nova; u.tmp = false; derrubar(s.e);
      var t2 = novaSessao(s.e, false); salvarSess();
      return { token:t2, usuario:{ nome:u.nome, email:s.e, papel:u.papel } };
    },
    sair: function(t){ delete SESS[t]; salvarSess(); return { ok:true }; },
    listarEquipe: function(pin){
      exigirPin(pin);
      return PROFS.slice().sort(pt).map(function(n){
        var e = emailDe(n), u = EQUIPE[e];
        return { nome:n, email:e, papel:u ? u.papel : 'Professor',
                 situacao: !u ? 'sem-acesso' : u.tmp ? 'pendente' : 'ativo' };
      });
    },
    definirAcesso: function(pin, nome, email, papel){
      var quem = exigirPin(pin), e = String(email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error('Esse e-mail não parece certo.');
      if (PROFS.every(function(p){ return chave(p) !== chave(nome); })) throw new Error('Professor não encontrado.');
      if (EQUIPE[e] && chave(EQUIPE[e].nome) !== chave(nome)) throw new Error('Esse e-mail já é de ' + EQUIPE[e].nome + '.');
      if (quem.email === e && papel !== 'Gestão') throw new Error('Você não pode tirar o seu próprio acesso de gestão.');
      var velho = emailDe(nome);
      if (velho){ delete EQUIPE[velho]; derrubar(velho); }
      var senha = 'k' + Math.random().toString(36).slice(2, 9);
      EQUIPE[e] = { nome:nome, papel:papel === 'Gestão' ? 'Gestão' : 'Professor', senha:senha, tmp:true };
      salvarSess();
      return { ok:true, nome:nome, email:e, papel:EQUIPE[e].papel, senha:senha };
    },
    mudarPapel: function(pin, nome, papel){
      var quem = exigirPin(pin), e = emailDe(nome);
      if (e === quem.email && papel !== 'Gestão') throw new Error('Você não pode tirar o seu próprio acesso de gestão.');
      if (e){ EQUIPE[e].papel = papel === 'Gestão' ? 'Gestão' : 'Professor'; derrubar(e); salvarSess(); }
      return { ok:true };
    },
    adicionarProfessor: function(pin, nome){
      exigirPin(pin); var n = exigirNome(nome);
      if (PROFS.some(function(p){ return chave(p)===chave(n); }))
        throw new Error('Esse professor já está na equipe.');
      PROFS.push(n); return {ok:true};
    },
    removerProfessor: function(pin, nome){
      var quem = exigirPin(pin), e = emailDe(nome);
      if (e && e === quem.email) throw new Error('Você não pode tirar você mesmo da equipe.');
      if (e){ delete EQUIPE[e]; derrubar(e); salvarSess(); }
      var i = PROFS.findIndex(function(p){ return chave(p)===chave(nome); });
      if (i === -1) throw new Error('Professor não encontrado.');
      PROFS.splice(i,1); return {ok:true};
    },
    obterUrlApp: function(pin){ exigirPin(pin); return URL_APP; },

    alunosParaCertificado: function(pin, turma){
      exigirPin(pin);
      var min = {}; TURMAS.forEach(function(t){ min[t.nome] = t.minutos || 60; });
      var h = {};
      REGISTROS.forEach(function(r){
        if (!h[r.aluno]) h[r.aluno] = {primeira:r.data, ultima:r.data, aulas:0, minutos:0};
        var x = h[r.aluno];
        if (r.data < x.primeira) x.primeira = r.data;
        if (r.data > x.ultima) x.ultima = r.data;
        if (r.status === 'Presente'){ x.aulas++; x.minutos += (min[r.turma] || 60); }
      });
      return ALUNOS.filter(function(a){ return !turma || a.turma === turma; })
        .map(function(a){
          var x = h[a.nome];
          return { nome:a.nome, turma:a.turma, ativo:a.ativo,
                   aulas: x ? x.aulas : 0, horas: x ? Math.round(x.minutos/60) : 0,
                   desde: x ? x.primeira : '', homonimo:false,
                   responsavel:a.responsavel, telefone:a.telefone };
        }).sort(function(a,b){ return pt(a.nome,b.nome); });
    },
    gerarCertificado: function(pin, nomes, turma){
      exigirPin(pin);
      var lista = (nomes || []).filter(Boolean);
      if (!lista.length) throw new Error('Escolha pelo menos um aluno.');
      var comAula = API.alunosParaCertificado(pin, '').filter(function(a){
        return lista.indexOf(a.nome) !== -1 && a.aulas > 0;
      }).map(function(a){ return a.nome; });
      if (!comAula.length) throw new Error('Nenhum desses alunos tem presença registrada ainda.');
      return { ok:true,
        url:'https://drive.google.com/file/d/1EXEMPLO_CERTIFICADO_0000000/view',
        nome: comAula.length === 1
          ? 'Certificado — ' + comAula[0] + ' — ' + hoje() + '.pdf'
          : 'Certificados — ' + (turma || 'vários') + ' — ' + hoje() + '.pdf',
        quantidade: comAula.length, completo:true,
        aluno: comAula.length === 1 ? comAula[0] : '',
        publico: comAula.length === 1,
        ignorados: lista.filter(function(n){ return comAula.indexOf(n) === -1; }) };
    },
    mesesCaixa: function(pin){
      exigirPin(pin);
      var v = {}; CAIXA.forEach(function(r){ v[r.data.slice(0,7)] = 1; });
      var ms = Object.keys(v).sort().reverse();
      var ag = hoje().slice(0,7);
      if (ms.indexOf(ag) === -1) ms.unshift(ag);
      return ms;
    },
    listarCaixa: function(pin, mes){
      exigirPin(pin);
      var doMes = CAIXA.filter(function(r){ return r.data.slice(0,7) === mes; });
      var entrou = 0, saiu = 0;
      doMes.forEach(function(r){ if (r.tipo === 'Entrada') entrou += r.valor; else saiu += r.valor; });
      var acc = 0;
      CAIXA.forEach(function(r){
        if (r.data.slice(0,7) > mes) return;
        acc += (r.tipo === 'Entrada' ? r.valor : -r.valor);
      });
      doMes.sort(function(a,b){ return a.data === b.data ? b.linha - a.linha : (a.data < b.data ? 1 : -1); });
      return { mes:mes, lancamentos:doMes.slice(), entrou:entrou, saiu:saiu,
               doMes:entrou-saiu, acumulado:acc,
               categorias:{Entrada:CAT_ENTRADA, 'Saída':CAT_SAIDA}, fontes:fontesUsadas() };
    },
    lancarCaixa: function(pin, d){
      exigirPin(pin);
      var tipo = d.tipo === 'Entrada' ? 'Entrada' : (d.tipo === 'Saída' ? 'Saída' : '');
      if (!tipo) throw new Error('Diga se é entrada ou saída.');
      var valor = valorNumero(d.valor);
      if (!(valor > 0)) throw new Error('Escreva um valor maior que zero.');
      CAIXA.push({ registro:'', data:d.data || hoje(), tipo:tipo, valor:valor,
        categoria:d.categoria || 'Outro', descricao:d.descricao || '', fonte:d.fonte || '',
        comprovante: d.foto ? 'https://drive.google.com/mock' : '',
        quem:d.quem || '', linha: proximaLinha++ });
      return { ok:true, comFoto: !!d.foto, pediuFoto: !!d.foto };
    },
    apagarLancamento: function(pin, linha, valorConfere){
      exigirPin(pin);
      var i = CAIXA.findIndex(function(r){ return String(r.linha) === String(linha); });
      if (i === -1) throw new Error('Lançamento não encontrado.');
      if (valorConfere !== undefined && Math.abs(CAIXA[i].valor - Number(valorConfere)) > 0.005)
        throw new Error('A lista mudou desde que você abriu. Recarregue e tente de novo.');
      CAIXA.splice(i,1); return {ok:true};
    },
    resumoCaixa: function(pin, ini, fim){
      exigirPin(pin);
      if (ini > fim) throw new Error('A data de início vem depois da data de fim.');
      var doP = CAIXA.filter(function(r){ return r.data >= ini && r.data <= fim; });
      var cat = {Entrada:{}, 'Saída':{}}, fon = {}, entrou = 0, saiu = 0, sem = 0;
      doP.forEach(function(r){
        var lado = r.tipo === 'Entrada' ? 'Entrada' : 'Saída';
        cat[lado][r.categoria] = (cat[lado][r.categoria] || 0) + r.valor;
        var f = r.fonte || 'Sem fonte informada';
        if (!fon[f]) fon[f] = {fonte:f, entrou:0, saiu:0};
        if (lado === 'Entrada'){ fon[f].entrou += r.valor; entrou += r.valor; }
        else { fon[f].saiu += r.valor; saiu += r.valor; if (!r.comprovante) sem++; }
      });
      function ord(m){ return Object.keys(m).map(function(k){ return {nome:k, valor:m[k]}; })
        .sort(function(a,b){ return b.valor - a.valor; }); }
      return { inicio:ini, fim:fim, entrou:entrou, saiu:saiu, saldo:entrou-saiu,
               lancamentos:doP.length, semComprovante:sem,
               entradas:ord(cat.Entrada), saidas:ord(cat['Saída']),
               fontes:Object.keys(fon).map(function(k){ return fon[k]; })
                 .sort(function(a,b){ return (b.entrou+b.saiu)-(a.entrou+a.saiu); }) };
    },
    obterLinkPlanilha: function(pin){
      exigirPin(pin);
      return { url:'https://docs.google.com/spreadsheets/d/1EXEMPLO000000000000000000000/edit',
               nome:'Frequência — Veridiana' };
    },
    arrumarPlanilha: function(pin){ exigirPin(pin); return {ok:true, mensagem:'Planilha arrumada.'}; },

    mesesComChamada: function(pin){
      exigirPin(pin);
      var v = {};
      CHAMADAS.forEach(function(c){ v[c.data.slice(0,7)] = 1; });
      return Object.keys(v).sort().reverse();
    },
    atualizarAluno: function(pin, nome, turma, dados){
      exigirPin(pin);
      var a = acharAluno(nome, turma), d = dados || {};
      a.nascimento = d.nascimento || '';
      a.responsavel = d.responsavel || '';
      a.telefone = (d.telefone || '').replace(/[^0-9]/g,'');
      return {ok:true};
    },
    alunosEmRisco: function(pin, minimo){
      exigirPin(pin);
      var alvo = Math.max(2, Number(minimo) || 3);
      var datas = {}, st = {};
      REGISTROS.forEach(function(r){
        if (!datas[r.turma]) datas[r.turma] = {};
        datas[r.turma][r.data] = 1;
        st[r.turma+'|'+r.aluno+'|'+r.data] = r.status;
      });
      Object.keys(datas).forEach(function(t){
        datas[t] = Object.keys(datas[t]).sort().reverse();
      });
      var fora = [];
      ALUNOS.forEach(function(a){
        if (!a.ativo) return;
        var ds = datas[a.turma];
        if (!ds || !ds.length) return;
        var seguidas=0, just=0, ult='', desde='';
        for (var i=0;i<ds.length;i++){
          var x = st[a.turma+'|'+a.nome+'|'+ds[i]];
          if (x === undefined) break;
          if (x === 'Presente'){ ult = ds[i]; break; }
          seguidas++; if (x === 'Justificada') just++;
          desde = ds[i];
        }
        if (seguidas >= alvo) fora.push({ aluno:a.nome, turma:a.turma, faltas:seguidas,
          justificadas:just, desde:desde, ultimaPresenca:ult,
          responsavel:a.responsavel, telefone:a.telefone, idade:idadeEm(a.nascimento) });
      });
      fora.sort(function(x,y){ return y.faltas - x.faltas || pt(x.aluno,y.aluno); });
      return { minimo:alvo, alunos:fora };
    },
    contarRisco: function(pin){ return API.alunosEmRisco(pin, 3).alunos.length; },
    aniversariantesSemana: function(pin){ exigirPin(pin); return aniversariosEntre(0, 6, ''); },
    relatorioPeriodo: function(pin, ini, fim){
      exigirPin(pin);
      if (ini > fim) throw new Error('A data de início vem depois da data de fim.');
      var linhas = REGISTROS.filter(function(r){ return r.data >= ini && r.data <= fim; });
      var ben = {}, aulas = {}, pt2 = {};
      linhas.forEach(function(r){
        ben[r.aluno] = 1; aulas[r.data+'|'+r.turma] = 1;
        if (!pt2[r.turma]) pt2[r.turma] = {turma:r.turma, dias:{}, alunos:{}, presentes:0, total:0};
        var t = pt2[r.turma];
        t.dias[r.data]=1; t.alunos[r.aluno]=1; t.total++;
        if (r.status==='Presente') t.presentes++;
      });
      var idades = {};
      ALUNOS.forEach(function(a){ idades[a.nome] = idadeEm(a.nascimento); });
      var faixas = {'Crianças (até 11)':0,'Adolescentes (12 a 17)':0,'Jovens (18 a 29)':0,'Sem data de nascimento':0};
      Object.keys(ben).forEach(function(n){
        var i = idades[n];
        if (i === null || i === undefined) faixas['Sem data de nascimento']++;
        else if (i <= 11) faixas['Crianças (até 11)']++;
        else if (i <= 17) faixas['Adolescentes (12 a 17)']++;
        else faixas['Jovens (18 a 29)']++;
      });
      var turmas = Object.keys(pt2).map(function(k){
        var t = pt2[k];
        return {turma:t.turma, aulas:Object.keys(t.dias).length, alunos:Object.keys(t.alunos).length,
                presentes:t.presentes, total:t.total,
                pct: t.total ? Math.round(t.presentes*100/t.total) : 0};
      }).sort(function(a,b){ return pt(a.turma,b.turma); });
      var P=0,T=0; turmas.forEach(function(t){ P+=t.presentes; T+=t.total; });
      return { inicio:ini, fim:fim, completo:true, beneficiarios:Object.keys(ben).length,
               aulas:Object.keys(aulas).length, turmas:turmas, faixas:faixas,
               frequencia: T ? Math.round(P*100/T) : 0 };
    },
    resumoHistorico: function(pin, mes){
      exigirPin(pin);
      var doMes = REGISTROS.filter(function(r){ return r.data.slice(0,7) === mes; });
      var mapa = {}, porTurma = {};
      doMes.forEach(function(r){
        var k = r.data + '|' + r.turma;
        if (!mapa[k]) mapa[k] = {data:r.data, turma:r.turma, professor:r.professor, presentes:0, total:0};
        mapa[k].total++;
        if (r.status === 'Presente') mapa[k].presentes++;
        if (!porTurma[r.turma]) porTurma[r.turma] = {turma:r.turma, dias:{}, presentes:0, total:0};
        porTurma[r.turma].dias[r.data] = 1;
        porTurma[r.turma].total++;
        if (r.status === 'Presente') porTurma[r.turma].presentes++;
      });
      var aulas = Object.keys(mapa).map(function(k){ return mapa[k]; });
      aulas.sort(function(a,b){ return a.data===b.data ? pt(a.turma,b.turma) : (a.data<b.data?1:-1); });
      var turmas = Object.keys(porTurma).map(function(k){
        var t = porTurma[k];
        return {turma:t.turma, aulas:Object.keys(t.dias).length, presentes:t.presentes,
                total:t.total, pct: t.total ? Math.round(t.presentes*100/t.total) : 0};
      }).sort(function(a,b){ return pt(a.turma,b.turma); });
      var P=0, T=0;
      turmas.forEach(function(t){ P+=t.presentes; T+=t.total; });
      return { mes:mes, aulas:aulas, turmas:turmas,
               totais:{ aulas:aulas.length, presentes:P, marcacoes:T,
                        pct: T ? Math.round(P*100/T) : 0 } };
    }
  };

  var ABERTAS_SESSAO = { modulo:1, resumoInicial:1, listarAgenda:1, listarAgendaAno:1, datasFixas:1,
    listarMateriais:1, listarCategorias:1, listarLocais:1, listarTurmas:1, carregarTurma:1, salvarChamada:1 };

  /* ─── a ponte, igualzinha à do Apps Script ─── */
  function Corredor(ok, err){ this._ok = ok; this._err = err; }
  Corredor.prototype.withSuccessHandler = function(f){ return new Corredor(f, this._err); };
  Corredor.prototype.withFailureHandler = function(f){ return new Corredor(this._ok, f); };
  Object.keys(API).forEach(function(nome){
    Corredor.prototype[nome] = function(){
      var args = [].slice.call(arguments), ok = this._ok, err = this._err;
      var espera = CFG.atraso + Math.random() * CFG.atraso * 0.6;
      setTimeout(function(){
        if (CFG.offline){ if (err) err(new Error('Falha na rede.')); return; }
        if (CFG.falha && Math.random() < CFG.falha){
          if (err) err(new Error('Falha de rede simulada.')); return;
        }
        var r;
        try {
          /* No servidor de verdade estas recebem a sessão na frente e
             conferem. Aqui confere e tira, e a função segue igual. */
          if (ABERTAS_SESSAO[nome]){
            var u = exigirSessao(args[0]);
            args = args.slice(1);
            if (nome === 'resumoInicial') args = [u.nome];
            if (nome === 'modulo' && args[0] === 'gestao' && u.papel !== 'Gestão')
              throw new Error('Só a gestão pode abrir essa parte.');
          }
          r = API[nome].apply(null, args);
        }
        catch (e){ if (err) err(e); return; }
        if (ok) ok(JSON.parse(JSON.stringify(r)));
      }, espera);
      console.log('[mock] ' + nome, args);
    };
  });

  window.google = {
    script: {
      get run(){ return new Corredor(null, null); },
      url: {
        getLocation: function(cb){
          setTimeout(function(){
            var p = {};
            P.forEach(function(v,k){ p[k] = v; });
            cb({ parameter:p, parameters:{}, hash:'' });
          }, 60);
        }
      },
      host: { close: function(){}, setHeight: function(){}, origin:'' }
    }
  };

  /* ─── painel de rede, só com ?dev=1 ─── */
  if (P.get('dev') === '1'){
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:9999;background:#1B1020;color:#fff;'+
      'font:12px/1.4 system-ui;padding:10px 12px;border-radius:10px;opacity:.94;max-width:190px';
    d.innerHTML = '<b>mock</b><br>' +
      '<label><input type="radio" name="rd" checked> boa (420ms)</label><br>' +
      '<label><input type="radio" name="rd"> 4G ruim (2.5s, 25% falha)</label><br>' +
      '<label><input type="radio" name="rd"> offline</label><br>' +
      '<span style="opacity:.6">vera@exemplo.org / veridiana</span>';
    /* O mock roda no <head>: o body ainda não existe. */
    if (document.body) document.body.appendChild(d);
    else document.addEventListener('DOMContentLoaded', function(){ document.body.appendChild(d); });
    var rs = d.querySelectorAll('input');
    rs[0].onchange = function(){ CFG = {atraso:420, falha:0, offline:false}; };
    rs[1].onchange = function(){ CFG = {atraso:2500, falha:.25, offline:false}; };
    rs[2].onchange = function(){ CFG = {atraso:300, falha:0, offline:true}; };
  }
})();
