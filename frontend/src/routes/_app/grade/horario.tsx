/* Novo horário (?dia= já marca o dia) ou editar (?id=). Ao criar, a mesma
   aula pode ir para vários dias de uma vez ("segunda e quarta, 14h").
   Sala, professora ou turma ocupada no mesmo horário: o servidor avisa
   (CONFLITO) e a pessoa decide se grava assim mesmo. */
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState, type ReactNode } from 'react';
import { ChevronRight, CircleAlert, Clock, MapPin, StickyNote, User, Users, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { useEscrita, ErroRede } from '../../../api/cliente';
import { useSessao } from '../../../sessao';
import { Tela, useVoltar } from '../../../ui/Tela';
import { Banner, BotaoCheio, CLASSE_INPUT, Campo, Chip, Esqueleto, Estado } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { folha } from '../../../ui/folha';
import { toast } from '../../../ui/toast';
import { plural, semAcento, textoErro, vibrar } from '../../../util';
import { DIAS, DIAS_CURTOS, ORDEM_SEMANA, leituraGrade, minutos, type Grade, type Horario } from './-comum';

type Busca = { id?: string; dia?: number };

export const Route = createFileRoute('/_app/grade/horario')({
  validateSearch: (s: Record<string, unknown>): Busca => {
    const b: Busca = {};
    if (typeof s.id === 'string' && s.id) b.id = s.id;
    const d = Number(s.dia);
    if (s.dia !== undefined && s.dia !== '' && Number.isInteger(d) && d >= 0 && d <= 6) b.dia = d;
    return b;
  },
  component: TelaHorario,
});

function TelaHorario() {
  const { id, dia } = Route.useSearch();
  const q = useQuery({ ...leituraGrade(), staleTime: 300_000 });
  const titulo = id ? 'Editar horário' : 'Novo horário';
  if (!q.data) {
    return (
      <Tela titulo={titulo} voltar="/grade">
        {q.isError ? <ErroTela erro={q.error} tentar={() => q.refetch()} /> : <Esqueleto n={4} />}
      </Tela>
    );
  }
  const h = id ? q.data.horarios.find((x) => x.id === id) : undefined;
  if (id && !h) {
    return (
      <Tela titulo={titulo} voltar="/grade">
        <Estado icone={CircleAlert} titulo="Esse horário não está mais na grade"
          texto="Alguém pode ter tirado ou mudado pela planilha. Volte para a grade e abra de novo." />
      </Tela>
    );
  }
  return <Formulario key={id || 'novo'} g={q.data} h={h} dia={dia} titulo={titulo} />;
}

type Erros = Partial<Record<'turma' | 'dias' | 'inicio' | 'fim', string>>;

/* Recebe os dados uma vez e não é repintado: refetch não apaga o digitado. */
function Formulario({ g, h, dia, titulo }: { g: Grade; h?: Horario; dia?: number; titulo: string }) {
  const { usuario } = useSessao();
  const voltar = useVoltar('/grade');
  const editando = !!h;
  /* Quem está cadastrando costuma ser quem dá a aula. */
  const eu = g.professores.find((p) => semAcento(p) === semAcento(usuario?.nome)) || '';

  const [turma, setTurma] = useState(h?.turma || '');
  const [dias, setDias] = useState<number[]>(h ? [h.dia] : [dia ?? g.dia]);
  const [inicio, setInicio] = useState(h?.inicio || '');
  const [fim, setFim] = useState(h?.fim || '');
  const [sala, setSala] = useState(h?.sala || '');
  const [professor, setProfessor] = useState(h ? h.professor : eu);
  const [obs, setObs] = useState(h?.obs || '');
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState('');
  const refInicio = useRef<HTMLInputElement>(null);
  const refFim = useRef<HTMLInputElement>(null);

  const salvar = useEscrita<{ ok: boolean; criados?: number }>(editando ? 'editarHorario' : 'criarHorario');

  const limpar = (k: keyof Erros) => { if (erros[k]) setErros({ ...erros, [k]: undefined }); setErroGeral(''); };

  function escolherTurma() {
    folha.opcoes('Qual turma', g.turmas.map((t) => ({
      txt: t, icone: Users, marcado: t === turma, fn: () => { setTurma(t); limpar('turma'); vibrar(); },
    })));
  }
  function escolherProfessora() {
    folha.opcoes('Quem dá a aula', [
      ...g.professores.map((p) => ({ txt: p, ini: p, marcado: p === professor, fn: () => { setProfessor(p); vibrar(); } })),
      { txt: 'Sem professora definida', icone: User, marcado: !professor, fn: () => setProfessor('') },
    ]);
  }
  function tocarDia(d: number) {
    vibrar(); limpar('dias');
    if (editando) { setDias([d]); return; }
    setDias(dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d]);
  }

  function enviar(forcar = false) {
    const e: Erros = {};
    if (!turma) e.turma = 'Escolha a turma.';
    if (!dias.length) e.dias = 'Marque pelo menos um dia.';
    const ini = minutos(inicio), f = minutos(fim);
    if (ini < 0) e.inicio = 'Escolha a hora em que começa.';
    if (f < 0) e.fim = 'Escolha a hora em que termina.';
    else if (ini >= 0 && f <= ini) e.fim = 'Termina antes de começar. Confira as horas.';
    else if (ini >= 0 && f - ini > 360) e.fim = 'Ficou com mais de 6 horas. Confira as horas.';
    setErros(e); setErroGeral('');
    if (Object.keys(e).length) {
      vibrar();
      if (e.inicio) refInicio.current?.focus(); else if (e.fim) refFim.current?.focus();
      return;
    }
    const dados = { turma, inicio, fim, sala: sala.trim(), professor, obs: obs.trim(), forcar,
      ...(editando ? { dia: dias[0] } : { dias }) };
    salvar.mutate(editando ? [h!.id, dados] : [dados], {
      onSuccess: (r) => {
        vibrar();
        toast(editando ? 'Horário salvo' : r.criados && r.criados > 1 ? plural(r.criados, 'horário', 'horários') + ' na grade' : 'Horário na grade');
        voltar();
      },
      onError: (err) => {
        const msg = textoErro(err);
        if (/^CONFLITO:/.test(msg)) {
          folha.confirmar('Esse horário já está ocupado', msg.replace(/^CONFLITO:\s*/, '') + ' Quer salvar mesmo assim?',
            'Salvar mesmo assim', () => enviar(true), { perigo: false });
          return;
        }
        if (err instanceof ErroRede) { toast('Sem internet agora. O que você digitou continua aqui: tente de novo quando a conexão voltar.', 'erro'); return; }
        setErroGeral(msg);
      },
    });
  }

  return (
    <Tela titulo={titulo} voltar="/grade"
      barra={<BotaoCheio onClick={() => enviar()} carregando={salvar.isPending} className="text-[17px]">
        {salvar.isPending ? 'Salvando…' : editando ? 'Salvar horário' : dias.length > 1 ? 'Salvar nos ' + dias.length + ' dias' : 'Salvar horário'}
      </BotaoCheio>}>
      {erroGeral && <Banner tom="erro" titulo="Não deu para salvar">{erroGeral}</Banner>}

      <CampoEscolha id="hTurma" rotulo="Turma" icone={Users} valor={turma} vazio="Escolher a turma"
        erro={erros.turma} onClick={escolherTurma} />

      <fieldset className="mb-4">
        <legend className="mb-2 block text-[13px] font-semibold text-apagado">
          {editando ? 'Dia da semana' : 'Dias da semana'} {!editando && <i className="font-normal not-italic">(pode marcar mais de um)</i>}
        </legend>
        <div className="flex flex-wrap gap-2">
          {ORDEM_SEMANA.map((d) => (
            <Chip key={d} ligado={dias.includes(d)} onClick={() => tocarDia(d)} aria-label={DIAS[d]} className="min-w-12">
              {DIAS_CURTOS[d]}
            </Chip>
          ))}
        </div>
        <ErroLinha id="hDias" erro={erros.dias} />
      </fieldset>

      <div className="flex flex-wrap gap-x-3">
        <Campo id="hInicio" rotulo="Começa" type="time" icone={Clock} ref={refInicio} className="min-w-[140px] flex-1"
          value={inicio} erro={erros.inicio} onChange={(e) => { setInicio(e.target.value); limpar('inicio'); }} />
        <Campo id="hFim" rotulo="Termina" type="time" icone={Clock} ref={refFim} className="min-w-[140px] flex-1"
          value={fim} erro={erros.fim} onChange={(e) => { setFim(e.target.value); limpar('fim'); }} />
      </div>

      <Campo id="hSala" rotulo={<>Sala <i className="font-normal not-italic">(opcional)</i></>} icone={MapPin}
        placeholder="Sala 1, Palco…" autoCapitalize="words" enterKeyHint="next" maxLength={40}
        value={sala} onChange={(e) => setSala(e.target.value)}
        className={g.salas.length ? 'mb-2' : undefined} />
      {g.salas.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {g.salas.map((s) => (
            <Chip key={s} ligado={semAcento(s) === semAcento(sala)} onClick={() => { setSala(s); vibrar(); }}>{s}</Chip>
          ))}
        </div>
      )}

      <CampoEscolha id="hProf" rotulo={<>Quem dá a aula <i className="font-normal not-italic">(opcional)</i></>} icone={User}
        valor={professor} vazio="Sem professora definida" onClick={escolherProfessora} />

      <Campo id="hObs" rotulo={<>Observação <i className="font-normal not-italic">(opcional)</i></>} icone={StickyNote}
        placeholder="Ex.: levar sapatilha" autoCapitalize="sentences" enterKeyHint="done" maxLength={200}
        value={obs} onChange={(e) => setObs(e.target.value)} />
    </Tela>
  );
}

/* Campo que abre uma folha de opções (turma, professora). Mesmo tamanho
   e rótulo de um campo de texto: a pessoa reconhece como "preencher". */
function CampoEscolha({ id, rotulo, icone: Ic, valor, vazio, erro, onClick }: {
  id: string; rotulo: ReactNode; icone: LucideIcon; valor: string; vazio: string; erro?: string; onClick: () => void;
}) {
  return (
    <div className="mb-4">
      <span id={id + '-rot'} className="mb-2 block text-[13px] font-semibold text-apagado">{rotulo}</span>
      <button type="button" id={id} onClick={onClick} aria-labelledby={id + '-rot ' + id}
        aria-invalid={erro ? true : undefined} aria-describedby={erro ? id + '-erro' : undefined}
        className={clsx(CLASSE_INPUT, 'relative flex items-center gap-3 pl-12 text-left',
          erro && 'border-falta! focus:border-falta! focus:ring-falta-fraco!')}>
        <Ic size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-apagado" />
        <span className={clsx('min-w-0 flex-1 truncate', !valor && 'text-apagado')}>{valor || vazio}</span>
        <ChevronRight size={20} className="shrink-0 text-apagado" />
      </button>
      <ErroLinha id={id} erro={erro} />
    </div>
  );
}

/* O mesmo erro embaixo do campo do kit, para o que não é <input>. */
function ErroLinha({ id, erro }: { id: string; erro?: string }) {
  if (!erro) return null;
  return (
    <span id={id + '-erro'} role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] leading-snug font-medium text-falta">
      <CircleAlert size={16} className="mt-px shrink-0" />{erro}
    </span>
  );
}
