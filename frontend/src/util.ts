/* Utilidades de texto, data e aparelho. As mesmas de apps-script/AppNucleo.html. */

export function iniciais(n: string | null | undefined): string {
  const p = String(n || '').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  return (p[0].charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase();
}

export const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function dataExtenso(iso: string | null | undefined): string {
  const p = String(iso || '').split('-');
  if (p.length !== 3) return '';
  const d = new Date(+p[0], +p[1] - 1, +p[2]);
  return DIAS[d.getDay()] + ', ' + (+p[2]) + ' de ' + MESES[+p[1] - 1];
}
export function mesExtenso(iso: string | null | undefined): string {
  const p = String(iso || '').split('-');
  if (p.length < 2) return '';
  const m = MESES[+p[1] - 1] || '';
  return m.charAt(0).toUpperCase() + m.slice(1) + ' de ' + p[0];
}
export function dataCurta(iso: string | null | undefined): string {
  const p = String(iso || '').split('-');
  return p.length === 3 ? p[2] + '/' + p[1] : '';
}
export function maiuscula(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* Número guardado só com dígitos; se vier sem o 55 do Brasil, entra na hora. */
export function linkZap(tel: string | null | undefined, texto: string): string {
  let n = String(tel || '').replace(/[^0-9]/g, '');
  if (!n) return '';
  if (n.length <= 11) n = '55' + n;
  return 'https://wa.me/' + n + '?text=' + encodeURIComponent(texto);
}

/* A coluna Comprovante é texto livre na planilha: só http(s) vira link. */
export function urlSegura(u: unknown): string {
  return /^https?:\/\//i.test(String(u || '')) ? String(u) : '';
}

export function vibrar(): void {
  try { if (navigator.vibrate) navigator.vibrate(8); } catch { /* sem vibração */ }
}

export function sorteioToken(): string {
  return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 10);
}

const SEM_AC: Record<string, string> = {};
export function semAcento(s: unknown): string {
  const k = String(s || '');
  let v = SEM_AC[k];
  if (v === undefined) v = SEM_AC[k] = k.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  return v;
}

export function plural(n: number, um: string, muitos: string): string {
  return n + ' ' + (n === 1 ? um : muitos);
}
export function primeiroNome(n: string | null | undefined): string {
  return String(n || '').trim().split(/\s+/)[0] || '';
}
export function hojeISO(d: Date = new Date()): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
    '-' + String(d.getDate()).padStart(2, '0');
}
export function reais(v: unknown): string {
  const n = Number(v || 0);
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function saudacao(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

/* O Apps Script embrulha o erro e chega "Error: ...". Ninguém no
   instituto precisa ver isso. */
export function textoErro(e: unknown): string {
  const m = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : String(e || '');
  return m.replace(/^\s*(Error|Exception|ScriptError|GoogleJsonResponseException)\s*:\s*/i, '').trim() ||
    'Não deu certo. Tente de novo.';
}

export async function copiarTexto(txt: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(txt);
      return true;
    }
  } catch { /* cai na cópia antiga */ }
  const a = document.createElement('textarea');
  a.value = txt; a.setAttribute('readonly', '');
  a.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(a); a.focus(); a.select();
  let deu = false;
  try { deu = document.execCommand('copy'); } catch { /* nada */ }
  document.body.removeChild(a);
  return deu;
}
