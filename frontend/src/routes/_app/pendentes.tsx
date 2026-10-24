/* O que está guardado no celular e ainda não chegou na planilha. */
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { CircleCheck, CloudUpload, Copy, RefreshCw, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { enviarAgora, useFila } from '../../offline/envio';
import { forcarItem, reativarItem, tirarDaFila, type ItemFila } from '../../offline/fila';
import { useOnline } from '../../offline/rede';
import { Tela } from '../../ui/Tela';
import { BotaoCheio, CARTAO, Estado, Banner } from '../../ui/kit';
import { folha } from '../../ui/folha';
import { toast } from '../../ui/toast';
import { copiarTexto, dataCurta, dataExtenso, hojeISO, plural } from '../../util';

export const Route = createFileRoute('/_app/pendentes')({ component: Pendentes });

function Pendentes() {
  const itens = useFila();
  const online = useOnline();
  const [indo, setIndo] = useState(false);

  async function tentar() {
    if (!online) { toast('Ainda sem internet. Vai enviar sozinha quando voltar.', 'info'); return; }
    setIndo(true);
    const n = await enviarAgora().finally(() => setIndo(false));
    if (!n) toast('Não foi agora. Continua guardada no celular.', 'info');
  }

  return (
    <Tela titulo="Esperando internet" voltar="/"
      barra={itens.some((i) => i.situacao === 'pendente') && (
        <BotaoCheio icone={RefreshCw} onClick={tentar} carregando={indo}>{indo ? 'Enviando…' : 'Tentar enviar agora'}</BotaoCheio>
      )}>
      {itens.length ? (
        <>
          <Banner tom="atencao" titulo={plural(itens.length, 'chamada guardada', 'chamadas guardadas') + ' neste celular'}>
            Até chegarem na planilha, não desinstale o app nem limpe os dados do navegador: é aqui que elas estão.
          </Banner>
          <ul>{itens.map((i) => <Item key={i.token} i={i} />)}</ul>
        </>
      ) : (
        <Estado icone={CircleCheck} titulo="Tudo enviado"
          texto="Todas as chamadas feitas neste celular já estão na planilha." />
      )}
    </Tela>
  );
}

function Item({ i }: { i: ItemFila }) {
  const presentes = i.presencas.filter((p) => p.status === 'Presente').length;
  const dia = hojeISO(new Date(i.registro));
  const hora = new Date(i.registro).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const precisaDecidir = i.situacao !== 'pendente';

  function descartar() {
    folha.confirmar('Descartar esta chamada?',
      'Ela sai do celular e não vai para a planilha. Antes, copie a lista se ainda precisar dela.',
      'Descartar', () => tirarDaFila(i.token).then(() => toast('Chamada descartada')));
  }
  async function copiar() {
    const txt = 'Chamada ' + i.turma + ' — ' + dataExtenso(dia) + ', ' + hora + '\nProfessora: ' + i.professor + '\n\n' +
      i.presencas.map((p) => p.aluno + ': ' + p.status).join('\n');
    if (await copiarTexto(txt)) toast('Lista copiada');
  }

  return (
    <li className={clsx(CARTAO, 'mb-3 rounded-2xl p-4')}>
      {/* DNA: coluna fixa à esquerda (quando), o quê no meio, selo escrito à direita. */}
      <div className="flex items-center gap-3">
        <span className="flex w-[58px] shrink-0 flex-col items-start leading-tight tabular-nums">
          <b className="text-[17px] font-extrabold tracking-tight">{dataCurta(dia)}</b>
          <span className="text-[13px] font-medium text-apagado">{hora}</span>
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-base leading-tight [overflow-wrap:anywhere]">{i.turma}</b>
          <span className="block text-[13px] text-apagado">
            {presentes} de {i.presencas.length} presentes · {i.professor}
            {i.tentativas > 0 && ' · ' + plural(i.tentativas, 'tentativa', 'tentativas')}
          </span>
        </div>
        <span className={clsx('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap',
          precisaDecidir ? 'bg-falta-fraco text-falta' : 'bg-roxo-fraco text-roxo')}>
          {!precisaDecidir && <CloudUpload size={13} strokeWidth={2.5} />}
          {i.situacao === 'pendente' ? 'Esperando' : i.situacao === 'duplicada' ? 'Duplicada' : i.situacao === 'antiga' ? 'Antiga' : 'Recusada'}
        </span>
      </div>
      {/* O que fazer, em palavras de quem está com o celular na mão. */}
      {i.situacao === 'duplicada' && (
        <Banner tom="atencao" className="mt-3 mb-0!" titulo="Já tem chamada desta turma neste dia">
          Alguém salvou antes. Se esta é outra aula, toque em "Gravar mesmo assim". Se é a mesma, descarte.
        </Banner>
      )}
      {i.situacao === 'antiga' && (
        <Banner tom="erro" className="mt-3 mb-0!" titulo="Ficou antiga demais para enviar">
          {i.erro} Copie a lista e mande para a coordenação.
        </Banner>
      )}
      {i.situacao === 'recusada' && (
        <Banner tom="erro" className="mt-3 mb-0!" titulo="A planilha não aceitou">{i.erro}</Banner>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {i.situacao === 'duplicada' && (
          <Acao onClick={() => folha.confirmar('Gravar mesmo assim?',
            'A turma vai ficar com duas chamadas neste dia e contar em dobro nos relatórios.',
            'Gravar assim mesmo', () => forcarItem(i.token).then(() => enviarAgora()))}>Gravar mesmo assim</Acao>
        )}
        {i.situacao === 'recusada' && <Acao onClick={() => reativarItem(i.token).then(() => enviarAgora())}>Tentar de novo</Acao>}
        <Acao onClick={copiar}><Copy size={16} /> Copiar lista</Acao>
        <Acao onClick={descartar} perigo><Trash2 size={16} /> Descartar</Acao>
      </div>
    </li>
  );
}

function Acao({ children, onClick, perigo }: { children: React.ReactNode; onClick: () => void; perigo?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={clsx('inline-flex min-h-11 items-center gap-1.5 rounded-full border border-borda bg-fundo px-3.5 text-sm font-semibold',
        perigo ? 'text-falta' : 'text-roxo')}>
      {children}
    </button>
  );
}
