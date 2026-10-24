/* Ficha da turma: os alunos dela, renomear e arquivar. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Archive, CalendarClock, ChevronRight, Pencil, Plus, QrCode, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { leitura } from '../../../../api/cliente';
import { Tela, useVoltar } from '../../../../ui/Tela';
import { BotaoCheio, Esqueleto, Estado } from '../../../../ui/kit';
import { Atalhos, CabecalhoSecao } from '../../../../ui/Heroi';
import { ErroTela } from '../../../../ui/ErroTela';
import { folha } from '../../../../ui/folha';
import { plural } from '../../../../util';
import { gravar, type Aluno } from '../-comum';
import { LinhasAlunos, novoAluno } from '../-alunos';

export const Route = createFileRoute('/_app/gestao/turmas/$turma')({ component: FichaTurma });

function FichaTurma() {
  const { turma } = Route.useParams();
  const navigate = useNavigate();
  const voltar = useVoltar('/gestao/turmas');
  const q = useQuery(leitura<Aluno[]>('listarAlunos', turma, true));
  const [verInativos, setVerInativos] = useState(false);
  const ativos = (q.data || []).filter((a) => a.ativo);
  const inativos = (q.data || []).filter((a) => !a.ativo);

  function renomear() {
    folha.pedirTexto('Renomear turma', 'Novo nome', turma, 'Renomear', async (novo) => {
      if (await gravar('renomearTurma', [turma, novo], 'Turma renomeada para ' + novo)) {
        navigate({ to: '/gestao/turmas/$turma', params: { turma: novo }, replace: true });
      }
    });
  }
  function arquivar() {
    /* Não é erro, é um passo que falta: explica numa folha, sem toast vermelho. */
    if (ativos.length) {
      folha.abrir('Antes de arquivar', (fechar) => (
        <>
          <p className="mx-2 mb-4 text-[15px] leading-normal text-apagado">
            {turma} ainda tem {plural(ativos.length, 'aluno', 'alunos')} na chamada. Mova cada um para outra turma
            ou desative (toque no nome do aluno). Depois, a turma pode ser arquivada.
          </p>
          <div className="px-2"><BotaoCheio onClick={fechar}>Entendi</BotaoCheio></div>
        </>
      ));
      return;
    }
    folha.confirmar('Arquivar turma',
      'A turma ' + turma + ' sai da lista de chamada. As chamadas antigas dela continuam guardadas.',
      'Arquivar', async () => { if (await gravar('arquivarTurma', [turma], 'Turma ' + turma + ' arquivada')) voltar(); });
  }

  return (
    <Tela titulo={turma} voltar="/gestao/turmas"
      barra={<BotaoCheio icone={Plus} onClick={() => novoAluno(turma)}>Adicionar aluno</BotaoCheio>}>
      {q.data ? (
        <>
          {/* As ações da turma como atalhos, igual ao Início. Adicionar aluno,
              a mais usada, fica na barra de baixo. */}
          <Atalhos itens={[
            { icone: Pencil, texto: 'Renomear', onClick: renomear },
            { icone: QrCode, texto: 'QR da turma', to: '/gestao/qr/ver', search: { turma } },
            { icone: CalendarClock, texto: 'Grade de aulas', to: '/grade' },
            { icone: Archive, texto: 'Arquivar', onClick: arquivar },
          ]} />
          {ativos.length ? (
            <>
              <CabecalhoSecao titulo={plural(ativos.length, 'aluno na chamada', 'alunos na chamada')} />
              <LinhasAlunos lista={ativos} />
            </>
          ) : (
            <Estado icone={Users} titulo="Ninguém nesta turma ainda" texto='Toque em "Adicionar aluno", aqui embaixo, para montar a lista da chamada.' />
          )}
          {inativos.length > 0 && (
            <>
              <button type="button" aria-expanded={verInativos} onClick={() => setVerInativos(!verInativos)}
                className="flex min-h-13 w-full items-center gap-2 px-1 text-sm font-semibold text-apagado">
                <ChevronRight size={18} className={clsx('transition-transform duration-200 ease-curva', verInativos && 'rotate-90')} />
                {plural(inativos.length, 'aluno inativo', 'alunos inativos')}
              </button>
              {verInativos && <LinhasAlunos lista={inativos} />}
            </>
          )}
        </>
      ) : q.isError ? <ErroTela erro={q.error} tentar={() => q.refetch()} /> : <Esqueleto n={4} />}
    </Tela>
  );
}
