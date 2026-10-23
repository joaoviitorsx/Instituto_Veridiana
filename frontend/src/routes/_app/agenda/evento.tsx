/* Novo evento (?data=aaaa-mm-dd) ou editar (?id=…&mes=aaaa-mm). */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { clsx } from 'clsx';
import { leitura, useEscrita } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { BotaoCheio, Campo, Chip, Esqueleto, Estado } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { toast } from '../../../ui/toast';
import { hojeISO, textoErro, vibrar } from '../../../util';
import { comCor, corTipo, mesDeHoje, mesValido, type AgendaMes, type Evento } from './-comum';

type Busca = { id?: string; mes?: string; data?: string };

export const Route = createFileRoute('/_app/agenda/evento')({
  validateSearch: (s: Record<string, unknown>): Busca => {
    const b: Busca = {};
    if (typeof s.id === 'string' && s.id) b.id = s.id;
    const mes = mesValido(s.mes);
    if (mes) b.mes = mes;
    if (typeof s.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.data)) b.data = s.data;
    return b;
  },
  component: TelaEvento,
});

type Ficha = Omit<Evento, 'id'>;

function TelaEvento() {
  const { id, mes, data } = Route.useSearch();
  /* Tipos, cores, situações e turmas vêm junto com a agenda do mês. O
     evento editado também: é do mês dele que ele sai. */
  const m = mes || (data ? data.slice(0, 7) : mesDeHoje());
  const q = useQuery({ ...leitura<AgendaMes>('listarAgenda', +m.slice(0, 4), +m.slice(5, 7)), staleTime: 300_000 });
  const titulo = id ? 'Editar evento' : 'Novo evento';

  if (!q.data) {
    return (
      <Tela titulo={titulo} voltar="/agenda">
        {q.isError ? <ErroTela erro={q.error} tentar={() => q.refetch()} /> : <Esqueleto n={4} />}
      </Tela>
    );
  }
  const ev = id ? q.data.eventos.find((x) => x.id === id) : undefined;
  if (id && !ev) {
    return (
      <Tela titulo={titulo} voltar="/agenda">
        <Estado icone={CircleAlert} titulo="Evento não encontrado" texto="Volte e abra de novo." />
      </Tela>
    );
  }
  return <Formulario key={id || 'novo'} id={id} ev={ev} data={data} listas={q.data} titulo={titulo} />;
}

/* Recebe os dados uma vez e não é repintado: refetch não apaga o que
   foi digitado. */
function Formulario({ id, ev, data, listas, titulo }: {
  id?: string; ev?: Evento; data?: string; listas: AgendaMes; titulo: string;
}) {
  const navigate = useNavigate();
  const salvar = useEscrita<{ ok: boolean; id: string; data: string }>(id ? 'editarEvento' : 'criarEvento');
  const [f, setF] = useState<Ficha>(() => ev
    ? { ...ev, turmas: [...ev.turmas] }
    : { titulo: '', data: data || hojeISO(), dataFim: '', tipo: '', turmas: [], local: '', status: 'Planejado', obs: '' });
  const [varios, setVarios] = useState(!!f.dataFim);
  const nome = useRef<HTMLInputElement>(null);
  const muda = (p: Partial<Ficha>) => setF((x) => ({ ...x, ...p }));

  useEffect(() => {
    if (id) return;
    const t = setTimeout(() => nome.current?.focus(), 200);
    return () => clearTimeout(t);
  }, [id]);

  function turma(t: string) {
    vibrar();
    if (!t) { muda({ turmas: [] }); return; }
    muda({ turmas: f.turmas.includes(t) ? f.turmas.filter((x) => x !== t) : [...f.turmas, t] });
  }

  function enviar() {
    const dados = {
      ...f, titulo: f.titulo.trim(), local: f.local.trim(), obs: f.obs.trim(),
      dataFim: varios ? f.dataFim : '',
    };
    if (dados.titulo.length < 2) { toast('Escreva o nome do evento.', 'erro'); nome.current?.focus(); return; }
    if (!dados.data) { toast('Escolha a data.', 'erro'); return; }
    if (!dados.tipo) { toast('Escolha o tipo do evento.', 'erro'); return; }
    if (dados.dataFim && dados.dataFim < dados.data) { toast('A data do fim vem antes do começo.', 'erro'); return; }
    salvar.mutate(id ? [id, dados] : [dados], {
      onSuccess: (r) => {
        vibrar();
        toast(id ? 'Evento salvo' : dados.titulo + ' está na agenda');
        /* Volta para a agenda no mês do evento, para ela ver onde caiu. */
        navigate({ to: '/agenda', search: { mes: r.data.slice(0, 7) }, replace: true });
      },
      onError: (e) => toast(textoErro(e), 'erro'),
    });
  }

  return (
    <Tela titulo={titulo} voltar="/agenda"
      barra={<BotaoCheio onClick={enviar} disabled={salvar.isPending} className="text-[17px]">
        {salvar.isPending ? 'Salvando…' : 'Salvar evento'}
      </BotaoCheio>}>
      <form onSubmit={(e) => { e.preventDefault(); enviar(); }} noValidate>
        <Campo id="agTitulo" rotulo="Nome do evento" ref={nome} autoComplete="off" autoCapitalize="sentences"
          maxLength={120} placeholder="Dia da Dança" value={f.titulo} onChange={(e) => muda({ titulo: e.target.value })} />
        <Campo id="agData" rotulo="Data" type="date" value={f.data} onChange={(e) => muda({ data: e.target.value })} />
        <label className="-mt-1 mb-4 flex min-h-11 cursor-pointer items-center gap-3 text-[15px] font-semibold">
          <input type="checkbox" className="size-[22px] accent-roxo" checked={varios}
            onChange={(e) => {
              setVarios(e.target.checked);
              if (e.target.checked && !f.dataFim) muda({ dataFim: f.data });
            }} />
          Dura mais de um dia
        </label>
        {varios && <Campo id="agFim" rotulo="Termina em" type="date" min={f.data} value={f.dataFim}
          onChange={(e) => muda({ dataFim: e.target.value })} />}

        <Grupo rotulo="Tipo">
          <div className="grid grid-cols-2 gap-2">
            {listas.tipos.map((t) => {
              const on = f.tipo === t;
              return (
                <button key={t} type="button" aria-pressed={on} style={comCor(corTipo(listas.cores, t))}
                  onClick={() => { vibrar(); muda({ tipo: t }); }}
                  className={clsx('flex min-h-13 items-center gap-2 rounded-m bg-papel text-left text-[15px] leading-tight font-semibold',
                    'transition-colors duration-150',
                    on ? 'border-2 border-(--c) bg-[color-mix(in_srgb,var(--c)_10%,#fff)] px-[11px] py-[9px]' : 'border border-borda px-3 py-2.5')}>
                  <span className="size-3 shrink-0 rounded-full bg-(--c)" />
                  <span className="min-w-0 [overflow-wrap:anywhere]">{t}</span>
                </button>
              );
            })}
          </div>
        </Grupo>

        <Grupo rotulo="Turmas">
          <div className="flex flex-wrap gap-2">
            <Chip ligado={!f.turmas.length} onClick={() => turma('')}>Todas</Chip>
            {listas.turmas.map((t) => <Chip key={t} ligado={f.turmas.includes(t)} onClick={() => turma(t)}>{t}</Chip>)}
          </div>
        </Grupo>

        <Campo id="agLocal" rotulo={<>Local <i className="font-normal not-italic">(opcional)</i></>} autoComplete="off"
          maxLength={120} placeholder="Teatro do bairro" value={f.local} onChange={(e) => muda({ local: e.target.value })} />
        <Campo id="agObs" rotulo={<>Observação <i className="font-normal not-italic">(opcional)</i></>} autoComplete="off"
          maxLength={500} value={f.obs} onChange={(e) => muda({ obs: e.target.value })} />

        <Grupo rotulo="Situação">
          <div className="flex flex-wrap gap-2">
            {listas.status.map((st) => (
              <Chip key={st} ligado={f.status === st} onClick={() => { vibrar(); muda({ status: st }); }}>{st}</Chip>
            ))}
          </div>
        </Grupo>
        <button type="submit" hidden />
      </form>
    </Tela>
  );
}

function Grupo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-4">
      <legend className="mb-2 block text-[13px] font-semibold text-apagado">{rotulo}</legend>
      {children}
    </fieldset>
  );
}
