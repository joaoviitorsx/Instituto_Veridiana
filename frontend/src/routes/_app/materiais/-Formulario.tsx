/* Cadastro e edição do item. O formulário nasce uma vez com os dados e
   nunca é repintado por recarga: não apaga o que foi digitado. */
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ChevronRight, CircleAlert, MapPin, StickyNote, Tag } from 'lucide-react';
import { clsx } from 'clsx';
import { escrever } from '../../../api/cliente';
import { Tela, useVoltar } from '../../../ui/Tela';
import { BotaoCheio, Campo, Chip, CLASSE_INPUT, Esqueleto, Estado } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { toast } from '../../../ui/toast';
import { textoErro, vibrar } from '../../../util';
import { BotaoQtd, ErroLinha, escolherNaLista, lerMateriais, ultimoSalvo, useMateriais, type Material, type Materiais } from './-comum';

export function TelaFormulario({ id }: { id?: string }) {
  const q = useMateriais({ fresco: true });
  const titulo = id ? 'Editar item' : 'Novo item';
  const it = id ? q.data?.itens.find((i) => i.id === id) : undefined;
  if (!q.data || (id && !it)) {
    return (
      <Tela titulo={titulo} voltar="/materiais">
        {q.data ? <Estado icone={CircleAlert} titulo="Item não encontrado" texto="Volte e abra de novo." />
          : q.isError ? <ErroTela erro={q.error} tentar={() => q.refetch()} /> : <Esqueleto n={4} />}
      </Tela>
    );
  }
  return <Formulario key={id || 'novo'} titulo={titulo} item={it} m={q.data} />;
}

function Formulario({ titulo, item, m }: { titulo: string; item?: Material; m: Materiais }) {
  const qc = useQueryClient();
  const voltar = useVoltar(item ? '/materiais/' + item.id : '/materiais');
  const [f, setF] = useState(() => item
    ? { ...item, categoria: item.categoria === 'Sem categoria' ? '' : item.categoria, quantidade: String(item.quantidade) }
    : {
      item: '', quantidade: '1', categoria: ultimoSalvo.categoria || '', local: ultimoSalvo.local || '',
      estado: 'Bom', finalidade: ultimoSalvo.finalidade || 'Instituto', obs: '',
    });
  const [salvando, setSalvando] = useState(false);
  /* Erro embaixo do campo que precisa de ajuste, não num toast. */
  const [erros, setErros] = useState<{ item?: string; quantidade?: string }>({});
  const mudar = (x: Partial<typeof f>) => {
    setF((a) => ({ ...a, ...x }));
    if ('item' in x || 'quantidade' in x) setErros((e) => ({ ...e, ...('item' in x ? { item: undefined } : {}), ...('quantidade' in x ? { quantidade: undefined } : {}) }));
  };
  const somar = (n: number) => { mudar({ quantidade: String(Math.max(0, (parseInt(f.quantidade, 10) || 0) + n)) }); vibrar(); };

  async function salvar() {
    const dados = {
      item: f.item.trim(), quantidade: parseInt(f.quantidade, 10),
      categoria: f.categoria, local: f.local, estado: f.estado, finalidade: f.finalidade, obs: f.obs.trim(),
    };
    const e: typeof erros = {};
    if (dados.item.length < 2) e.item = 'Escreva o nome do item (pelo menos 2 letras).';
    if (!(dados.quantidade >= 0)) e.quantidade = 'Escreva quantos tem. Pode ser 0.';
    setErros(e);
    if (e.item || e.quantidade) { vibrar(); document.getElementById(e.item ? 'mtNome' : 'mtQtd')?.focus(); return; }
    setSalvando(true);
    try {
      await escrever(item ? 'editarMaterial' : 'criarMaterial', item ? [item.id, dados] : [dados]);
      vibrar();
      Object.assign(ultimoSalvo, { categoria: dados.categoria, local: dados.local, finalidade: dados.finalidade });
      toast(item ? 'Item salvo' : dados.item + ' cadastrado');
      /* Volta com a lista já nova: o item aparece onde a pessoa espera. */
      await qc.fetchQuery({ ...lerMateriais(), staleTime: 0 }).catch(() => {});
      voltar();
    } catch (e) {
      setSalvando(false);
      toast(textoErro(e), 'erro');
    }
  }

  return (
    <Tela titulo={titulo} voltar={item ? '/materiais/' + item.id : '/materiais'}
      barra={<BotaoCheio onClick={salvar} carregando={salvando} className="text-[17px]">{salvando ? 'Salvando…' : 'Salvar item'}</BotaoCheio>}>
      <form onSubmit={(e) => { e.preventDefault(); salvar(); }} noValidate>
        <Campo id="mtNome" rotulo="Nome do item" autoComplete="off" autoCapitalize="sentences" maxLength={120}
          placeholder="Ex.: Ventilador de coluna" autoFocus={!item} enterKeyHint="next" erro={erros.item}
          value={f.item} onChange={(e) => mudar({ item: e.target.value })} />

        <div className="mb-4">
          <label htmlFor="mtQtd" className="mb-2 block text-[13px] font-semibold text-apagado">Quantidade</label>
          <div className="flex items-center gap-2">
            <BotaoQtd onClick={() => somar(-1)} />
            <input id="mtQtd" type="number" inputMode="numeric" min={0} step={1} enterKeyHint="done"
              aria-invalid={erros.quantidade ? true : undefined} aria-describedby={erros.quantidade ? 'mtQtd-erro' : undefined}
              className={clsx(CLASSE_INPUT, 'min-w-0 flex-1 text-center text-xl font-bold tabular-nums',
                erros.quantidade && 'border-falta focus:border-falta focus:ring-falta-fraco')}
              value={f.quantidade} onChange={(e) => mudar({ quantidade: e.target.value })} />
            <BotaoQtd mais onClick={() => somar(1)} />
          </div>
          <ErroLinha id="mtQtd" erro={erros.quantidade} />
        </div>

        <Escolha rotulo="Categoria" icone={Tag} valor={f.categoria}
          onClick={() => escolherNaLista('categoria', m.categorias, f.categoria, (v) => mudar({ categoria: v }))} />
        <Escolha rotulo="Onde fica" icone={MapPin} valor={f.local}
          onClick={() => escolherNaLista('local', m.locais, f.local, (v) => mudar({ local: v }))} />

        <Chips rotulo="Estado" valores={m.estados} valor={f.estado} onChange={(v) => mudar({ estado: v })} />
        <Chips rotulo="Para que serve" valores={m.finalidades} valor={f.finalidade}
          nome={(x) => (x === 'Ambos' ? 'Ambos (instituto e bazar)' : x)} onChange={(v) => mudar({ finalidade: v })} />

        <Campo id="mtObs" rotulo={<>Observação <i className="font-normal not-italic">(opcional)</i></>}
          autoComplete="off" icone={StickyNote} enterKeyHint="done" maxLength={500} placeholder="Ex.: falta uma das pás"
          value={f.obs} onChange={(e) => mudar({ obs: e.target.value })} />
        <button type="submit" hidden />
      </form>
    </Tela>
  );
}

function Escolha({ rotulo, valor, onClick, icone: Ic }: { rotulo: string; valor: string; onClick: () => void; icone: typeof Tag }) {
  return (
    <div className="mb-4">
      <span className="mb-2 block text-[13px] font-semibold text-apagado">{rotulo}</span>
      <button type="button" onClick={onClick} aria-label={rotulo + ': ' + (valor || 'escolher ou criar')}
        className="flex min-h-13 w-full items-center gap-3 rounded-m border border-borda bg-papel px-4 py-3 text-left text-base active:bg-fundo">
        <Ic size={20} className="shrink-0 text-apagado" />
        <span className={clsx('min-w-0 flex-1 truncate', !valor && 'text-apagado')}>{valor || 'Escolher ou criar'}</span>
        <ChevronRight size={18} className="shrink-0 text-apagado" />
      </button>
    </div>
  );
}

function Chips({ rotulo, valores, valor, onChange, nome = (x) => x }: {
  rotulo: string; valores: string[]; valor: string; onChange: (v: string) => void; nome?: (x: string) => string;
}) {
  return (
    <div className="mb-4">
      <span className="mb-2 block text-[13px] font-semibold text-apagado">{rotulo}</span>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={rotulo}>
        {valores.map((v) => (
          <Chip key={v} ligado={valor === v} role="radio" aria-checked={valor === v} aria-pressed={undefined}
            onClick={() => { onChange(v); vibrar(); }}>{nome(v)}</Chip>
        ))}
      </div>
    </div>
  );
}
