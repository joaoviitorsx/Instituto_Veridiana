/* Como uma chamada chega ao Apps Script.

   Produção: POST no /exec com {fn, args}. Os args são exatamente os que o
   app HTML passa para google.script.run — mesma função, mesma ordem.

   Duas regras que não se discutem (ver ESPEC-V3 §2.5):
   - Content-Type text/plain. Com application/json o navegador manda
     OPTIONS antes, o Apps Script não responde, e tudo falha.
   - redirect: 'follow'. O /exec responde 302 para
     script.googleusercontent.com, e é essa segunda resposta que traz o
     Access-Control-Allow-Origin.

   Desenvolvimento (npm run dev:mock): o mock do google.script.run do
   preview.html, sem rede nenhuma. */

export const URL_API: string = import.meta.env.VITE_API_URL || '';
export const MOCK: boolean = import.meta.env.VITE_MOCK === '1';

/* Não chegou ao servidor (ou a resposta não voltou). Quem chama decide:
   a chamada vai para a fila; o resto mostra "confira a internet". */
export class ErroRede extends Error {
  constructor(msg = 'Sem conexão com a planilha. Confira a internet e tente de novo.') {
    super(msg);
    this.name = 'ErroRede';
  }
}

/* O servidor respondeu, mas a URL não é a da API (implantação nova,
   URL errada no Vercel). Ver ESPEC-V3 §2.6. */
export class ErroConfig extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'ErroConfig';
  }
}

type Resposta = { ok: true; dados: unknown } | { ok: false; erro: string };

export async function transportar(fn: string, args: unknown[], prazo: number): Promise<unknown> {
  /* Condição escrita por extenso (não MOCK): o Vite troca por false no
     build de produção e o mock nem entra no pacote. */
  if (import.meta.env.VITE_MOCK === '1') return viaMock(fn, args, prazo);
  if (!URL_API) throw new ErroConfig('Falta configurar VITE_API_URL no Vercel (o link do Apps Script que termina em /exec).');

  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), prazo);
  let r: Response;
  try {
    r = await fetch(URL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ fn, args }),
      redirect: 'follow',
      signal: ctl.signal,
      cache: 'no-store',
    });
  } catch (e) {
    throw (e as Error).name === 'AbortError'
      ? new ErroRede('A internet demorou demais para responder.')
      : new ErroRede();
  } finally {
    clearTimeout(t);
  }

  let json: Resposta;
  try {
    json = await r.json();
  } catch {
    /* HTML no lugar de JSON: página de login do Google (implantação que
       não é "qualquer pessoa") ou erro do Apps Script. */
    if (r.status >= 500) throw new ErroRede('O Google não respondeu agora. Tente de novo em instantes.');
    throw new ErroConfig('O endereço da API não respondeu como API. Confira se VITE_API_URL é o /exec da implantação certa, publicada para "Qualquer pessoa".');
  }
  if (!json || typeof json !== 'object' || !('ok' in json)) {
    throw new ErroConfig('Resposta estranha da API. Abra /exec?fn=ping no navegador para conferir.');
  }
  if (!json.ok) throw new Error(json.erro || 'Não deu certo. Tente de novo.');
  return json.dados;
}

/* ─── mock ─── */
type Corredor = Record<string, (...a: unknown[]) => void> & {
  withSuccessHandler(f: (v: unknown) => void): Corredor;
  withFailureHandler(f: (e: Error) => void): Corredor;
};
const raiz = globalThis as unknown as { google?: { script: { run: Corredor } } };

let mockPronto: Promise<void> | null = null;
function carregarMock(): Promise<void> {
  if (!mockPronto) {
    mockPronto = import('../mock/mock-gas.js?raw').then((m) => {
      /* O mock é um script clássico, escrito para rodar fora de módulo. */
      new Function(m.default)();
    });
  }
  return mockPronto;
}

async function viaMock(fn: string, args: unknown[], prazo: number): Promise<unknown> {
  await carregarMock();
  /* DevTools → Network → Offline também derruba o mock: é assim que se
     testa a fila sem celular. */
  if (!navigator.onLine) throw new ErroRede();
  return new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new ErroRede('A internet demorou demais para responder.')), prazo);
    const run = raiz.google!.script.run
      .withSuccessHandler((v) => { clearTimeout(t); ok(v); })
      .withFailureHandler((e) => {
        clearTimeout(t);
        falha(/rede/i.test(e.message) ? new ErroRede() : new Error(e.message));
      });
    if (typeof run[fn] !== 'function') { clearTimeout(t); falha(new Error('Função desconhecida: ' + fn)); return; }
    run[fn](...args);
  });
}
