/* Depois de salvar. O único momento de movimento do app.
   Sem internet a tela diz a verdade: guardada no celular, não "salva". */
import { createFileRoute, Navigate, useNavigate, useRouter } from '@tanstack/react-router';
import { CloudUpload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { corDoSistema } from '../../ui/Tela';
import { plural } from '../../util';

export const Route = createFileRoute('/_app/salva')({ component: Salva });

function Salva() {
  const navigate = useNavigate();
  /* Lido uma vez, ao abrir. Ler ao vivo fazia a tela, ao sair para "Fazer
     outra chamada", ver a navegação nova (sem chamada) e pular para o Início. */
  const router = useRouter();
  const [c] = useState(() => router.state.location.state.chamada);
  useEffect(() => { corDoSistema('#4A1D6E'); }, []);
  if (!c) return <Navigate to="/" replace />;

  const r = c.resposta;
  const presentes = r?.presentes ?? c.presentes;
  const total = r?.total ?? c.total;
  /* Justificada é ausência, mas aparece à parte (como na lista). */
  const justificadas = c.justificadas ?? 0;
  const faltas = total - presentes - justificadas;

  function outra() {
    if (c!.viaQr) navigate({ to: '/chamada/$turma', params: { turma: c!.turma }, search: { qr: 1 }, replace: true });
    else navigate({ to: '/chamada', replace: true });
  }

  /* Conteúdo no meio, ações embaixo (zona do polegar). O resumo vai num
     cartão: quem salvou olha o número e confere de relance. */
  return (
    <main className="flex min-h-dvh flex-col bg-roxo px-6 pt-[env(safe-area-inset-top)] pb-[calc(20px+env(safe-area-inset-bottom))] text-center text-white">
      <div className="flex flex-1 flex-col items-center justify-center py-8">
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
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">
          {c.offline ? 'Chamada guardada no celular.' : 'Chamada salva'}
        </h1>
        <p className="mt-2 max-w-[320px] text-base leading-normal text-roxo-claro">
          {c.offline ? 'Vai enviar sozinha quando a internet voltar.' : 'Já está na planilha.'}
        </p>

        <div className="mt-7 w-full max-w-[340px] rounded-2xl bg-white/10 px-5 py-4 text-left">
          <b className="block truncate text-lg leading-tight">{c.turma}</b>
          <span className="mt-0.5 block text-sm text-roxo-claro">{presentes < total ? plural(total, 'aluno na lista', 'alunos na lista') : 'Turma completa'}</span>
          <div className="mt-3 flex gap-2">
            <span className="rounded-full bg-presente px-3 py-1 text-sm font-bold">{presentes} {presentes === 1 ? 'presente' : 'presentes'}</span>
            {faltas > 0 && <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold">{faltas} {faltas === 1 ? 'falta' : 'faltas'}</span>}
            {justificadas > 0 && <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold">{justificadas} {justificadas === 1 ? 'justificada' : 'justificadas'}</span>}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[400px]">
        <button type="button" onClick={outra}
          className="min-h-13 w-full rounded-m bg-white px-6 py-4 text-base font-bold text-roxo active:bg-roxo-claro">
          Fazer outra chamada
        </button>
        {!c.viaQr && (
          <button type="button" onClick={() => navigate({ to: '/', replace: true })}
            className="mt-2 min-h-12 w-full rounded-m text-base font-semibold text-white active:bg-white/10">Ir para o início</button>
        )}
      </div>
    </main>
  );
}
