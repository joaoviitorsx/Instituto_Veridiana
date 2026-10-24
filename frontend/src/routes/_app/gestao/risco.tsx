/* Precisam de atenção: quem faltou 3 aulas seguidas da própria turma.
   Três faltas consecutivas é o gatilho que a busca ativa usa na rede
   pública. O dado já existia; faltava alguém ler. */
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Check, MessageCircle, UserPlus } from 'lucide-react';
import { clsx } from 'clsx';
import { leitura } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { Avatar, CARTAO, Esqueleto, Estado } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { dataCurta, linkZap, plural } from '../../../util';
import { editarContato, Intro } from './-relatorios';

type Risco = {
  minimo: number;
  alunos: {
    aluno: string; turma: string; faltas: number; justificadas: number; desde: string;
    ultimaPresenca: string; responsavel: string; telefone: string; idade: number | null;
  }[];
};

export const Route = createFileRoute('/_app/gestao/risco')({ component: Atencao });

/* "Falar com Ana" quando há nome; senão não inventa parentesco. */
function rotuloZap(responsavel: string) {
  const p = String(responsavel || '').trim().split(/\s+/)[0] || '';
  return p && p.length > 2 ? 'Falar com ' + p : 'Falar no WhatsApp';
}

const BOTAO = 'mt-4 flex min-h-13 w-full items-center justify-center gap-2 rounded-m p-3.5 text-base font-bold transition-colors duration-150';

function Atencao() {
  const q = useQuery(leitura<Risco>('alunosEmRisco', 3));
  const r = q.data;

  let corpo;
  if (q.isError && !r) corpo = <ErroTela erro={q.error} tentar={() => q.refetch()} />;
  else if (!r) corpo = <Esqueleto n={3} />;
  else if (!r.alunos.length) {
    corpo = <Estado icone={Check} titulo="Ninguém faltando seguido"
      texto="Nenhum aluno faltou 3 aulas seguidas. Vale olhar aqui uma vez por semana." />;
  } else {
    corpo = (
      <>
        <Intro>
          {plural(r.alunos.length, 'aluno faltou', 'alunos faltaram')} 3 aulas ou mais seguidas. Uma mensagem agora,
          antes de virar hábito, costuma trazer de volta.
        </Intro>
        <ul>
          {r.alunos.map((a) => {
            const texto = 'Oi! Aqui é do Instituto Veridiana. Sentimos falta de ' + a.aluno + ' nas últimas ' +
              a.faltas + ' aulas de ' + a.turma + '. Está tudo bem? A gente gostaria muito de ver de volta.';
            const zap = linkZap(a.telefone, texto);
            return (
              <li key={a.turma + '|' + a.aluno} className={clsx(CARTAO, 'mb-3 p-4')}>
                <div className="flex items-center gap-3">
                  <Avatar nome={a.aluno} tom="perigo" />
                  <span className="min-w-0 flex-1 text-base leading-tight font-semibold [overflow-wrap:anywhere]">
                    {a.aluno}
                    <small className="mt-0.5 block text-[13px] font-normal text-apagado">
                      {a.turma}{a.idade != null ? ' · ' + a.idade + ' anos' : ''}
                    </small>
                  </span>
                  {/* Número com palavra, não só um "4" vermelho solto. */}
                  <span className="shrink-0 rounded-full bg-falta-fraco px-2.5 py-1 text-[13px] font-bold whitespace-nowrap text-falta">
                    {plural(a.faltas, 'falta', 'faltas')}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-normal text-apagado">
                  {plural(a.faltas, 'falta seguida', 'faltas seguidas')}
                  {a.justificadas ? ' (' + a.justificadas + ' justificada' + (a.justificadas > 1 ? 's' : '') + ')' : ''}
                  {a.ultimaPresenca ? ' · veio pela última vez em ' + dataCurta(a.ultimaPresenca) : ' · sem presença nas aulas recentes'}
                </p>
                {zap ? (
                  <a href={zap} target="_blank" rel="noopener"
                    className={clsx(BOTAO, 'bg-presente text-white active:bg-presente-fundo')}>
                    <MessageCircle size={18} /> {rotuloZap(a.responsavel)}
                  </a>
                ) : (
                  <button type="button" onClick={() => editarContato(a.aluno, a.turma)}
                    className={clsx(BOTAO, 'border border-dashed border-roxo/30 bg-roxo-fraco/50 text-roxo active:bg-roxo-fraco')}>
                    <UserPlus size={18} /> Sem telefone — cadastrar agora
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </>
    );
  }
  return <Tela titulo="Precisam de atenção" voltar="/gestao">{corpo}</Tela>;
}
