/* O ano inteiro, com a contagem de cada mês. A tela de janeiro, quando
   a coordenação planeja o ano. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Cake, Printer } from 'lucide-react';
import { clsx } from 'clsx';
import { leitura } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { CARTAO, Esqueleto, GrupoNav } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { MESES, plural, vibrar } from '../../../util';
import { anoDeHoje, anoValido, comCor, MES_CURTO, Passo, type AgendaAno } from './-comum';

export const Route = createFileRoute('/_app/agenda/ano')({
  validateSearch: (s: Record<string, unknown>): { ano?: number } => {
    const ano = anoValido(s.ano);
    return ano ? { ano } : {};
  },
  component: Ano,
});

function Ano() {
  const ano = Route.useSearch().ano || anoDeHoje();
  const navigate = useNavigate();
  const q = useQuery(leitura<AgendaAno>('listarAgendaAno', ano));
  const r = q.data;
  const passo = (n: number) => { vibrar(); navigate({ to: '/agenda/ano', search: { ano: ano + n }, replace: true }); };

  return (
    <Tela titulo={'Agenda de ' + ano} voltar="/agenda">
      <Passo rotulo={ano} onAnterior={() => passo(-1)} onProximo={() => passo(1)}
        nomeAnterior="Ano anterior" nomeProximo="Próximo ano" />
      {r ? (
        <div className="mb-5 grid grid-cols-3 gap-2">
          {r.meses.map((m) => {
            const chave = ano + '-' + String(m.mes).padStart(2, '0');
            const atual = chave === r.hoje.slice(0, 7);
            const pontos = r.tipos.flatMap((t) =>
              Array.from({ length: Math.min(m.tipos[t] || 0, 4) }, (_, i) => ({ k: t + i, c: r.cores[t] })));
            return (
              <button key={m.mes} type="button"
                aria-label={MESES[m.mes - 1] + ', ' + plural(m.total, 'evento', 'eventos')}
                onClick={() => navigate({ to: '/agenda', search: { mes: chave } })}
                className={clsx(CARTAO, 'flex min-h-23 flex-col items-center justify-center gap-0.5 px-2 py-3 text-center',
                  'transition-colors duration-150 active:bg-fundo', atual && 'border-2 border-roxo')}>
                <span className="text-[13px] font-semibold text-apagado">{MES_CURTO[m.mes - 1]}</span>
                <b className={clsx('text-[26px] leading-tight font-bold tracking-tighter tabular-nums', !m.total && 'font-normal text-apagado/70')}>{m.total}</b>
                <i className="mt-1 flex min-h-2 flex-wrap justify-center gap-[3px]">
                  {pontos.map((p) => <u key={p.k} style={comCor(p.c)} className="size-2 rounded-full bg-(--c)" />)}
                </i>
              </button>
            );
          })}
        </div>
      ) : q.isError ? (
        <ErroTela erro={q.error} tentar={() => q.refetch()} />
      ) : (
        <Esqueleto n={3} />
      )}
      <GrupoNav titulo={'Planejar ' + ano} itens={[
        { icone: Cake, titulo: 'Datas comemorativas', sub: 'colocar as datas que se repetem todo ano',
          onClick: () => navigate({ to: '/agenda/datas', search: { ano } }) },
        { icone: Printer, titulo: 'Calendário para imprimir', sub: 'PDF em A4 deitado, com espaço para escrever',
          onClick: () => navigate({ to: '/agenda/imprimir', search: { ano } }) },
      ]} />
    </Tela>
  );
}
