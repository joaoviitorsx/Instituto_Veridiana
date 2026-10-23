/* Ficha da turma: os alunos dela, renomear e arquivar. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Archive, ChevronRight, Pencil, Plus, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { leitura } from '../../../../api/cliente';
import { Tela, useVoltar } from '../../../../ui/Tela';
import { BotaoCheio, BotaoContorno, Esqueleto, Estado, Secao } from '../../../../ui/kit';
import { ErroTela } from '../../../../ui/ErroTela';
import { folha } from '../../../../ui/folha';
import { toast } from '../../../../ui/toast';
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
    if (ativos.length) { toast('Mova ou desative os alunos antes de arquivar.', 'erro'); return; }
    folha.confirmar('Arquivar turma',
      'A turma ' + turma + ' sai da lista de chamada. As chamadas antigas dela continuam guardadas.',
      'Arquivar', async () => { if (await gravar('arquivarTurma', [turma], 'Turma ' + turma + ' arquivada')) voltar(); });
  }

  return (
    <Tela titulo={turma} voltar="/gestao/turmas"
      barra={<BotaoCheio icone={Plus} onClick={() => novoAluno(turma)}>Adicionar aluno</BotaoCheio>}>
      {q.data ? (
        <>
          <div className="mb-5 flex gap-2">
            <BotaoContorno icone={Pencil} onClick={renomear} className="flex-1 px-2">Renomear</BotaoContorno>
            <BotaoContorno icone={Archive} onClick={arquivar} className="flex-1 px-2">Arquivar</BotaoContorno>
          </div>
          {ativos.length ? (
            <>
              <Secao>{plural(ativos.length, 'aluno', 'alunos')}</Secao>
              <LinhasAlunos lista={ativos} />
            </>
          ) : (
            <Estado icone={Users} titulo="Turma sem alunos" texto='Toque em "Adicionar aluno" aqui embaixo.' />
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
