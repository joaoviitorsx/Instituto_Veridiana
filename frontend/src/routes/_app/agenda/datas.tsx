/* Datas que se repetem todo ano (DATAS_FIXAS no Agenda.gs). Marca e põe
   na agenda de uma vez. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { clsx } from 'clsx';
import { leitura, useEscrita } from '../../../api/cliente';
import { Tela, useVoltar } from '../../../ui/Tela';
import { BotaoCheio, Esqueleto, Lista } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { toast } from '../../../ui/toast';
import { dataExtenso, plural, textoErro, vibrar } from '../../../util';
import { anoDeHoje, anoValido } from './-comum';

type Datas = { ano: number; datas: { dia: string; data: string; titulo: string; tipo: string; jaTem: boolean }[] };

export const Route = createFileRoute('/_app/agenda/datas')({
  validateSearch: (s: Record<string, unknown>): { ano?: number } => {
    const ano = anoValido(s.ano);
    return ano ? { ano } : {};
  },
  component: TelaDatas,
});

function TelaDatas() {
  const ano = Route.useSearch().ano || anoDeHoje();
  const q = useQuery({ ...leitura<Datas>('datasFixas', ano), staleTime: 300_000 });
  if (!q.data) {
    return (
      <Tela titulo={'Datas de ' + ano} voltar="/agenda/ano">
        {q.isError ? <ErroTela erro={q.error} tentar={() => q.refetch()} /> : <Esqueleto n={3} />}
      </Tela>
    );
  }
  return <Escolha key={ano} ano={ano} r={q.data} />;
}

function Escolha({ ano, r }: { ano: number; r: Datas }) {
  const voltar = useVoltar('/agenda/ano');
  const navigate = useNavigate();
  const colocar = useEscrita<{ criados: number }>('precarregarDatas');
  /* Começa com tudo o que ainda não está na agenda marcado. */
  const [marcadas, setMarcadas] = useState(() => new Set(r.datas.filter((d) => !d.jaTem).map((d) => d.dia)));
  const livres = r.datas.some((d) => !d.jaTem);

  function alternar(dia: string) {
    vibrar();
    setMarcadas((m) => { const n = new Set(m); if (n.has(dia)) n.delete(dia); else n.add(dia); return n; });
  }
  function enviar() {
    const dias = [...marcadas];
    if (!dias.length) { toast('Marque pelo menos uma data.', 'erro'); return; }
    colocar.mutate([ano, dias], {
      onSuccess: (x) => {
        vibrar();
        toast(x.criados ? plural(x.criados, 'data entrou', 'datas entraram') + ' na agenda de ' + ano
          : 'Essas datas já estavam na agenda');
        voltar();
      },
      onError: (e) => toast(textoErro(e), 'erro'),
    });
  }

  return (
    <Tela titulo={'Datas de ' + ano} voltar="/agenda/ano"
      barra={<BotaoCheio onClick={enviar} disabled={!livres || colocar.isPending} className="text-[17px]">
        {colocar.isPending ? 'Colocando…' : 'Colocar na agenda'}
      </BotaoCheio>}>
      <p className="mb-4 ml-1 text-sm text-apagado">
        Datas que se repetem todo ano. Desmarque o que não quiser e toque em "Colocar na agenda".
      </p>
      <Lista>
        {r.datas.map((d) => {
          const on = !d.jaTem && marcadas.has(d.dia);
          return (
            <li key={d.dia} role="checkbox" aria-checked={on} aria-disabled={d.jaTem || undefined}
              tabIndex={d.jaTem ? -1 : 0}
              onClick={() => !d.jaTem && alternar(d.dia)}
              onKeyDown={(e) => { if (!d.jaTem && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); alternar(d.dia); } }}
              className={clsx('relative flex min-h-16 items-center gap-3 px-4 py-3 transition-colors duration-150',
                'not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-(--fio)',
                'not-first:before:h-px not-first:before:bg-borda not-first:before:content-[""]',
                d.jaTem ? 'cursor-default' : 'cursor-pointer active:bg-roxo-fraco')}>
              <span className={clsx('grid size-[26px] shrink-0 place-items-center rounded-lg border-2 text-white',
                on ? 'border-roxo bg-roxo' : 'border-borda')}>
                {on && <Check size={16} />}
              </span>
              <span className={clsx('min-w-0 flex-1 text-base leading-tight font-semibold', d.jaTem && 'text-apagado')}>
                {d.titulo}
                <small className="mt-0.5 block text-[13px] font-normal text-apagado">
                  {dataExtenso(d.data)}{d.jaTem && ' · já está na agenda'}
                </small>
              </span>
            </li>
          );
        })}
      </Lista>
      <p className="mx-1 mt-1 text-[13px] leading-normal text-apagado">
        Faltou alguma?{' '}
        <button type="button" className="-my-3 inline-block py-3 font-semibold text-roxo underline" onClick={() => navigate({ to: '/agenda' })}>
          Cadastre pelo "Novo evento"
        </button>{' '}na agenda do mês.
      </p>
    </Tela>
  );
}
