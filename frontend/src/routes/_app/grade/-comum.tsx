/* Peças da grade semanal, usadas pela grade, pelo cadastro e pela
   seção "Aulas de hoje" da Chamada. Servidor em apps-script/Grade.gs. */
import { Check } from 'lucide-react';
import { clsx } from 'clsx';
import { leitura } from '../../../api/cliente';

export type Horario = {
  id: string; turma: string; dia: number; inicio: string; fim: string;
  sala: string; professor: string; obs: string;
};
export type Grade = {
  hoje: string; dia: number; dias: string[]; horarios: Horario[];
  turmas: string[]; professores: string[]; salas: string[]; feitasHoje: string[];
};

export const leituraGrade = () => leitura<Grade>('listarGrade');

/* 0 = domingo, igual ao servidor. A semana do instituto começa na segunda. */
export const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];

export function minutos(hhmm: string): number {
  const p = String(hhmm || '').split(':');
  return p.length === 2 ? +p[0] * 60 + +p[1] : -1;
}
/* "14:00" → "14h", "14:30" → "14h30". */
export function horaCurta(hhmm: string): string {
  const m = minutos(hhmm);
  if (m < 0) return '';
  const h = Math.floor(m / 60), min = m % 60;
  return h + 'h' + (min ? String(min).padStart(2, '0') : '');
}
export function agoraMinutos(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/* Situação de um horário de hoje. Mesma régua do servidor (aulaDaGrade_):
   "agora" vai de 30 min antes de começar até o fim. */
export type Situacao = 'feita' | 'agora' | 'proxima' | 'passou' | 'depois';
export function situacaoHoje(h: Horario, feitas: string[], agora = agoraMinutos(), primeiraDepois?: string): Situacao {
  if (feitas.includes(h.turma)) return 'feita';
  const ini = minutos(h.inicio), fim = minutos(h.fim);
  if (agora >= ini - 30 && agora <= fim) return 'agora';
  if (agora > fim) return 'passou';
  return h.id === primeiraDepois ? 'proxima' : 'depois';
}
/* A primeira aula de hoje que ainda vai começar (para o selo "Próxima"). */
export function primeiraDepois(hs: Horario[], feitas: string[], agora = agoraMinutos()): string | undefined {
  return hs.filter((h) => !feitas.includes(h.turma) && minutos(h.inicio) - 30 > agora)
    .sort((a, b) => minutos(a.inicio) - minutos(b.inicio))[0]?.id;
}

/* Selo com texto (nunca só cor): quem não distingue cores entende igual. */
export function Selo({ s }: { s: Situacao }) {
  if (s === 'depois') return null;
  const t = {
    feita: { txt: 'Chamada feita', c: 'bg-presente-fraco text-presente' },
    agora: { txt: 'Agora', c: 'bg-roxo text-white' },
    proxima: { txt: 'Próxima', c: 'bg-roxo-fraco text-roxo' },
    passou: { txt: 'Já passou', c: 'bg-fundo text-apagado border border-borda' },
  }[s];
  return (
    <span className={clsx('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap', t.c)}>
      {s === 'feita' && <Check size={13} strokeWidth={3} />}{t.txt}
    </span>
  );
}

/* A faixa de hora em destaque, à esquerda da linha. */
export function Hora({ h, forte }: { h: Horario; forte?: boolean }) {
  return (
    <span className={clsx('flex w-[58px] shrink-0 flex-col items-start leading-tight tabular-nums',
      forte ? 'text-roxo' : 'text-tinta')}>
      <b className="text-[17px] font-extrabold tracking-tight">{h.inicio}</b>
      <span className="text-[13px] font-medium text-apagado">até {h.fim}</span>
    </span>
  );
}

export function detalheHorario(h: Horario): string {
  return [h.sala, h.professor].filter(Boolean).join(' · ') || 'sem sala e professora';
}
