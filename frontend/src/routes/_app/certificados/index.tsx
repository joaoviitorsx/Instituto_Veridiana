/* Certificados: primeiro a turma. O certificado conta as aulas em que a
   aluna esteve presente. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Medal, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { leitura } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { GrupoNav, Esqueleto, Estado } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { plural } from '../../../util';
import { CabecalhoSecao, CARTAO_ELEVADO } from '../../../ui/Heroi';

export type TurmaCompleta = { nome: string; ativos: number; inativos: number };

export const Route = createFileRoute('/_app/certificados/')({ component: Certificados });

function Certificados() {
  const navigate = useNavigate();
  const q = useQuery(leitura<TurmaCompleta[]>('listarTurmasCompleto'));
  const ts = q.data;

  let corpo;
  if (q.isError && !ts) corpo = <ErroTela erro={q.error} tentar={() => q.refetch()} />;
  else if (!ts) corpo = <Esqueleto n={4} />;
  else if (!ts.length) corpo = <Estado icone={ClipboardList} titulo="Nenhuma turma ainda" texto="Crie a primeira turma em Gestão → Turmas. Depois das primeiras chamadas, os certificados aparecem aqui." />;
  else {
    corpo = (
      <>
        {/* Cartão principal (DNA do Início): o que é o documento, antes da escolha. */}
        <div className={clsx(CARTAO_ELEVADO, 'mb-2 flex items-start gap-3 p-4')}>
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-roxo text-white"><Medal size={24} /></span>
          <span className="min-w-0 leading-snug">
            <b className="block text-[17px] font-bold tracking-tight">Certificado de participação</b>
            <span className="mt-0.5 block text-sm text-apagado">
              PDF com as aulas e as horas em que a aluna esteve presente. Serve para Jovem Aprendiz, escola e programas sociais.
            </span>
          </span>
        </div>
        <CabecalhoSecao titulo="Escolha a turma" className="mt-3" />
        <GrupoNav itens={ts.map((t) => ({
          icone: Users, titulo: t.nome, sub: plural(t.ativos, 'aluno', 'alunos'),
          onClick: () => navigate({ to: '/certificados/$turma', params: { turma: t.nome } }),
        }))} />
      </>
    );
  }
  return <Tela titulo="Certificados" voltar="/">{corpo}</Tela>;
}
