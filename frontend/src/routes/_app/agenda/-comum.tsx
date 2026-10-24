/* Peças da agenda usadas por mais de uma tela. */
import type { CSSProperties, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, CircleAlert } from 'lucide-react';
import { clsx } from 'clsx';
import { CARTAO } from '../../../ui/kit';
import { hojeISO } from '../../../util';

export type Evento = {
  id: string; data: string; dataFim: string; titulo: string; tipo: string;
  turmas: string[]; local: string; status: string; obs: string;
};
export type AgendaMes = {
  ano: number; mes: number; hoje: string; eventos: Evento[];
  tipos: string[]; status: string[]; cores: Record<string, string>; turmas: string[];
};
export type AgendaAno = {
  ano: number; hoje: string; total: number; cores: Record<string, string>; tipos: string[];
  meses: { mes: number; total: number; tipos: Record<string, number> }[];
};

export const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIA_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export const mesDeHoje = () => hojeISO().slice(0, 7);
export const anoDeHoje = () => +hojeISO().slice(0, 4);

/* aaaa-mm válido, ou o mês de hoje. */
export function mesValido(v: unknown): string | undefined {
  return typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : undefined;
}
export function anoValido(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isInteger(n) && n >= 2000 && n <= 2100 ? n : undefined;
}

export function somarMes(mes: string, n: number): string {
  let a = +mes.slice(0, 4), m = +mes.slice(5, 7) - 1 + n;
  a += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
  return a + '-' + String(m + 1).padStart(2, '0');
}
export function diaSemanaIso(iso: string): string {
  const p = iso.split('-');
  return DIA_CURTO[new Date(+p[0], +p[1] - 1, +p[2]).getDay()];
}
export function textoTurmas(ts: string[] | undefined): string {
  return !ts || !ts.length ? 'Todas as turmas' : ts.join(', ');
}
export function corTipo(cores: Record<string, string> | undefined, t: string): string {
  const c = cores || {};
  return c[t] || c.Outro || '#6B5E78';
}

/* A cor do tipo entra por variável: cada tipo tem a sua, que vem do servidor. */
export const comCor = (c: string) => ({ '--c': c }) as CSSProperties;

/* Texto da tag escurecido a partir da cor do tipo: a cor pura sobre o
   fundo claro dela não passava de 3:1 (Reunião, cinza, dava 2,7). */
export function Tag({ tipo, cor }: { tipo: string; cor: string }) {
  return (
    <span style={comCor(cor)}
      className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--c)_12%,#fff)] py-[3px] pr-2.5 pl-2 text-xs font-bold text-[color-mix(in_srgb,var(--c)_68%,#000)]">
      <span className="size-2 rounded-full bg-(--c)" />{tipo}
    </span>
  );
}

/* Anterior / atual / próximo. Usado para mês e para ano. */
export function Passo({ rotulo, onAnterior, onProximo, nomeAnterior, nomeProximo }: {
  rotulo: ReactNode; onAnterior: () => void; onProximo: () => void; nomeAnterior: string; nomeProximo: string;
}) {
  const bt = 'grid size-11 shrink-0 place-items-center rounded-p text-roxo transition-colors duration-150 active:bg-roxo-fraco';
  return (
    <div className={clsx(CARTAO, 'mb-4 flex items-center justify-between gap-2 p-1')}>
      <button type="button" className={bt} onClick={onAnterior} aria-label={nomeAnterior}><ChevronLeft size={22} /></button>
      <b className="flex-1 text-center text-base font-bold tracking-tight" aria-live="polite">{rotulo}</b>
      <button type="button" className={bt} onClick={onProximo} aria-label={nomeProximo}><ChevronRight size={22} /></button>
    </div>
  );
}

/* Erro embaixo de um grupo de botões (tipo, turmas), no mesmo jeito do
   erro de campo do kit: ícone + texto em vermelho, lido pelo leitor de tela. */
export function ErroGrupo({ id, erro }: { id?: string; erro?: string }) {
  if (!erro) return null;
  return (
    <span id={id ? id + '-erro' : undefined} role="alert"
      className="mt-2 flex items-start gap-1.5 text-[13px] leading-snug font-medium text-falta">
      <CircleAlert size={16} className="mt-px shrink-0" />{erro}
    </span>
  );
}

