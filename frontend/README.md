# Chamada — Instituto Veridiana · PWA

O mesmo app da equipe, agora instalável e funcionando **sem internet**.
React no Vercel, falando com o mesmo Apps Script e a mesma planilha.

O app HTML antigo (o link `/exec`) **continua no ar e funcionando**. Os
dois usam as mesmas funções do servidor: nenhuma regra de negócio mudou.

> ### ⚠️ Atualizar o backend é SEMPRE "Nova versão"
>
> **Implantar → Gerenciar implantações → ✏️ → Versão: Nova versão → Implantar.**
>
> **Nunca** "Nova implantação". Ela cria outra URL `/exec`: o PWA inteiro
> para (a URL dele está no Vercel), mas o app HTML continua funcionando na
> URL nova — e isso torna o problema confuso de diagnosticar.
>
> Para conferir em 5 segundos: abra `SUA_URL/exec?fn=ping` no navegador.
> Respondeu `{"ok":true,"dados":{"versao":"3.0.0",...}}`, a URL está viva.

---

## O que o PWA tem que o app HTML não tem

- **Chamada sem internet.** A lista de cada turma fica guardada no
  celular. Sem sinal, a chamada abre com a faixa "Sem internet — lista de
  21/10", e salvar guarda no celular: *"Chamada guardada no celular. Vai
  enviar sozinha quando a internet voltar."* O envio acontece quando a
  rede volta, quando o app abre, e pelo Background Sync (Android).
- **Instala de verdade**, com o ícone do instituto no Android **e no
  iPhone**, abre em tela cheia e instantâneo.
- A sessão fica guardada no aparelho (o iframe do Apps Script nem sempre
  deixava).
- **Cara e jeito de app nativo:** barra de abas, título grande que encolhe,
  folhas, toasts, transições entre telas e gestos (arrastar da borda para
  voltar, arrastar para o lado para trocar de aba). Convite para instalar ao
  abrir pelo navegador. Os padrões, com as fontes (Material 3, Apple HIG,
  web.dev), estão em [`DESIGN.md`](DESIGN.md) — leia antes de mexer em tela.
- **Grade de aulas** (`/grade`): a semana por dia ou inteira, cadastro em
  vários dias de uma vez, aviso de conflito, "Aulas de hoje" na chamada.

### Como a chamada offline não duplica

Cada chamada nasce no celular com um **token** e o **registro** (a hora
real em que foi salva). Os dois vão em todo reenvio:

- o token é a mesma proteção que o app HTML já usava (cache de 6 h no
  servidor);
- o registro fica gravado na coluna `Registro` da aba `Chamadas`. Se o
  reenvio chegar depois de 6 h, o servidor acha a linha pelo registro e
  responde "já está lá" sem gravar de novo.

A aula entra na planilha **no dia em que aconteceu**, não no dia do
envio. Chamada com mais de 14 dias (`ATRASO_MAX_DIAS` no `Codigo.gs`) é
recusada com explicação e fica no celular em **Pendentes**, com botão
para copiar a lista e passar para a coordenação.

---

## Rodar

```bash
npm install
npm run dev:mock     # sem Apps Script: mock do google.script.run, dados de mentira
npm run dev          # contra o Apps Script de verdade (precisa do .env.local)
npm run build        # gera dist/ com o service worker
npm run preview      # serve o dist/ — é aqui que dá para testar offline
```

Logins do mock (só valem no mock): `vera@exemplo.org` / `veridiana`,
`aline@exemplo.org` / `aline123`, `bruno@exemplo.org` / `temp2345`
(primeiro acesso).

Para testar offline: `npm run build -- --mode mock && npm run preview -- --mode mock`,
abra uma turma, e no DevTools → Network → **Offline**. No `npm run dev`
não há service worker, então navegar offline não funciona lá — é normal.

O `src/mock/mock-gas.js` é cópia do `../mock.js` da raiz, com
`salvarChamada` aceitando `registro`. Mudou um, mude o outro.

### Variáveis de ambiente

| Variável | O que é |
|---|---|
| `VITE_API_URL` | o link do Apps Script que termina em `/exec` |
| `VITE_URL_HTML` | opcional: link do app HTML mostrado como plano B na tela de erro (padrão: o mesmo `/exec`) |
| `VITE_MOCK` | `1` liga o mock (o `npm run dev:mock` já faz isso) |

Local: copie `.env.example` para `.env.local`. No Vercel: **Settings →
Environment Variables**. A URL **nunca** vai no código.

---

## Publicar no Vercel (uma vez)

1. Vercel (conta do instituto, plano Hobby) → **Add New → Project** →
   importar `joaoviitorsx/Instituto_Veridiana`.
2. **Root Directory: `frontend`**. O resto o Vercel detecta (Vite).
3. **Environment Variables:** `VITE_API_URL` = o `/exec` de produção.
4. **Deploy.** Subdomínio sugerido: `veridiana.vercel.app` (ou
   `chamada-veridiana.vercel.app`) em **Settings → Domains**.

Depois disso, todo push na `main` publica sozinho. O `vercel.json`
manda qualquer rota para o `index.html` (o app tem rotas como
`/chamada/Ballet`) e impede cache do `sw.js` — sem isso, versão nova
demoraria a chegar.

**Atualização no celular:** o app nunca recarrega sozinho (apagaria as
marcações de uma chamada pela metade). Aparece "Nova versão disponível —
tocar para atualizar" no topo.

---

## QR das turmas

Os QR antigos (com o `/exec`) continuam caindo no app HTML. Os novos,
gerados em **Gestão → QR**, apontam para o PWA:

- app: `https://veridiana.vercel.app/`
- turma: `https://veridiana.vercel.app/?turma=Ballet%20Infantil%20I`
  (abre direto na lista de chamada, sem tela no meio)

A virada pode ser uma turma por vez. Rollback é imprimir o QR antigo
de novo — nada para republicar.

---

## Gestos e instalação

- `src/ui/Arrastar.tsx`: voltar pela borda esquerda (desligado no Safari do
  iPhone fora do app instalado, que já faz isso) e trocar de aba arrastando.
- `src/ui/ConviteInstalar.tsx`: convite ao abrir pelo navegador. No Android
  instala com um toque; no iPhone mostra os passos (a Apple não deixa
  instalar por código). "Agora não" vale 7 dias.
- As capturas em `public/capturas/` aparecem no diálogo de instalação do
  Android. Mudou a cara do app? Gere de novo.

## Estrutura

```
src/
  api/transporte.ts   fetch no /exec (text/plain, redirect follow) ou o mock
  api/cliente.ts      sessão na frente, cache de leitura (TanStack Query), invalidação
  offline/fila.ts     a fila de chamadas no IndexedDB (roda na página e no SW)
  offline/envio.ts    quando enviar: abrir, online, voltar para a tela, a cada 2 min
  offline/rede.tsx    "Sem internet — lista de 21/10"
  offline/instalar.ts botão de instalar (Android) e dica do iPhone
  sw.ts               service worker: cache do app + Background Sync da fila
  sessao.ts           token do login (localStorage + cópia no IndexedDB para o SW)
  ui/                 Tela (moldura), Abas, Heroi (DNA das telas raiz), folha,
                      toast, Arrastar (gestos), ConviteInstalar, kit
  routes/             uma tela por arquivo (TanStack Router); cada seção é
                      um pedaço separado do pacote — quem escaneia o QR
                      não baixa gestão, caixa nem agenda
  estilo/index.css    tokens do app (os mesmos de apps-script/Estilo.html)
```

Stack: Vite, React 19, TypeScript, TanStack Router (rotas por arquivo) e
TanStack Query (cache, com persistência no IndexedDB só do que a chamada
precisa), Tailwind v4, lucide-react, vite-plugin-pwa (Workbox).

### O que fica no celular

| | onde | por quê |
|---|---|---|
| sessão | localStorage + IndexedDB | o SW precisa dela para enviar a fila |
| turmas e elenco de cada uma | IndexedDB (cache persistido do TanStack Query, 20 dias) | chamada sem internet |
| fila de chamadas | IndexedDB `veridiana-fila` | até chegar na planilha |
| o app em si | Cache Storage (service worker) | abrir sem internet |

Resposta da API **nunca** sai do cache do service worker. "Sair" apaga
sessão e cache; a fila fica (é chamada que ainda não chegou na planilha).

---

## Antes de publicar uma mudança no backend

O risco do modo duplo é consertar um caminho e quebrar o outro sem
perceber. Toda mudança no Apps Script:

1. testes de servidor passando;
2. `/dev` abre o app HTML e faz uma chamada;
3. `/dev?fn=ping` devolve JSON;
4. só então **Nova versão** na implantação existente.
