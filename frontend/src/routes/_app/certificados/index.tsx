/* Certificados: primeiro a turma. O certificado conta as aulas em que a
   aluna esteve presente. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { leitura } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { CartaoNav, Esqueleto, Estado } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { plural } from '../../../util';
import { Intro } from '../gestao/-relatorios';

export type TurmaCompleta = { nome: string; ativos: number; inativos: number };

export const Route = createFileRoute('/_app/certificados/')({ component: Certificados });

function Certificados() {
  const navigate = useNavigate();
  const q = useQuery(leitura<TurmaCompleta[]>('listarTurmasCompleto'));
  const ts = q.data;

  let corpo;
  if (q.isError && !ts) corpo = <ErroTela erro={q.error} tentar={() => q.refetch()} />;
  else if (!ts) corpo = <Esqueleto n={4} />;
  else if (!ts.length) corpo = <Estado icone={ClipboardList} titulo="Nenhuma turma ainda" texto="Crie uma turma para emitir certificados." />;
  else {
    corpo = (
      <>
        <Intro>Escolha a turma. O certificado conta as aulas em que a aluna esteve presente.</Intro>
        <ul>
          {ts.map((t) => (
            <CartaoNav key={t.nome} titulo={t.nome} sub={plural(t.ativos, 'aluno', 'alunos')}
              onClick={() => navigate({ to: '/certificados/$turma', params: { turma: t.nome } })} />
          ))}
        </ul>
      </>
    );
  }
  return <Tela titulo="Certificados" voltar="/">{corpo}</Tela>;
}
