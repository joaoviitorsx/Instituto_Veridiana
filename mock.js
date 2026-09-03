/* ══════════════════════════════════════════════════════════════
   Mock do google.script.run — SÓ PARA ABRIR NO NAVEGADOR.
   Não vai para o Apps Script. O gerar-preview.sh injeta este
   arquivo no topo do Index.html e cria o preview.html.

   Ativa apenas quando window.google não existe.

   Abra assim:
     preview.html                      -> tela de escolher turma
     preview.html?turma=Jazz%20Juvenil -> como se viesse do QR
     preview.html?dev=1                -> painel de rede e falhas
   Código da gestão no mock: 1234
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

  var TOKENS = {};
  var PIN = '1234';
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
  function exigirPin(p){ if (String(p) !== PIN) throw new Error('Código errado. Tente de novo.'); }
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
    adicionarProfessor: function(pin, nome){
      exigirPin(pin); var n = exigirNome(nome);
      if (PROFS.some(function(p){ return chave(p)===chave(n); }))
        throw new Error('Esse professor já está na equipe.');
      PROFS.push(n); return {ok:true};
    },
    removerProfessor: function(pin, nome){
      exigirPin(pin);
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
                   desde: x ? x.primeira : '',
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
        quantidade: comAula.length,
        aluno: comAula.length === 1 ? comAula[0] : '',
        publico: comAula.length === 1,
        ignorados: lista.filter(function(n){ return comAula.indexOf(n) === -1; }) };
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
      return { inicio:ini, fim:fim, beneficiarios:Object.keys(ben).length,
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
        try { r = API[nome].apply(null, args); }
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
      '<span style="opacity:.6">PIN 1234</span>';
    document.body.appendChild(d);
    var rs = d.querySelectorAll('input');
    rs[0].onchange = function(){ CFG = {atraso:420, falha:0, offline:false}; };
    rs[1].onchange = function(){ CFG = {atraso:2500, falha:.25, offline:false}; };
    rs[2].onchange = function(){ CFG = {atraso:300, falha:0, offline:true}; };
  }
})();
