/* QR do app. O principal é um QR só, do app: com login, o QR não controla
   acesso, é atalho — escanear uma vez, entrar e instalar. Os QR por turma
   continuam, opcionais, para a chamada abrir direto na sala.

   Diferença do app HTML: o QR aponta para ESTE app (o PWA). O do app
   antigo (/exec) continua disponível no cartaz, como plano B. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, QrCode } from 'lucide-react';
import { leitura } from '../../../../api/cliente';
import { Tela } from '../../../../ui/Tela';
import { CartaoNav, Esqueleto, Estado } from '../../../../ui/kit';
import { ErroTela } from '../../../../ui/ErroTela';
import type { TurmaGestao } from '../-comum';

export const Route = createFileRoute('/_app/gestao/qr/')({ component: ListaQr });

function ListaQr() {
  const navigate = useNavigate();
  const q = useQuery(leitura<TurmaGestao[]>('listarTurmasCompleto'));
  return (
    <Tela titulo="QR do app" voltar="/gestao">
      <ul>
        <CartaoNav icone={QrCode} titulo="Acessar o app" sub="um cartaz só, para todo mundo"
          onClick={() => navigate({ to: '/gestao/qr/ver' })} />
      </ul>
      <p className="mx-1 mt-6 mb-3 text-sm text-apagado">Opcional: QR por turma, que já abre a chamada daquela sala.</p>
      {q.data ? (
        q.data.length ? (
          <ul>
            {q.data.map((t) => (
              <CartaoNav key={t.nome} titulo={t.nome}
                direita={<QrCode size={20} className="shrink-0 text-apagado" />}
                onClick={() => navigate({ to: '/gestao/qr/ver', search: { turma: t.nome } })} />
            ))}
          </ul>
        ) : (
          <Estado icone={ClipboardList} titulo="Nenhuma turma ainda" texto="Crie uma turma para gerar o QR dela." />
        )
      ) : q.isError ? <ErroTela erro={q.error} tentar={() => q.refetch()} /> : <Esqueleto n={4} />}
    </Tela>
  );
}
