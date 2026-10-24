/* O cartaz: QR grande, o nome da turma (ou do instituto) e o que fazer.
   Imprime nítido em qualquer tamanho: é vetor. */
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Copy, Printer, Share2 } from 'lucide-react';
import { leitura } from '../../../../api/cliente';
import { Tela } from '../../../../ui/Tela';
import { Banner, BotaoCheio, BotaoContorno, CARTAO, Esqueleto, Filtro } from '../../../../ui/kit';
import { toast } from '../../../../ui/toast';
import { copiarTexto, vibrar } from '../../../../util';
import { partilhar } from '../-comum';
import { caminhoQr } from '../-qr';

type Busca = { turma?: string; antigo?: 1 };

export const Route = createFileRoute('/_app/gestao/qr/ver')({
  validateSearch: (s: Record<string, unknown>): Busca => ({
    turma: typeof s.turma === 'string' && s.turma ? s.turma.slice(0, 120) : undefined,
    antigo: s.antigo ? 1 : undefined,
  }),
  component: Cartaz,
});

function comParametro(url: string, nome: string, valor: string) {
  return url + (url.indexOf('?') === -1 ? '?' : '&') + nome + '=' + encodeURIComponent(valor);
}

function Cartaz() {
  const { turma, antigo } = Route.useSearch();
  const navigate = Route.useNavigate();
  /* O endereço do app antigo só é pedido se alguém escolher vê-lo. */
  const exec = useQuery({ ...leitura<string>('obterUrlApp'), enabled: !!antigo, staleTime: 600_000 });

  const base = antigo ? exec.data || '' : location.origin + '/';
  const url = base && turma ? comParametro(base, 'turma', turma) : base;
  const qr = useMemo(() => (url ? caminhoQr(url) : null), [url]);

  const copiar = async () => { if (await copiarTexto(url)) { vibrar(); toast('Link copiado'); } };
  const compartilhar = () => partilhar(turma
    ? { title: 'Chamada · ' + turma, text: 'Chamada da turma ' + turma, url }
    : { title: 'Instituto Veridiana', text: 'App do Instituto Veridiana', url }, copiar);

  return (
    <Tela titulo={turma || 'QR do app'} voltar="/gestao/qr">
      {/* Na impressão sai só o cartaz. */}
      <style>{'@media print{header,.sem-impressao{display:none!important}body{background:#fff!important}}'}</style>

      <div className="sem-impressao">
        <Filtro<'novo' | 'antigo'> valor={antigo ? 'antigo' : 'novo'}
          onChange={(v) => navigate({ search: { turma, antigo: v === 'antigo' ? 1 : undefined }, replace: true })}
          opcoes={[{ v: 'novo', txt: 'App novo' }, { v: 'antigo', txt: 'App antigo' }]} />
        {antigo && (
          <p className="mx-1 -mt-1 mb-4 text-[13px] leading-normal text-apagado">
            O link antigo do Google (/exec). Use só se o app novo der problema em algum celular.
          </p>
        )}
      </div>

      {antigo && exec.isPending ? <Esqueleto n={2} /> : antigo && !url ? (
        <Banner tom="atencao" titulo="Falta o endereço do app antigo">
          Na planilha, abra o menu Veridiana → "Configurar endereço do app". É uma vez só.
        </Banner>
      ) : qr && (
        <>
          <div className={CARTAO + ' mb-4 p-6 text-center print:border-0 print:shadow-none'}>
            <p className="mb-4 text-[21px] font-bold tracking-tight [overflow-wrap:anywhere]">{turma || 'Instituto Veridiana'}</p>
            <svg viewBox={`0 0 ${qr.tot} ${qr.tot}`} xmlns="http://www.w3.org/2000/svg" role="img"
              aria-label={turma ? 'Código QR da chamada de ' + turma : 'Código QR do app'}
              className="mx-auto block h-auto w-full max-w-[280px] [shape-rendering:crispEdges]">
              <rect width={qr.tot} height={qr.tot} fill="#fff" />
              <path d={qr.d} fill="#1B1020" />
            </svg>
            <p className="mt-4 text-[13px] font-semibold text-apagado">
              {turma
                ? 'INSTITUTO VERIDIANA · aponte a câmera para fazer a chamada'
                : 'Aponte a câmera, entre com seu e-mail e adicione à tela inicial'}
            </p>
            {antigo && <p className="mt-1 text-xs text-apagado">link antigo</p>}
          </div>

          <div className="sem-impressao">
            <div className="flex gap-2">
              {'share' in navigator && <BotaoCheio icone={Share2} onClick={compartilhar} className="flex-1 px-2">Compartilhar</BotaoCheio>}
              <BotaoContorno icone={Copy} onClick={copiar} className="flex-1 px-2">Copiar link</BotaoContorno>
            </div>
            <BotaoContorno icone={Printer} onClick={() => window.print()} className="mt-2">Imprimir</BotaoContorno>
            <p className="mx-1 mt-4 text-[13px] leading-normal text-apagado [overflow-wrap:anywhere]">{url}</p>
            {!turma && !antigo && (
              <p className="mx-1 mt-3 text-[13px] leading-normal text-apagado">
                Para instalar: no iPhone, Safari → Compartilhar → Adicionar à Tela de Início. No Android, o app oferece
                "Instalar o app" na tela inicial, ou menu ⋮ → Adicionar à tela inicial.
              </p>
            )}
          </div>
        </>
      )}
    </Tela>
  );
}
