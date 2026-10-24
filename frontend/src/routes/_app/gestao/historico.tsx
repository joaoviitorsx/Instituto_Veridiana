/* Histórico por mês. Só leitura, calculado das mesmas linhas de
   Chamadas. Sem gráfico: a análise a fundo vive na planilha, com
   Tabela Dinâmica. */
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { leitura } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { Esqueleto, Estado, Linha, Lista, Secao } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { dataExtenso, hojeISO, maiuscula, mesExtenso, plural, vibrar } from '../../../util';
import { Passo, Pct, Resumo } from './-relatorios';

type Mes = {
  mes: string;
  aulas: { data: string; turma: string; professor: string; presentes: number; total: number }[];
  turmas: { turma: string; aulas: number; presentes: number; total: number; pct: number }[];
  totais: { aulas: number; presentes: number; marcacoes: number; pct: number };
};

export const Route = createFileRoute('/_app/gestao/historico')({ component: Historico });

function Historico() {
  const qc = useQueryClient();
  const meses = useQuery({ ...leitura<string[]>('mesesComChamada'), staleTime: 300_000 });
  /* 0 = o mais recente. */
  const [i, setI] = useState(0);
  const lista = meses.data || [];
  const mes = lista[i];
  const r = useQuery({ ...leitura<Mes>('resumoHistorico', mes), enabled: !!mes });

  /* Quase sempre o mais recente é o mês atual: sai junto com a lista. E o
     próximo toque costuma ser "mês anterior": já vai buscando. */
  useEffect(() => { qc.prefetchQuery(leitura('resumoHistorico', hojeISO().slice(0, 7))); }, [qc]);
  useEffect(() => { if (lista[i + 1]) qc.prefetchQuery(leitura('resumoHistorico', lista[i + 1])); }, [qc, lista, i]);

  let corpo;
  if (meses.isError) corpo = <ErroTela erro={meses.error} tentar={() => meses.refetch()} />;
  else if (!meses.data) corpo = <Esqueleto n={4} />;
  else if (!lista.length) {
    corpo = <Estado icone={Calendar} titulo="Nenhuma chamada ainda"
      texto="Assim que a primeira chamada for salva, o histórico de cada mês aparece aqui." />;
  } else {
    corpo = (
      <>
        <Passo rotulo={mesExtenso(mes)}
          antes={i < lista.length - 1 ? () => { setI(i + 1); vibrar(); } : undefined}
          depois={i > 0 ? () => { setI(i - 1); vibrar(); } : undefined} />
        {r.isError ? <ErroTela erro={r.error} tentar={() => r.refetch()} />
          : !r.data ? <Esqueleto n={3} />
            : <MesAberto r={r.data} />}
      </>
    );
  }
  return <Tela titulo="Histórico" voltar="/gestao">{corpo}</Tela>;
}

function MesAberto({ r }: { r: Mes }) {
  const t = r.totais;
  /* Aulas agrupadas por dia, na ordem que o servidor manda (mais nova primeiro). */
  const dias: { data: string; aulas: Mes['aulas'] }[] = [];
  r.aulas.forEach((a) => {
    const ult = dias[dias.length - 1];
    if (ult && ult.data === a.data) ult.aulas.push(a);
    else dias.push({ data: a.data, aulas: [a] });
  });
  return (
    <>
      <Resumo n={t.pct + '%'} txt={'de presença em ' + plural(t.aulas, 'aula', 'aulas')} />

      {r.turmas.length > 0 && (
        <>
          <Secao>Por turma</Secao>
          <Lista semAvatar>
            {r.turmas.map((x) => (
              <Linha key={x.turma} titulo={x.turma}
                sub={plural(x.aulas, 'aula', 'aulas') + ' · ' + x.presentes + ' de ' + x.total + ' presenças'}
                direita={<Pct>{x.pct}%</Pct>} />
            ))}
          </Lista>
        </>
      )}

      {dias.length > 0 && (
        <>
          <Secao>Aulas do mês</Secao>
          {dias.map((d) => (
            <div key={d.data}>
              <div className="mx-1 mt-4 mb-2 text-[13px] font-semibold text-apagado">{maiuscula(dataExtenso(d.data))}</div>
              <Lista semAvatar>
                {d.aulas.map((a) => (
                  <Linha key={a.turma} titulo={a.turma} sub={a.professor || 'sem professor'}
                    direita={<Pct cheio={a.presentes === a.total}>{a.presentes}/{a.total}</Pct>} />
                ))}
              </Lista>
            </div>
          ))}
        </>
      )}
    </>
  );
}
