/* QR do app. O principal é um QR só, do app: com login, o QR não controla
   acesso, é atalho — escanear uma vez, entrar e instalar. Os QR por turma
   continuam, opcionais, para a chamada abrir direto na sala.

   Diferença do app HTML: o QR aponta para ESTE app (o PWA). O do app
   antigo (/exec) continua disponível no cartaz, como plano B. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, QrCode, Users } from 'lucide-react';
import { leitura } from '../../../../api/cliente';
import { Tela } from '../../../../ui/Tela';
import { GrupoNav, Esqueleto, Estado } from '../../../../ui/kit';
import { CabecalhoSecao } from '../../../../ui/Heroi';
import { ErroTela } from '../../../../ui/ErroTela';
import type { TurmaGestao } from '../-comum';

export const Route = createFileRoute('/_app/gestao/qr/')({ component: ListaQr });

function ListaQr() {
  const navigate = useNavigate();
  const q = useQuery(leitura<TurmaGestao[]>('listarTurmasCompleto'));
  return (
    <Tela titulo="QR do app" voltar="/gestao">
      <CabecalhoSecao titulo="Para todo mundo" />
      <GrupoNav itens={[{ icone: QrCode, titulo: 'Acessar o app', sub: 'um cartaz só: escanear, entrar e instalar',
        onClick: () => navigate({ to: '/gestao/qr/ver' }) }]} />
      <CabecalhoSecao titulo="Por turma (opcional)" />
      <p className="-mt-1 mb-2 pl-4 text-sm text-apagado">Já abre direto a chamada daquela sala.</p>
      {q.data ? (
        q.data.length ? (
          <GrupoNav itens={q.data.map((t) => ({
            icone: Users, titulo: t.nome,
            onClick: () => navigate({ to: '/gestao/qr/ver', search: { turma: t.nome } }),
          }))} />
        ) : (
          <Estado icone={ClipboardList} titulo="Nenhuma turma ainda" texto="O QR por turma aparece aqui depois que a turma for criada em Gestão → Turmas." />
        )
      ) : q.isError ? <ErroTela erro={q.error} tentar={() => q.refetch()} /> : <Esqueleto n={4} />}
    </Tela>
  );
}
