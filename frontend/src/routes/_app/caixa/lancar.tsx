/* Lançar uma entrada ou uma saída.

   No app HTML era uma folha. Aqui é tela inteira: são seis campos, e
   numa folha de 80% da tela o teclado do celular cobria o botão de
   salvar. Tela inteira tem o botão fixo no rodapé, acima do teclado, e
   o voltar do Android cancela como qualquer outra tela. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Camera, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { escrever, leitura } from '../../../api/cliente';
import { useSessao } from '../../../sessao';
import { Tela } from '../../../ui/Tela';
import { Campo, Chip, Osso } from '../../../ui/kit';
import { toast } from '../../../ui/toast';
import { hojeISO, textoErro, vibrar } from '../../../util';
import { reduzirFoto } from './-foto';
import type { MesCaixa, TipoLanc } from './-tipos';

export const Route = createFileRoute('/_app/caixa/lancar')({
  validateSearch: (s: Record<string, unknown>): { tipo: TipoLanc } => ({ tipo: s.tipo === 'Saída' ? 'Saída' : 'Entrada' }),
  component: Lancar,
});

type Foto = { estado: 'nada' | 'reduzindo' | 'pronta' | 'falhou'; dados: string };

function Lancar() {
  const { tipo } = Route.useSearch();
  const entrada = tipo === 'Entrada';
  const navigate = useNavigate();
  const { usuario } = useSessao();

  /* Categorias e fontes vêm com a lista do mês atual, que a tela do
     Caixa acabou de buscar: quase sempre já estão no cache. */
  const mes = useQuery({ ...leitura<MesCaixa>('listarCaixa', hojeISO().slice(0, 7)), staleTime: 300_000 });
  const cats = mes.data?.categorias?.[tipo] || [];
  const fontes = mes.data?.fontes || [];

  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fonte, setFonte] = useState('');
  const [data, setData] = useState(hojeISO());
  const [foto, setFoto] = useState<Foto>({ estado: 'nada', dados: '' });
  const [salvando, setSalvando] = useState(false);
  const campoValor = useRef<HTMLInputElement>(null);

  /* A primeira categoria vem marcada, como no app HTML. Só quando elas
     chegam; depois disso, nunca mais mexe na escolha. */
  useEffect(() => { if (!categoria && cats.length) setCategoria(cats[0]); }, [categoria, cats]);
  useEffect(() => { const t = setTimeout(() => campoValor.current?.focus(), 200); return () => clearTimeout(t); }, []);

  async function escolherFoto(f: File | undefined) {
    if (!f) return;
    setFoto({ estado: 'reduzindo', dados: '' });
    const d = await reduzirFoto(f);
    setFoto(d ? { estado: 'pronta', dados: d } : { estado: 'falhou', dados: '' });
  }

  async function salvar() {
    if (!valor.trim()) { toast('Escreva o valor.', 'erro'); campoValor.current?.focus(); return; }
    if (foto.estado === 'reduzindo') { toast('Espere a foto ficar pronta.', 'erro'); return; }
    setSalvando(true);
    /* A tela fica aberta até o servidor confirmar. Fechar antes fazia um
       4G que cai apagar valor, descrição e a foto da nota que acabou de
       ser tirada — e ela teria que fotografar de novo. */
    try {
      const r = await escrever<{ ok: boolean; comFoto: boolean; pediuFoto: boolean }>('lancarCaixa', [{
        tipo, valor: valor.trim(), categoria: categoria || 'Outro',
        descricao: descricao.trim(), fonte: fonte.trim(), data: data || hojeISO(),
        quem: usuario?.nome || '', foto: foto.dados,
      }], { prazo: foto.dados ? 60000 : 25000 });
      vibrar();
      toast(entrada ? 'Entrada registrada' : 'Saída registrada' + (r.pediuFoto && !r.comFoto ? ' — a foto não subiu' : ''));
      navigate({ to: '/caixa', search: {}, replace: true });
    } catch (e) {
      setSalvando(false);
      toast(textoErro(e), 'erro');
    }
  }

  return (
    <Tela
      titulo={entrada ? 'Entrou dinheiro' : 'Saiu dinheiro'}
      voltar="/caixa"
      barra={
        <button type="button" onClick={salvar} disabled={salvando}
          className={clsx('flex min-h-13 w-full items-center justify-center gap-2 rounded-m p-4 text-[17px] font-bold text-white',
            'transition-colors duration-150 disabled:bg-roxo-apagado',
            entrada ? 'bg-presente active:bg-presente-fundo' : 'bg-falta active:bg-falta-fundo')}>
          {salvando ? 'Salvando…' : entrada ? 'Salvar entrada' : 'Salvar saída'}
        </button>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); salvar(); }} noValidate>
        <div className="mb-4">
          <label htmlFor="cxValor" className="mb-2 block text-[13px] font-semibold text-apagado">Valor</label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg font-bold text-apagado">R$</span>
            <input id="cxValor" ref={campoValor} type="text" inputMode="decimal" placeholder="0,00" autoComplete="off"
              value={valor} onChange={(e) => setValor(e.target.value.replace(/[^0-9.,]/g, ''))}
              className={clsx('min-h-14 w-full rounded-m border border-borda bg-papel py-3 pr-4 pl-13 text-2xl font-bold tabular-nums text-tinta',
                'focus:border-roxo focus:ring-3 focus:ring-roxo-fraco focus:outline-none')} />
          </div>
        </div>

        <div className="mb-4">
          <span className="mb-2 block text-[13px] font-semibold text-apagado">Categoria</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Categoria">
            {cats.length ? cats.map((c) => (
              <Chip key={c} ligado={categoria === c} role="radio" aria-checked={categoria === c}
                onClick={() => { setCategoria(c); vibrar(); }}>{c}</Chip>
            )) : mes.isError ? (
              <span className="text-sm text-apagado">Sem a lista de categorias agora: vai como "Outro".</span>
            ) : (
              [64, 88, 72, 96].map((w) => <Osso key={w} className="h-11 rounded-full" style={{ width: w }} />)
            )}
          </div>
        </div>

        <Campo id="cxDesc" rotulo={<>Do que se trata <i className="font-normal not-italic text-apagado">(opcional)</i></>}
          autoComplete="off" placeholder={entrada ? 'doação da vizinha do bazar' : 'sapatilhas do infantil'}
          value={descricao} onChange={(e) => setDescricao(e.target.value)} />

        <Campo id="cxFonte" rotulo={<>Fonte <i className="font-normal not-italic text-apagado">(opcional)</i></>}
          autoComplete="off" list="cxFontes" placeholder={entrada ? 'de onde veio' : 'que bolso pagou'}
          value={fonte} onChange={(e) => setFonte(e.target.value)}
          dica="Separa dinheiro de edital do resto. É isso que a prestação de contas cobra." />
        <datalist id="cxFontes">{fontes.map((f) => <option key={f} value={f} />)}</datalist>

        {!entrada && (
          <div className="mb-4">
            <span className="mb-2 block text-[13px] font-semibold text-apagado">Comprovante</span>
            <label htmlFor="cxFoto"
              className={clsx('flex min-h-13 cursor-pointer items-center justify-center gap-2 rounded-m border px-4 py-3 text-center text-[15px] font-semibold',
                foto.estado === 'pronta' ? 'border-presente bg-presente-fraco text-presente' : 'border-dashed border-borda bg-fundo text-apagado')}>
              {foto.estado === 'pronta' ? <Check size={20} /> : <Camera size={20} />}
              <span>
                {foto.estado === 'reduzindo' ? 'Reduzindo a foto…'
                  : foto.estado === 'pronta' ? 'Foto pronta — tocar para trocar'
                    : foto.estado === 'falhou' ? 'Não deu para ler a foto. Salve sem ela.'
                      : 'Fotografar a nota'}
              </span>
            </label>
            <input id="cxFoto" type="file" accept="image/*" capture="environment" hidden
              onChange={(e) => escolherFoto(e.target.files?.[0])} />
            <span className="mt-2 block text-[13px] leading-normal text-apagado">Despesa sem nota não entra na prestação de contas.</span>
          </div>
        )}

        <Campo id="cxData" rotulo="Quando" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        <button type="submit" hidden />
      </form>
    </Tela>
  );
}
