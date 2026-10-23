/* Escolher a turma. Sem internet, vale a lista guardada no celular. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { CloudOff, Users } from 'lucide-react';
import { leitura } from '../../../api/cliente';
import { FaixaSemInternet, useOnline, usandoCopia } from '../../../offline/rede';
import { Tela, Capa } from '../../../ui/Tela';
import { CartaoNav, Esqueleto, Estado } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';

export const Route = createFileRoute('/_app/chamada/')({ component: Turmas });

function Turmas() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const online = useOnline();
  const q = useQuery(leitura<string[]>('listarTurmas'));
  const turmas = q.data;

  /* Quem abriu a lista vai tocar numa turma. Vão todas por trás: a
     chamada abre sem espera, e cada turma fica guardada no celular para
     a chamada funcionar sem internet. */
  useEffect(() => {
    if (!turmas || !online) return;
    turmas.slice(0, 16).forEach((t) => qc.prefetchQuery({ ...leitura('carregarTurma', t), staleTime: 300_000 }));
  }, [turmas, online, qc]);

  const abrir = (t: string) => navigate({ to: '/chamada/$turma', params: { turma: t } });

  return (
    <Tela titulo="Chamada" capa={<Capa titulo="Chamada" sub="Qual turma está entrando agora?" />}>
      {usandoCopia(q, online) && <FaixaSemInternet desde={q.dataUpdatedAt} />}
      {turmas ? (
        turmas.length ? (
          <ul>
            {turmas.map((t) => (
              <CartaoNav key={t} titulo={t} onClick={() => abrir(t)} />
            ))}
          </ul>
        ) : (
          <Estado icone={Users} titulo="Nenhuma turma ainda"
            texto="Volte para o início e entre em Gestão para criar a primeira turma e cadastrar os alunos." />
        )
      ) : q.fetchStatus === 'paused' || (!online && !q.isFetching) ? (
        <Estado icone={CloudOff} titulo="Sem internet"
          texto="Abra a lista de turmas uma vez com internet. Depois disso ela fica guardada no celular." />
      ) : q.isError ? (
        <ErroTela erro={q.error} tentar={() => q.refetch()} />
      ) : (
        <Esqueleto n={4} />
      )}
    </Tela>
  );
}
