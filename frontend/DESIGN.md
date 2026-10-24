# Guia de interface — PWA Veridiana

O app é usado quase só no celular, por gente que não tem intimidade com
tecnologia, num Android intermediário com 4G instável. Este guia junta o
que as referências de interface mobile dizem e como cada regra virou
código aqui. Mudou um padrão? Mude aqui também.

## Referências usadas

- Apple Human Interface Guidelines — [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars),
  [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables),
  [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets),
  [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- Material Design 3 (via Material Components) — [Navigation bar](https://github.com/material-components/material-components-android/blob/master/docs/components/BottomNavigation.md),
  [Top app bar](https://github.com/material-components/material-components-android/blob/master/docs/components/TopAppBar.md),
  [FAB](https://github.com/material-components/material-components-android/blob/master/docs/components/FloatingActionButton.md),
  [Bottom sheet](https://github.com/material-components/material-components-android/blob/master/docs/components/BottomSheet.md),
  [Compose navigation bar](https://developer.android.com/develop/ui/compose/components/navigation-bar)
- web.dev — [App design (Learn PWA)](https://web.dev/learn/pwa/app-design), [App-like PWAs](https://web.dev/articles/app-like-pwas)
- Chrome — [View Transitions em SPA](https://developer.chrome.com/docs/web-platform/view-transitions/same-document)
- Steven Hoober / Smashing — [The Thumb Zone](https://www.smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users/),
  [Basic patterns for mobile navigation](https://www.smashingmagazine.com/2017/05/basic-patterns-mobile-navigation/),
  Addy Osmani — [Touch-friendly design](https://addyosmani.com/blog/touch-friendly-design/)
- NN/g — estudo de navegação escondida (hambúrguer): menos descoberta e tarefas mais lentas do que navegação visível

## As regras, e onde elas moram

### 1. Navegação principal sempre visível, embaixo
*Fontes: HIG Tab bars; M3 Navigation bar (3 a 5 destinos); NN/g; Smashing 2017.*

- Barra de abas no rodapé com **5 destinos**: Início, Chamada, Agenda, Caixa, Gestão.
  O resto (Materiais, Certificados) está na grade do Início e no menu da Gestão.
- **Rótulo sempre visível em todas as abas.** O padrão do Material esconde o
  rótulo das abas inativas com 4 ou mais itens; aqui não, porque ícone
  sozinho falha na "regra dos cinco segundos" para quem não é de tecnologia.
- A barra aparece só nas 5 telas raiz. Tela de detalhe ou de tarefa
  (lista de chamada, formulário) esconde a barra e mostra voltar + ação.
- Aba ativa: ícone dentro de uma pílula de 56×32 (indicador do M3), cor roxa,
  rótulo em negrito. Altura 64 + área segura do sistema.
- Tocar na aba em que já está rola a tela para o topo.
- Sem menu hambúrguer.

`src/ui/Abas.tsx`, `src/ui/Tela.tsx`

### 2. Título grande que encolhe ao rolar
*Fontes: HIG (large title nas telas de topo, vira título pequeno ao rolar); M3 Top app bar (small ao rolar, "lift on scroll").*

- Barra de topo clara (fundo do app com desfoque), não mais roxa em toda tela.
  O roxo virou cor de marca e de ação, não de moldura: cabeçalho roxo em
  todas as telas pesava e competia com os botões principais, que também são roxos.
- Telas raiz: título grande (28px) no conteúdo; ao rolar, ele some e o
  título pequeno aparece na barra, que ganha um fio embaixo.
- O Início mantém a capa roxa: é a identidade do instituto e a primeira tela.
- `theme-color` acompanha a tela: roxo no Início, claro nas demais (barra de
  status do Android sem emenda).

`src/ui/Tela.tsx`

### 3. Ação principal ao alcance do polegar
*Fontes: Hoober/Smashing (ações frequentes na zona fácil; fechar/confirmar embaixo); M3 FAB (uma ação principal por tela).*

- Tela de tarefa: barra de ação fixa no rodapé, botão largo (Salvar chamada, Salvar evento).
- Tela raiz com "criar": **FAB estendido** (ícone + texto, nunca só ícone) acima
  da barra de abas, à direita. No máximo um por tela, só para ação positiva.
- Confirmar e cancelar ficam embaixo, na folha, nunca no canto de cima.

### 4. Folhas (bottom sheets) para tarefas curtas
*Fontes: HIG Sheets; M3 Bottom sheet.*

- Uma folha por vez; puxador visível; arrastar para baixo fecha; tocar fora fecha.
- Área do puxador com 48px de altura (alvo de toque mínimo do M3).
- Largura máxima 640px; cantos grandes.
- Cancelar sempre junto do confirmar.

`src/ui/folha.tsx`

### 5. Toque
*Fontes: HIG (44×44pt; ~12pt entre controles com contorno); M3 (48dp); Hoober (10 mm).*

- Alvo mínimo 44px; os itens da barra de abas e o puxador da folha têm 48.
- Todo toque tem resposta visual imediata (fundo/camada de estado), sem
  mudar o tamanho de nada.
- Vibração curta em marcar presença e salvar.
- `touch-action: manipulation` em tudo que é tocável (sem atraso de 300 ms).
- Gesto nunca é o único caminho: arrastar a folha também tem Cancelar.

### 6. Transições com sentido
*Fontes: Chrome View Transitions; padrão "shared axis" do M3.*

- Ir para uma tela de detalhe desliza da direita (~30px + esmaecer); voltar
  faz o inverso. Trocar de aba só esmaece. ~250 ms.
- A barra de abas não se mexe na transição.
- `prefers-reduced-motion`: sem deslizar.
- Navegador sem suporte: troca na hora, sem quebrar.

`src/main.tsx` (tipos da transição), `src/estilo/index.css`

### 7. Desempenho percebido e offline
*Fontes: web.dev App-like PWAs (app shell, erro com "tentar de novo"); HIG.*

- Casca do app no service worker: abre na hora, até sem rede.
- Esqueleto no lugar de spinner; dado guardado aparece primeiro.
- Sem rede: mensagem em português + "Tentar de novo", nunca tela branca.
- Rolagem preservada ao voltar.

### 8. Instalação
*Fontes: web.dev App design; HIG.*

- Ao abrir pelo navegador, um convite em folha oferece **Instalar**. No
  Android/Chrome o botão abre o diálogo do sistema e o ícone vai para a tela
  inicial. No iPhone a Apple não deixa instalar por código: a folha mostra os
  dois passos (Compartilhar → Adicionar à Tela de Início).
- "Agora não" guarda a recusa por 7 dias. Nunca aparece no meio de uma
  chamada nem dentro do app instalado.
- Manifest completo: ícone maskable, atalhos (Fazer chamada, Agenda) e
  capturas de tela, que o Android usa no diálogo de instalação.

`src/ui/ConviteInstalar.tsx`, `vite.config.ts`

### 9. Texto e cor
*Fontes: HIG Accessibility (contraste 4,5:1; texto ampliável a 200%).*

- Corpo 16px; nada abaixo de 12px.
- Contraste conferido por script em todas as telas (texto ≥ 4,5:1).
- Sem travar zoom; palavras longas hifenizam em vez de quebrar no meio.
- Só tema claro (`color-scheme: only light`): o modo escuro automático do
  Chrome não pode inverter a lista de chamada.

### 10. Formulários
*Fontes: HIG Accessibility; ui-ux-pro-max §8 (erro perto do campo, rótulo visível).*

- Rótulo sempre visível em cima do campo; placeholder é exemplo, nunca o rótulo.
- **Erro embaixo do campo** (`Campo`/`CampoSenha` com `erro`), com ícone, e o
  foco vai para o campo. Toast só para erro que não é de campo (rede, servidor).
- Campo com ícone à esquerda quando ajuda a reconhecer (e-mail, senha, valor).
- Teclado certo: `inputMode` (email, decimal, tel), `enterKeyHint` (next/go/done),
  `autoComplete`.
- Botão de enviar com `carregando`: desliga e mostra o giro, sem mudar de tamanho.
- O app lembra o que dá para lembrar (último e-mail, última categoria).

### 11. Avisos na tela (`Banner`)
*Fonte: M3 banner; HIG (não usar só cor).*

- Quatro tons, pelo peso real: **info** (roxo claro, nada de errado),
  **atencao** (âmbar, confira antes), **erro** (vermelho claro, não deu
  certo), **sucesso** (verde claro).
- Título curto diz o quê; texto diz por quê e o que fazer. Ícone num círculo.
- Nunca âmbar ou vermelho para algo que não é problema (ex.: sessão vencida
  é segurança, não erro: tom info).

### 12. Toasts
*Fonte: M3 snackbar.*

- Superfície escura única; o tipo vem do ícone (ok verde, erro vermelho, info roxo).
- Uma linha ou duas; ação como botão de texto; some sozinho (3,2 s; 5 s erro;
  6,5 s com ação); dedo em cima pausa; arrastar fecha.
- `info` para aviso que não é falha (sem internet, "continua guardada").
- Toast confirma o que já aconteceu. Decisão vai em folha; erro de campo, no campo.

### 13. Listas
*Fonte: HIG Lists (inset grouped, chevron para navegar).*

- Lista de navegação: `GrupoNav` (uma superfície, fios internos, ícone em
  quadradinho roxo, seta), com cabeçalho de seção em versalete quando há grupos.
- Linha de dado (aluno, item): `Lista` + `Linha`.
- Cartão solto só para conteúdo rico (evento da agenda, aluno em risco).

### 14. Escrita
- Português do dia a dia, segunda pessoa, frases curtas. Sem jargão técnico
  ("sessão", "token", "sincronizar", "servidor") na tela.
- Mensagem de problema: o que aconteceu + o que fazer. Sem culpar a pessoa.
- Estado vazio: diz por que está vazio e qual o próximo passo.

### 15. Gestos de arrastar
*Fontes: HIG Accessibility ("offer alternatives to gestures"); Smashing (área de arrasto ≥ 45px; gesto não pode ser o único caminho); Android 13 "predictive back".*

- **Borda esquerda → voltar** nas telas internas: seta que acompanha o dedo,
  vibra ao passar do ponto (72px) ou com peteleco rápido. Faz o mesmo que o
  botão de voltar da tela; tela sem voltar (raiz, chamada pelo QR) não tem gesto.
  Desligado no Safari do iPhone fora do app instalado (o Safari já faz).
- **Arrastar para o lado nas 5 telas raiz → aba vizinha**, deslizando do lado
  certo. Primeira e última aba resistem.
- Só vale movimento claramente horizontal (|dx| > 1,4×|dy| depois de 10px).
  Não começa em campo, folha, toast, `[data-sem-arrasto]` nem em área que rola
  de lado. Tocar continua sendo tocar: marcar presença não é afetado.
- Botões e abas continuam lá: o gesto é atalho.

`src/ui/Arrastar.tsx`

### 16. O DNA do Início (telas raiz)
A tela inicial é a referência. As 5 telas raiz (abas) seguem a mesma
estrutura, com as peças de `src/ui/Heroi.tsx`:

1. **`Heroi`** roxo: sobretítulo pequeno em lilás ("Boa noite," / "Outubro
   de 2026"), título grande (32px, extrabold), **pílulas** de resumo (o que
   importa saber de relance: "3 aulas hoje", "R$ 1.288 em caixa"), a ação
   principal da tela como botão redondo à direita (`BotaoHeroi`), a bailarina
   do logo ao fundo bem apagada.
2. **`Sobreposto`** + `CARTAO_ELEVADO`: o cartão mais importante da tela,
   por cima da borda do roxo (Início: aula agora; Chamada: aula de agora;
   Agenda: o mês; Caixa: o saldo; Gestão: quem precisa de atenção).
3. **`Atalhos`**: até 4 tarefas da tela em botões quadrados arredondados com
   rótulo, logo abaixo do cartão.
4. **`CabecalhoSecao`** + listas: versalete à esquerda, ação à direita
   ("Ver semana"). Linhas com coluna fixa à esquerda (hora, dia, valor) e
   selo de estado escrito à direita.
5. **Seções compactas**: ícone ao lado do nome, número embaixo.

Telas internas (detalhe, formulário) **não** usam Heroi: cabeçalho claro,
título que encolhe, barra de ação embaixo. A diferença marca onde a pessoa
está: roxo = início de uma seção; claro = dentro dela.

## Como conferir

O script de auditoria passa por todas as rotas em 360 e 390px e acusa
rolagem horizontal, alvo de toque menor que 44px, texto menor que 12px,
controle sem nome e contraste baixo. Rode depois de mexer em layout.
