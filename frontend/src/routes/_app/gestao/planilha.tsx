/* A planilha que serve de banco: abrir, compartilhar e padronizar. */
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { CircleAlert, Copy, ExternalLink, Share2, Sheet, WandSparkles } from 'lucide-react';
import { leitura } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { Aviso, BotaoCheio, BotaoContorno, CARTAO, Esqueleto, Secao } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { toast } from '../../../ui/toast';
import { copiarTexto, vibrar } from '../../../util';
import { gravar, partilhar } from './-comum';

export const Route = createFileRoute('/_app/gestao/planilha')({ component: Planilha });

function Planilha() {
  const q = useQuery(leitura<{ url: string; nome: string }>('obterLinkPlanilha'));
  const [arrumando, setArrumando] = useState(false);
  const d = q.data;

  const copiar = async () => { if (d && await copiarTexto(d.url)) { vibrar(); toast('Link copiado'); } };
  async function arrumar() {
    setArrumando(true);
    await gravar('arrumarPlanilha', [], 'Planilha arrumada. O Painel está na primeira aba.');
    setArrumando(false);
  }

  return (
    <Tela titulo="Planilha" voltar="/gestao">
      {d ? (
        <>
          <div className={CARTAO + ' mb-3 p-5 text-center text-roxo'}>
            <Sheet size={26} className="mx-auto" />
            <b className="mt-3 mb-1 block text-[17px] font-bold text-tinta [overflow-wrap:anywhere]">{d.nome}</b>
            <span className="block text-sm leading-normal text-apagado">
              Todo dado do app mora aqui. A aba Painel mostra a frequência por turma e por dia.
            </span>
          </div>
          <a href={d.url} target="_blank" rel="noopener"
            className="flex min-h-13 w-full items-center justify-center gap-2 rounded-m bg-roxo p-4 text-base font-bold text-white active:bg-roxo-fundo">
            <ExternalLink size={18} /> Abrir planilha
          </a>
          <div className="mt-2 flex gap-2">
            <BotaoContorno icone={Copy} onClick={copiar} className="flex-1 px-2">Copiar link</BotaoContorno>
            {'share' in navigator && (
              <BotaoContorno icone={Share2} className="flex-1 px-2"
                onClick={() => partilhar({ title: d.nome, url: d.url }, copiar)}>Compartilhar</BotaoContorno>
            )}
          </div>
          <Aviso icone={CircleAlert} className="mt-5">
            O link sozinho não libera nada. Quem abrir precisa já ter permissão. Para dar acesso a alguém, use o botão
            Compartilhar dentro da própria planilha.
          </Aviso>

          <Secao>Padronizar</Secao>
          <div className={CARTAO + ' mb-3 p-5 text-sm leading-normal text-apagado'}>
            Deixa cabeçalho, larguras, cores, listas de SIM/NAO e o Painel no padrão. Pode rodar quantas vezes quiser,
            não duplica nada.
          </div>
          <BotaoCheio icone={WandSparkles} onClick={arrumar} disabled={arrumando}>
            {arrumando ? 'Arrumando…' : 'Arrumar planilha'}
          </BotaoCheio>
        </>
      ) : q.isError ? <ErroTela erro={q.error} tentar={() => q.refetch()} /> : <Esqueleto n={2} />}
    </Tela>
  );
}
