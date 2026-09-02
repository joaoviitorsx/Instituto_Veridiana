/**
 * Chamada — Instituto Veridiana
 * Web app de frequência ligado a uma planilha do Google.
 *
 * Abas esperadas na planilha:
 *   Alunos      -> A: Turma | B: Aluno | C: Ativo (SIM/NAO)
 *   Professores -> A: Professor
 *   Chamadas    -> A: Registro | B: Data | C: Turma | D: Professor | E: Aluno | F: Status
 *
 * A aba Chamadas é criada automaticamente no primeiro uso.
 *
 * O QUE MUDOU E POR QUÊ
 *
 * 1. doGet usa createHtmlOutputFromFile, não createTemplateFromFile.
 *    O Index.html deixa de ser template, então a sequência de scriptlet
 *    não precisa existir no HTML. A turma passa a ser lida no cliente
 *    com google.script.url.getLocation().
 *
 * 2. O viewport ganhou viewport-fit=cover. Sem isso env(safe-area-inset-*)
 *    vale sempre 0 e o CSS que respeita entalhe e barra de gestos do
 *    Android é código morto que parece certo.
 *
 * 3. salvarChamada devolve { ok, turma, professor, presentes, faltas, total }.
 *    A versão anterior devolvia { ok, mensagem } e a tela de sucesso lia
 *    r.turma / r.presentes / r.total. Toda chamada salva terminava em
 *    "undefined · undefined de undefined presentes".
 *
 * 4. Proteção contra gravação duplicada por token. Em 4G instável a
 *    resposta se perde depois da gravação; o professor toca "Tentar de
 *    novo" e a turma inteira entra duas vezes. O token fica no
 *    CacheService por 6 h — a aba Chamadas continua com 6 colunas.
 *
 * 5. carregarTurma lê no máximo as últimas 800 linhas de Chamadas.
 *    getDataRange() na aba inteira cresce ~20 linhas por turma por dia:
 *    em um ano são dezenas de milhares de células lidas a cada abertura.
 *
 * 6. carregarTurma sugere quem deu essa turma da última vez, para o
 *    professor não precisar se procurar numa lista de 20 nomes.
 */

const ABA_ALUNOS = 'Alunos';
const ABA_PROFESSORES = 'Professores';
const ABA_CHAMADAS = 'Chamadas';
const FUSO = 'America/Fortaleza';
const JANELA_BUSCA = 500;   // linhas recentes lidas em Chamadas
const TTL_TOKEN = 21600;    // 6 h de proteção contra gravação duplicada
const TTL_CACHE = 300;      // 5 min de cache das listas

/**
 * ÍCONE DO ATALHO NA TELA INICIAL
 *
 * O app roda dentro de um iframe. O "Adicionar à tela inicial" do Chrome
 * lê o ícone da PÁGINA DE FORA, que é do Google, não do nosso HTML.
 * Um <link rel="icon"> dentro do Index.html não muda nada.
 * setFaviconUrl é o único jeito de mexer nessa página de fora.
 *
 * Precisa ser uma URL pública de imagem. Passo a passo no LEIA-ME.md:
 * suba icones/icone-512.png no Drive, deixe "qualquer pessoa com o link",
 * pegue o ID e monte https://lh3.googleusercontent.com/d/SEU_ID
 *
 * Enquanto estiver vazio o Chrome usa a letra inicial num quadradinho.
 */
const URL_ICONE = '';

/* As partes entram nesta ordem. AppPartida chama iniciar() e por isso
   é a última. */
const PARTES = ['AppNucleo', 'AppChamada', 'AppGestao', 'AppQr', 'AppPartida'];

function doGet() {
  let html = arquivo('Index');
  conferirCasca(html);
  html = inserirAntes(html, '</head>', arquivo('Estilo'));
  html = inserirAntes(html, '</body>', PARTES.map(arquivo).join('\n'));

  const pagina = HtmlService.createHtmlOutput(html)
    .setTitle('Chamada Veridiana')
    .addMetaTag('viewport',
      'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
  if (URL_ICONE) pagina.setFaviconUrl(URL_ICONE);
  return pagina;
}

function arquivo(nome) {
  return HtmlService.createHtmlOutputFromFile(nome).getContent();
}

/* Encaixa antes de uma tag de verdade. Comentário de HTML como marcador
   depende do arquivo chegar intacto; </head> e </body> sempre chegam. */
function inserirAntes(alvo, tag, conteudo) {
  const i = alvo.lastIndexOf(tag);
  if (i === -1) throw new Error('O Index.html precisa ter a tag ' + tag + '.');
  return alvo.slice(0, i) + conteudo + '\n' + alvo.slice(i);
}

/* Diz em português qual arquivo está errado, em vez de deixar a página
   sair pela metade. */
function conferirCasca(html) {
  if (html.indexOf('id="palco"') === -1) {
    throw new Error('O arquivo Index.html do projeto não é a casca nova. ' +
      'Cole nele o Index.html da pasta apps-script.');
  }
  if (html.indexOf('<style') !== -1 || html.indexOf('function iniciar') !== -1) {
    throw new Error('O Index.html do projeto ainda é o arquivo antigo inteiro. ' +
      'Ele agora tem só 50 linhas: o CSS mora em Estilo.html e o JS nos arquivos App*.html.');
  }
}

/**
 * Rode esta função no editor (escolha "diagnostico" e clique Executar)
 * e depois abra o Registro de execução. Ela mostra o que o servidor
 * realmente recebe de cada arquivo.
 */
function diagnostico() {
  const nomes = ['Index', 'Estilo', 'AppNucleo', 'AppChamada', 'AppGestao', 'AppQr', 'AppPartida'];
  nomes.forEach(function (n) {
    try {
      Logger.log(n + ': ' + arquivo(n).length + ' caracteres');
    } catch (e) {
      Logger.log(n + ': NAO EXISTE — crie este arquivo HTML no projeto');
    }
  });
  const idx = arquivo('Index');
  Logger.log('---');
  Logger.log('Index tem </head>        : ' + (idx.indexOf('</head>') !== -1));
  Logger.log('Index tem </body>        : ' + (idx.indexOf('</body>') !== -1));
  Logger.log('Index tem id=palco       : ' + (idx.indexOf('id="palco"') !== -1));
  Logger.log('Index tem <!--ESTILO-->  : ' + (idx.indexOf('<!--ESTILO-->') !== -1) +
             '   <- se der false, o HtmlService apagou o comentario');
}
