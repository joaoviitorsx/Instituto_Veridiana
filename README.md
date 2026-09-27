<h1 align="center">Chamada — Instituto Veridiana</h1>

<p align="center">
  Registro de frequência para um projeto social de dança no Jangurussu,
  em Fortaleza (CE).<br>
  Google Apps Script + planilha do Google. Sem servidor, sem build, sem custo.
</p>

<p align="center">
  <img src="assets/chamada.png" width="240" alt="Tela de chamada">
  <img src="assets/evasao.png" width="240" alt="Alunos que faltaram três aulas seguidas">
  <img src="assets/relatorio.png" width="240" alt="Relatório para edital">
</p>

---

## O problema

O Instituto Veridiana atende crianças e jovens em situação de
vulnerabilidade social pelos projetos *Sonho de Dançar* (3 a 12 anos) e
*Cia Corpo Identidade* (13 a 28 anos). Cerca de 20 professores, a maioria
voluntária. O instituto se mantém com bazar, doações e editais.

A chamada era feita no papel e digitada depois — quando era digitada.
Sem registro confiável, duas coisas aconteciam:

- O instituto não conseguia **comprovar atendimento em edital**, que é de
  onde vem o dinheiro.
- Criança que parava de vir só era notada **semanas depois**, quando
  faltar já tinha virado hábito.

---

## O fluxo

Cada turma tem um QR code colado na parede da sala. O professor escaneia,
a lista abre com **todos já marcados como presentes**, ele toca só em quem
faltou, confirma o próprio nome e salva.

> **A métrica que decidiu tudo: uma turma de 20 alunos com 3 faltas em 5
> toques.** Três nos ausentes, um no professor, um em salvar. Qualquer
> proposta que aumentasse esse número foi recusada, por mais bonita que
> fosse.

<p align="center">
  <img src="assets/chamada.png" width="230" alt="Lista com faltas marcadas">
  <img src="assets/salvo.png" width="230" alt="Confirmação de chamada salva">
  <img src="assets/qr.png" width="230" alt="QR code da turma">
</p>

Presença é o padrão e fica silenciosa: um visto verde discreto. Falta
grita — fundo rosa, avatar vermelho, selo escrito. Numa sala barulhenta,
com o celular na mão, o olho acha as três faltas sem procurar.

---

## A entrada

O QR da parede continua abrindo **direto** na lista de chamada, sem
nenhuma tela no meio. A tela inicial só aparece para quem abre o app
sem `?turma=`: saudação, a data, um cartão com a aula que deve estar
começando (ou o evento de hoje) e a grade de seções, cada uma com um
número de verdade — "6 turmas", "próximo: Dia da Dança, 29/04", "127 itens".

A "próxima aula" não depende de grade de horário cadastrada: sai da hora
em que cada turma costuma ter a chamada salva, no mesmo dia da semana,
nas últimas 5 semanas. Isso é circular no começo — depende de chamadas
que ainda não existem —, então o cartão só aparece com padrão firme
(3 aulas na mesma hora) e sem empate entre turmas. Na dúvida, não
aparece: cartão errado na primeira tela custa mais que cartão nenhum.

**Login.** Cada pessoa da equipe entra com e-mail e senha. O app sabe
quem está com o celular na mão: a saudação usa o primeiro nome e a
chamada já vem com a professora escolhida — de 5 para 4 toques. A
sessão fica guardada no aparelho por 30 dias quando o navegador deixa;
quando não deixa, o app pede a senha de novo. QR da parede sem sessão
abre o login e, depois dele, a chamada da turma.

## Agenda anual

A coordenação monta o planejamento do ano, **imprime um calendário** e
escreve nele à mão. A agenda não compete com o papel: alimenta o papel.
Lista por mês, visão do ano com a contagem de cada mês, datas fixas para
pré-carregar em janeiro, e o **calendário em PDF, A4 deitado**, uma
página por trimestre, com espaço em branco em cada dia para escrever.

Só o Dia Internacional da Dança está nas datas fixas. As demais esperam
confirmação da coordenação (`DATAS_FIXAS` em `Agenda.gs`) — lista
genérica de internet vira ruído que ela teria que limpar.

## Materiais

Estrutura fixa, categorias livres. Os campos são sempre os mesmos;
categoria e local ela cria digitando, no próprio cadastro. Atalhos com
número no topo: **para o bazar** e **precisa reparo**. Mais e menos na
ficha do item. Item descartado nunca é apagado.

Fora da v1, de propósito: histórico de quem pegou, foto, código de barras
e valor patrimonial. Cadastro lento não acontece.

## Além da chamada

### Caixa

<img src="assets/caixa.png" width="250" align="right" alt="Fluxo de caixa do mês">

Entrada e saída do celular, entre uma aula e outra. Dois botões grandes,
valor, categoria, salvar.

Cada lançamento carrega uma **fonte**. Não é burocracia: o instituto vive
de edital, e prestação de contas exige mostrar de qual bolso saiu cada
real. Dinheiro de edital misturado com doação num pote só é o que faz a
prestação ser recusada.

Na saída dá para **fotografar a nota na hora**. A foto é reduzida no
próprio celular antes de subir — 4 MB em 4G instável não chegam, e o
comprovante é justamente o que não pode faltar.

O resumo do período soma por categoria e por fonte, e avisa quantas
saídas estão sem nota.

<br clear="right">

<p align="center">
  <img src="assets/caixa-lancar.png" width="240" alt="Lançar uma saída">
  <img src="assets/caixa-resumo.png" width="240" alt="Resumo para prestação de contas">
</p>

### Certificado de participação

<img src="assets/certificado-pdf.png" width="250" align="right" alt="Certificado gerado em PDF">

Uma menina de 17 anos aqui não tem nada no papel. Sem currículo, sem
certificado, sem comprovante de nada.

O instituto tem, na planilha, o registro exato: desde quando ela vem,
quantas aulas frequentou, em quais turmas. **É o único lugar do mundo que
consegue emitir esse documento** — e até agora ele não existia.

Serve para currículo de Jovem Aprendiz, atividade complementar na escola
e comprovação de vínculo em programa social.

O PDF sai com um toque, com link pronto para mandar no WhatsApp da
família. Ou a turma inteira de uma vez, uma página por aluna, para
imprimir e entregar no fim do ano.

<br clear="right">

<p align="center">
  <img src="assets/certificados.png" width="240" alt="Lista de alunas com aulas e horas">
  <img src="assets/certificado-envio.png" width="240" alt="Certificado pronto para enviar">
</p>

> O certificado individual sai com link público, para o PDF abrir no
> celular da família, que não tem conta Google. O da turma inteira **não**
> — teria o nome de 20 crianças num link aberto. Esse fica só no Drive,
> para imprimir.

### Precisam de atenção

<img src="assets/evasao.png" width="260" align="right" alt="Tela de evasão">

Lista quem faltou **3 aulas seguidas** da própria turma. O botão abre o
WhatsApp do responsável com a mensagem já escrita.

Três faltas consecutivas é o mesmo gatilho que a busca ativa usa na rede
pública de ensino. O dado já era coletado desde o primeiro dia — faltava
alguém ler.

Se o aluno não tem telefone cadastrado, o cartão vira um atalho para
cadastrar na hora, em vez de só informar o problema.

<br clear="right">

### Relatório para edital

<img src="assets/relatorio.png" width="260" align="left" alt="Relatório do período">

Escolhe o período e sai o que a prestação de contas pede: beneficiários
únicos atendidos, aulas realizadas, frequência média e faixa etária no
recorte do ECA e do Estatuto da Juventude.

Um botão copia tudo em texto, pronto para colar no formulário do edital.

<br clear="left">

### Histórico e aniversários

<p align="center">
  <img src="assets/historico.png" width="240" alt="Histórico por mês">
  <img src="assets/gestao.png" width="240" alt="Menu de gestão com aniversariantes">
</p>

Histórico por dia e por mês, só leitura. Aniversariantes da semana no
menu, e o aniversário do dia aparece na tela da chamada — sem custar um
toque a mais. Para uma criança daqui, o instituto lembrar do aniversário
dela não é enfeite.

Caixa, cadastros, certificados e relatórios são só de quem tem o papel
**Gestão**. Professor nem vê esses botões.

---

## Decisões de projeto

**A planilha continua sendo a única fonte de verdade.** Nenhum banco de
dados externo. A responsável pelo instituto lê e conserta os dados
sozinha, e o histórico de versões do Google desfaz qualquer estrago. Foi
por isso que Supabase e Firebase foram descartados: tiram o dado de onde
ela sabe mexer, e o plano gratuito do Supabase ainda pausa o projeto
depois de 7 dias sem acesso — férias escolares derrubariam o sistema.

**Nada de gráfico dentro do app.** O painel de frequência vive na
planilha, com Tabela Dinâmica montada pelo próprio código. Duplicar cria
duas verdades, e a do app sempre fica pior.

**Aluno nunca é apagado.** Sai da chamada virando `Ativo = NAO`, para o
histórico dele não ficar órfão.

**Sem dependência externa.** Um único CDN, o do Google Fonts, e mesmo ele
carrega sem bloquear a primeira pintura. O encoder de QR foi escrito para
este projeto e conferido contra um leitor independente: 124 textos, com
round-trip completo e síndromes Reed-Solomon zeradas em todos os blocos.

**Alvo real:** Android intermediário, 4G instável, tela de 380px,
professores sem familiaridade com tecnologia. Toda área tocável tem no
mínimo 44px.

---

## Estrutura

```
apps-script/        cole estes 25 arquivos no editor do Apps Script
  Codigo.gs           constantes, doGet, montagem da página e módulos
  Util.gs             planilha, datas, cache e trava
  Inicio.gs           números da tela inicial e "próxima aula"
  Chamada.gs          o fluxo do QR
  Acesso.gs           login, senha, sessão e papéis
  Gestao.gs           turmas, alunos, professores
  Planilha.gs         link, padronização, Painel e menu
  Historico.gs        leitura do histórico por mês
  Impacto.gs          evasão, relatório de edital, aniversários
  Certificado.gs      certificado em PDF com carga horária
  Caixa.gs            entradas, saídas, comprovantes e resumo
  Agenda.gs           agenda anual e calendário em PDF
  Materiais.gs        lista de materiais
  Index.html          casca da página
  Estilo.html         CSS da casca, da entrada, da chamada e da gestão
  AppNucleo.html      estado, ícones, ponte, roteador, módulos sob demanda
  AppEntrada.html     login, troca de senha e sessão
  AppInicio.html      tela inicial
  AppChamada.html     telas da chamada
  AppPartida.html     lê a turma da URL, confere a sessão e abre a primeira tela
  AppGestao.html      telas da área da equipe          (sob demanda)
  AppCaixa.html       telas do fluxo de caixa          (sob demanda)
  AppQr.html          encoder de QR                    (sob demanda)
  AppAgenda.html      telas da agenda, com o CSS dela  (sob demanda)
  AppMateriais.html   telas de materiais, com o CSS    (sob demanda)

mock.js             mock do google.script.run, só para o navegador
.clasp.json.exemplo modelo para ligar o clasp (o .clasp.json fica fora do git)
gerar-preview.py    monta o preview.html
preview.html        abre no navegador, funciona sem servidor
assets/             telas do app
icones/             ícone do atalho na tela inicial
```

O `doGet` encaixa o CSS antes de `</head>` e os scripts antes de
`</body>`. Não usa template do Apps Script, então nenhum arquivo pode
conter a sequência de scriptlet.

**Peso.** A página que o `doGet` entrega leva só entrada e chamada:
73 KB (22 KB compactada), contra 126 KB de antes, quando tudo vinha junto.
Gestão, caixa, agenda e materiais chegam por `modulo()` na primeira vez
que alguém abre a seção — e a tela inicial já os baixa em segundo plano.
Quem escaneia o QR nunca baixa nenhum deles.

**Espera entre telas.** Cada ida ao Apps Script custa de meio a dois
segundos, e isso não se otimiza. O app evita esperar por ela:

- a tela inicial, já pintada, busca por trás os dados de Chamada,
  Agenda, Materiais e da turma do cartão; a lista de turmas busca as
  chamadas de cada turma antes do toque;
- tela já vista aparece na hora com o que tinha e repinta sozinha se o
  dado mudou; formulário e lista de chamada nunca são repintados (não
  apagam o que foi digitado ou marcado);
- qualquer gravação pelo app apaga essa memória; resposta de uma tela
  que a pessoa já deixou é descartada.

No preview (servidor simulado com 0,4–0,7 s), abrir Chamada, a turma,
Agenda e Materiais caiu de 0,5–0,7 s para o tempo do toque.

---

## Rodar sem instalar nada

Abra o **`preview.html`** no navegador. Ele já vem montado, com um mock do
`google.script.run` que só liga quando `window.google` não existe.

- `preview.html` — tela inicial
- `preview.html?turma=Jazz%20Juvenil` — como se viesse do QR da parede
- `preview.html?dev=1` — painel para simular 4G ruim e queda de rede
- Logins do preview (só valem aqui, nunca no app publicado):
  - `vera@exemplo.org` / `veridiana` — Gestão
  - `aline@exemplo.org` / `aline123` — Professor
  - `bruno@exemplo.org` / `temp2345` — Professor no primeiro acesso (pede senha nova)

Para regerar o `preview.html` depois de mexer em `apps-script/`:

```bash
python3 gerar-preview.py
```

`python3 gerar-preview.py --lazy teste.html` monta uma versão em que os
módulos chegam pelo mock, para testar o carregamento sob demanda.

---

## 1. Mandar o código para o Apps Script

> **Isto é tarefa de desenvolvedor, e só quando o código muda.** O
> instituto nunca faz nada desta seção: a manutenção dele é a planilha e
> o app. Cadastro, agenda, materiais, caixa — tudo pelo celular ou
> direto na planilha, sem abrir editor de script nenhum.

São 23 arquivos. Colar isso à mão é caminho garantido para erro (um
arquivo esquecido, um colado no lugar do outro). Use o
[`clasp`](https://github.com/google/clasp), a ferramenta de linha de
comando do próprio Google.

### Ligar o clasp (uma vez por máquina)

```bash
npm install -g @google/clasp
clasp login                       # abre o navegador, entre com a conta dona do script
```

No [painel do Apps Script](https://script.google.com/home/usersettings),
ligue **API do Google Apps Script**.

O ID do projeto está no editor, em **Configurações do projeto → ID do
script**. Copie o exemplo e cole o ID:

```bash
cp .clasp.json.exemplo .clasp.json   # e troque SEU_ID_DO_SCRIPT
```

O manifesto (`appsscript.json`: fuso, modo de app da Web) vem do projeto
que já existe. Baixe **numa pasta à parte** e traga só ele:

```bash
clasp clone SEU_ID_DO_SCRIPT --rootDir /tmp/veridiana-manifesto
cp /tmp/veridiana-manifesto/appsscript.json apps-script/
```

> **Nunca rode `clasp clone` ou `clasp pull` dentro deste repositório.**
> Eles sobrescrevem `apps-script/` com o que está no editor — ou seja,
> com o código velho.

Versione o `appsscript.json` depois disso. O `.clasp.json` fica fora do
git (cada máquina aponta para o seu projeto).

### Enviar

```bash
clasp push
```

O `push` troca **todos** os arquivos do projeto pelos de `apps-script/`,
e arquivo que só existe no editor é apagado. Ele atualiza a versão de
teste (`/dev`), **não** o link que os professores usam (`/exec`): o
`/exec` continua servindo a última versão implantada até alguém
publicar uma nova.

### Publicar com segurança

Autorização no Apps Script é **do projeto inteiro, não da função**. Se
o código novo usa um serviço que o dono ainda não autorizou (como o
`DocumentApp` do calendário, na v2), **toda execução** passa a exigir a
autorização nova — inclusive a chamada, que não tem nada a ver com
calendário. Publicar sem autorizar antes pode derrubar a chamada dos
professores por causa de um recurso que ninguém usou ainda.

A sequência:

1. `clasp push` (ou colar no editor e salvar)
2. Abrir a URL `/dev` do app, logado como dono — ela força o pedido de
   autorização
3. Aceitar o escopo novo
4. **Testar a chamada na `/dev`.** É essa a verificação que importa
5. Testar o recurso novo. Na v2: gerar o calendário em PDF, conferir
   que saiu em A4 deitado e **olhar o tempo** — aparece na folha de
   resultado ("pronto em 23 s") e no Registro de execução, separado em
   montar e exportar. Acima de 30 s, o Docs não vale a pena: ir para o
   plano B abaixo
6. Só então: **Implantar → Gerenciar implantações → ✏️ → Versão: Nova
   versão → Implantar**. Editar a implantação existente mantém o mesmo
   link `/exec` — e os QR impressos continuam valendo

**Se der errado depois de publicar:** Implantar → Gerenciar
implantações → ✏️ → em Versão, escolher a **anterior** → Implantar.
Trinta segundos, mesmo link `/exec`, QR da parede continuam valendo.
Saiba disso antes de publicar, não durante o problema.

> **Se o Docs der trabalho:** o plano B é montar o calendário numa aba
> temporária da própria planilha e exportar pela URL de exportação do
> Sheets (`portrait=false&size=A4`). Só que isso puxa o `UrlFetchApp`,
> que também é escopo novo. Só vale se o Docs realmente resistir.

### Sem clasp

Dá para colar à mão: no editor, **+** ao lado de "Arquivos" cria cada um.

**Script** (`+` → **Script**, nome sem `.gs`):
`Codigo` · `Util` · `Acesso` · `Inicio` · `Chamada` · `Gestao` · `Planilha` · `Historico` · `Impacto` · `Certificado` · `Caixa` · `Agenda` · `Materiais`

**HTML** (`+` → **HTML**, nome sem `.html`):
`Index` · `Estilo` · `AppNucleo` · `AppEntrada` · `AppInicio` · `AppChamada` · `AppPartida` · `AppGestao` · `AppCaixa` · `AppQr` · `AppAgenda` · `AppMateriais`

Em cada um: `Ctrl+A`, `Delete`, cole o arquivo de mesmo nome, `Ctrl+S`.
Depois, a mesma sequência de publicação acima.

> A ordem dos arquivos na lista não importa, **desde que** nenhum `.gs`
> use, no topo do arquivo (fora de função), constante de outro `.gs`. O
> Apps Script roda os arquivos na ordem da lista; referência cruzada no
> topo quebra o script inteiro quando a ordem muda.

### Primeira implantação

Em **Implantar → Nova implantação → Tipo: App da Web**:

- Executar como: **Eu**
- Quem pode acessar: **Qualquer pessoa**

"Executar como: eu" é o que permite o professor fazer chamada sem ter
acesso de edição à planilha. É também por isso que a autorização é só
do dono: professor nenhum vê tela de permissão.

Autorizações que o dono aceita ao longo do tempo: planilha (sempre),
Drive (certificado e comprovante do caixa), Documentos (calendário da
agenda — o Docs temporário vai para a lixeira logo depois).

---

## 2. Acessos: e-mail, senha e papel

Ninguém entra no app sem estar na aba `Professores` com e-mail. Cada
pessoa tem um papel:

- **Professor** — chamada, agenda e materiais (só consulta)
- **Gestão** — tudo: cadastros, caixa, certificados, relatórios, acessos

### O primeiro acesso da gestão

Sem ninguém cadastrado, ninguém entra. O primeiro é criado na planilha:

1. Abra a **planilha** (não o editor de script) e recarregue uma vez,
   para o menu **Veridiana** aparecer.
2. **Veridiana → Criar acesso da gestão**: nome e e-mail.
3. Aparece a **senha temporária**. Anote: ela não aparece de novo.
4. No app, entre com o e-mail e essa senha. Ele pede para criar a sua.

O mesmo menu serve se todo mundo da gestão perder a senha.

### O resto da equipe

No app: **Gestão → Equipe e acessos → Adicionar pessoa** (ou toque em
quem já está na lista → **Dar acesso ao app**). Nome, e-mail e papel. O
app mostra a senha temporária uma vez, com o botão **Enviar no
WhatsApp**. No primeiro acesso a pessoa escolhe a dela.

Esqueceu a senha? Na mesma lista: pessoa → **Gerar senha nova**. A
antiga para de valer na hora. **Tirar da equipe** derruba o acesso na
hora, inclusive em celular que já estava logado.

### Como a senha é guardada

A senha **não fica na planilha**: fica nas Script Properties, só como
hash com sal. Quem edita a planilha vê e-mail e papel, nunca senha.
Cinco senhas erradas seguidas travam aquele e-mail por 15 minutos.

O link `/exec` continua público — é o que permite o QR da parede. O que
mudou é que, sem login, ele não mostra nem grava nada: todo pedido ao
servidor confere a sessão, e os da gestão conferem o papel.

---

## 3. Ícone na tela inicial do celular

O app roda dentro de um iframe, e o "Adicionar à tela inicial" lê o ícone
da **página de fora**, que é do Google. No Android o `setFaviconUrl` do
Apps Script às vezes resolve. **No iPhone nunca resolve**: o Safari só
aceita ícone de atalho via `apple-touch-icon`, que não existe na página
do Google.

Por isso este repositório publica uma casca no **GitHub Pages**:

```
index.html      abre o app em tela cheia, com o ícone e o nome certos
manifest.json   Android
icones/         icon-180 (iOS), icon-192 e icon-512 (Android)
```

### Ligar

1. No `index.html`, coloque o link do seu app em `URL_APP`:

   ```javascript
   var URL_APP = 'https://script.google.com/macros/s/SEU_ID/exec';
   ```

2. Confirme que o `doGet` tem a linha que libera o embed — sem ela o
   iframe fica em branco:

   ```javascript
   .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
   ```

3. No GitHub: **Settings → Pages → Source: Deploy from a branch →
   `main` / `/ (root)`**.

O endereço fica `https://joaoviitorsx.github.io/Instituto_Veridiana/`.

### Instalar no celular

**iPhone:** abra no **Safari** (não funciona no Chrome do iOS) →
Compartilhar → **Adicionar à Tela de Início**.

**Android:** abra no Chrome → menu ⋮ → **Instalar aplicativo**.

O atalho abre em tela cheia, sem barra de endereço.

> O QR da parede pode continuar apontando direto para o `/exec`. Se
> preferir que passe pela casca, use
> `.../Instituto_Veridiana/?turma=Jazz%20Juvenil` — o `?turma=` é
> repassado para dentro.

## 4. QR de cada turma e link de cada professor

Tela inicial → **Gestão** → **QR e links**. Aba **QR das turmas**: escolha
a turma. Aba **Link por professor**: escolha a pessoa e mande pelo
WhatsApp; ela abre, faz login e adiciona à tela inicial do celular.

O endereço do app é descoberto sozinho. Se aparecer o aviso de que falta o
endereço, use **Veridiana → Configurar endereço do app** e cole o link que
termina em `/exec`.

O QR é gerado dentro do próprio app, sem serviço de fora. Nenhum site de
terceiro pode sair do ar e deixar você sem reimprimir o cartaz.

Para imprimir: abra a tela do QR no computador e mande imprimir. Sai só o
cartaz, no tamanho A5.

---

## 5. Abas da planilha

| Aba | Colunas |
|---|---|
| `Alunos` | Turma, Aluno, Ativo (SIM/NAO), Nascimento, Responsável, Telefone |
| `Professores` | Professor, E-mail, Papel (Professor/Gestão) |
| `Chamadas` | Registro, Data, Turma, Professor, Aluno, Status |
| `Turmas` | Turma, Ativa (SIM/NAO), Minutos por aula |
| `Caixa` | Registro, Data, Tipo, Valor, Categoria, Descrição, Fonte, Comprovante, Quem registrou |
| `Agenda` | ID, Data, DataFim, Titulo, Tipo, Turmas, Local, Status, Observacao |
| `Materiais` | ID, Item, Categoria, Finalidade, Quantidade, Estado, Local, Observacao, Ativo |

`Chamadas`, `Turmas`, `Agenda` e `Materiais` nascem sozinhas no primeiro uso.
Linha digitada direto na planilha, sem ID, ganha um na primeira leitura.

> **Mexeu direto na planilha? O app demora alguns minutos para ver.**
> Para abrir rápido, o servidor guarda o que leu: 10 minutos para os
> números da tela inicial, 5 minutos para as listas de dentro (turmas,
> alunos, agenda, materiais, histórico). Qualquer mudança feita **pelo
> app** — inclusive chamada salva — atualiza na hora. Mudança feita
> direto na planilha, ou pelo menu Veridiana, só aparece quando esse
> prazo vence. Não é bug.

> **Saldo fora da tela inicial.** A tela inicial abre sem código e o QR
> fica numa parede por onde passam adolescentes, então o saldo do caixa
> não aparece nela (`MOSTRAR_SALDO_NA_ENTRADA = false` em `Inicio.gs`).
> Continua dentro do Caixa, só para a gestão.

`Turmas` foi acrescentada porque turma criada sem nenhum aluno não tinha
onde existir nas três abas originais, e "arquivar turma" precisa guardar
que ela saiu de circulação.

Aluno que sai **nunca** é apagado: vira `NAO` na coluna Ativo. Apagar a
linha deixa o histórico dele órfão na aba Chamadas.
