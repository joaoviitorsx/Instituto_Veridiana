/* Formato das respostas do Caixa.gs. */
export type TipoLanc = 'Entrada' | 'Saída';

export type Lancamento = {
  data: string; tipo: TipoLanc; valor: number; categoria: string;
  descricao: string; fonte: string; comprovante: string; quem: string; linha: number;
};

export type MesCaixa = {
  mes: string; lancamentos: Lancamento[];
  entrou: number; saiu: number; doMes: number; acumulado: number;
  categorias: Record<TipoLanc, string[]>; fontes: string[];
};

export type ResumoCaixa = {
  inicio: string; fim: string; entrou: number; saiu: number; saldo: number;
  lancamentos: number; semComprovante: number;
  entradas: { nome: string; valor: number }[]; saidas: { nome: string; valor: number }[];
  fontes: { fonte: string; entrou: number; saiu: number }[];
};

export const MES_RE = /^[0-9]{4}-[0-9]{2}$/;
