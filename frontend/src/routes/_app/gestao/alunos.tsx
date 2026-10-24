/* Todos os alunos, de todas as turmas. Busca por nome ou turma. */
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { leitura } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { Busca, Esqueleto, Estado, Filtro } from '../../../ui/kit';
import { CabecalhoSecao } from '../../../ui/Heroi';
import { ErroTela } from '../../../ui/ErroTela';
import { plural, semAcento, vibrar } from '../../../util';
import type { Aluno } from './-comum';
import { LinhasAlunos } from './-alunos';

export const Route = createFileRoute('/_app/gestao/alunos')({ component: Alunos });

type Aba = 'ativos' | 'inativos';

function Alunos() {
  const q = useQuery(leitura<Aluno[]>('listarAlunos', '', true));
  const [aba, setAba] = useState<Aba>('ativos');
  const [busca, setBusca] = useState('');
  /* Digitação rápida filtra quando o dedo para, sem travar o teclado. */
  const b = semAcento(useDeferredValue(busca));

  const lista = useMemo(() => (q.data || []).filter((a) =>
    (aba === 'ativos' ? a.ativo : !a.ativo) &&
    (!b || semAcento(a.nome).includes(b) || semAcento(a.turma).includes(b))), [q.data, aba, b]);

  return (
    <Tela titulo="Alunos" voltar="/gestao">
      <Busca placeholder="Procurar pelo nome" aria-label="Procurar aluno" value={busca}
        onChange={(e) => setBusca(e.target.value)} />
      <Filtro<Aba> valor={aba} onChange={(v) => { setAba(v); vibrar(); }}
        opcoes={[{ v: 'ativos', txt: 'Na chamada' }, { v: 'inativos', txt: 'Inativos' }]} />
      {q.data ? (
        lista.length ? (
          <>
            <CabecalhoSecao titulo={b ? plural(lista.length, 'encontrado', 'encontrados') : plural(lista.length, 'aluno', 'alunos')} />
            <LinhasAlunos lista={lista} mostrarTurma />
          </>
        ) : b ? (
          <Estado icone={Search} titulo="Ninguém com esse nome" texto="Confira a escrita ou troque para a outra aba." />
        ) : (
          <Estado icone={Users}
            titulo={aba === 'ativos' ? 'Nenhum aluno na chamada' : 'Nenhum aluno inativo'}
            texto={aba === 'ativos' ? 'Cadastre alunos dentro de cada turma.' : 'Todo mundo cadastrado está na chamada.'} />
        )
      ) : q.isError ? <ErroTela erro={q.error} tentar={() => q.refetch()} /> : <Esqueleto n={5} />}
    </Tela>
  );
}
