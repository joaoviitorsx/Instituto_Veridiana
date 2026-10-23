/* Depois de salvar. O único momento de movimento do app.
   Sem internet a tela diz a verdade: guardada no celular, não "salva". */
import { createFileRoute, Navigate, useNavigate, useRouterState } from '@tanstack/react-router';
import { CloudUpload } from 'lucide-react';
import { plural } from '../../util';

export const Route = createFileRoute('/_app/salva')({ component: Salva });

function Salva() {
  const navigate = useNavigate();
  const c = useRouterState({ select: (s) => s.location.state.chamada });
  if (!c) return <Navigate to="/" replace />;

  const r = c.resposta;
  const presentes = r?.presentes ?? c.presentes;
  const total = r?.total ?? c.total;
  const faltas = total - presentes;
  const resumo = faltas
    ? plural(presentes, 'presente', 'presentes') + ' · ' + plural(faltas, 'faltou', 'faltaram')
    : 'Turma completa, ' + plural(total, 'aluno presente', 'alunos presentes');

  function outra() {
    if (c!.viaQr) navigate({ to: '/chamada/$turma', params: { turma: c!.turma }, search: { qr: 1 }, replace: true });
    else navigate({ to: '/chamada', replace: true });
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-roxo px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-center text-white">
      <div className="mb-6 grid size-22 place-items-center rounded-full bg-white/15">
        {c.offline ? (
          <CloudUpload size={44} strokeWidth={2.2} />
        ) : (
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" className="animate-risca [stroke-dasharray:32]" />
          </svg>
        )}
      </div>
      <h2 className="mb-2 text-2xl font-bold tracking-tight">{c.offline ? 'Chamada guardada no celular' : 'Chamada salva'}</h2>
      <p className="max-w-[340px] text-base leading-normal text-roxo-claro">
        {c.turma}<br />{resumo}
        {c.offline && <><br /><br /><b className="text-white">Vai enviar sozinha quando a internet voltar.</b></>}
      </p>
      <button type="button" onClick={outra}
        className="mt-8 min-h-13 rounded-m border border-white/35 px-6 py-4 text-base font-bold active:bg-white/15">
        Fazer outra chamada
      </button>
      {!c.viaQr && (
        <button type="button" onClick={() => navigate({ to: '/', replace: true })}
          className="mt-2 min-h-11 px-4 text-sm font-semibold text-roxo-claro">Ir para o início</button>
      )}
    </main>
  );
}
