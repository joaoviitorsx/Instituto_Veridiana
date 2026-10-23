/* Relatório para edital: os números que a prestação de contas pede —
   beneficiários atendidos, aulas realizadas, frequência e faixa etária
   no recorte do ECA e do Estatuto da Juventude. */
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { CircleAlert, Copy, FileText } from 'lucide-react';
import { leitura } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { Aviso, BotaoCheio, BotaoContorno, Campo, Esqueleto, Linha, Lista, Numeros, Secao } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { toast } from '../../../ui/toast';
import { copiarTexto, dataCurta, hojeISO, plural, vibrar } from '../../../util';
import { Intro, Pct } from './-relatorios';

type Relatorio = {
  inicio: string; fim: string; completo: boolean;
  beneficiarios: number; aulas: number; frequencia: number;
  faixas: Record<string, number>;
  turmas: { turma: string; aulas: number; alunos: number; pct: number }[];
};

export const Route = createFileRoute('/_app/gestao/relatorio')({ component: RelatorioEdital });

function RelatorioEdital() {
  const hoje = hojeISO();
  const [de, setDe] = useState(hoje.slice(0, 8) + '01');
  const [ate, setAte] = useState(hoje);
  /* O período só vale quando a pessoa toca em Gerar: mexer na data não
     dispara uma ida ao servidor por dígito. Abre já com o mês corrente. */
  const [pedido, setPedido] = useState({ de, ate });
  const q = useQuery({ ...leitura<Relatorio>('relatorioPeriodo', pedido.de, pedido.ate), enabled: !!pedido.de && !!pedido.ate });

  function gerar() {
    if (!de || !ate) { toast('Escolha as duas datas.', 'erro'); return; }
    if (de > ate) { toast('A data inicial é depois da final.', 'erro'); return; }
    setPedido({ de, ate });
    if (de === pedido.de && ate === pedido.ate) q.refetch();
  }

  return (
    <Tela titulo="Relatório para edital" voltar="/gestao">
      <Intro>Os números que a prestação de contas pede: beneficiários atendidos, aulas realizadas e frequência.</Intro>
      {/* De/Até lado a lado enquanto couber; um embaixo do outro em tela estreita. */}
      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-2">
        <Campo id="dtIni" rotulo="De" type="date" value={de} max={ate || undefined}
          onChange={(e) => setDe(e.target.value)} className="mb-0 min-w-0 flex-[1_1_140px]" />
        <Campo id="dtFim" rotulo="Até" type="date" value={ate} min={de || undefined}
          onChange={(e) => setAte(e.target.value)} className="mb-0 min-w-0 flex-[1_1_140px]" />
      </div>
      <BotaoCheio icone={FileText} onClick={gerar} disabled={q.isFetching}>
        {q.isFetching ? 'Gerando…' : 'Gerar relatório'}
      </BotaoCheio>

      <div className="mt-5">
        {q.isError ? <ErroTela erro={q.error} titulo="Não deu para gerar" tentar={() => q.refetch()} />
          : !q.data ? <Esqueleto n={2} />
            : <Saida r={q.data} />}
      </div>
    </Tela>
  );
}

function Saida({ r }: { r: Relatorio }) {
  const faixas = Object.keys(r.faixas).filter((k) => r.faixas[k]);

  async function copiar() {
    const L: string[] = [];
    L.push('INSTITUTO VERIDIANA — Relatório de frequência');
    L.push('Período: ' + dataCurta(r.inicio) + '/' + r.inicio.slice(0, 4) + ' a ' + dataCurta(r.fim) + '/' + r.fim.slice(0, 4));
    L.push('');
    L.push('Beneficiários atendidos: ' + r.beneficiarios);
    L.push('Aulas realizadas: ' + r.aulas);
    L.push('Frequência média: ' + r.frequencia + '%');
    L.push('');
    L.push('Faixa etária:');
    faixas.forEach((k) => L.push('- ' + k + ': ' + r.faixas[k]));
    L.push('');
    L.push('Por turma:');
    r.turmas.forEach((t) => L.push('- ' + t.turma + ': ' + t.aulas + ' aulas, ' + t.alunos + ' alunos, ' + t.pct + '% de frequência'));
    if (await copiarTexto(L.join('\n'))) { vibrar(); toast('Relatório copiado'); }
    else toast('Não deu para copiar sozinho. Tente de novo.', 'erro');
  }

  return (
    <>
      {/* Leitura truncada = números por baixo. Dizer isso é o ponto:
          relatório errado em silêncio é pior que erro na cara. */}
      {r.completo === false && (
        <Aviso icone={CircleAlert}>
          O histórico é grande demais e a leitura parou antes do fim. Estes números estão <b>por baixo</b>.
          Gere por períodos menores, um semestre de cada vez.
        </Aviso>
      )}
      <Secao className="mt-0">Resumo</Secao>
      <Numeros itens={[
        { n: r.beneficiarios, txt: 'beneficiários' },
        { n: r.aulas, txt: 'aulas' },
        { n: r.frequencia + '%', txt: 'frequência' },
      ]} />

      {faixas.length > 0 && (
        <>
          <Secao>Faixa etária</Secao>
          <Lista semAvatar>
            {faixas.map((k) => <Linha key={k} titulo={k} direita={<Pct>{r.faixas[k]}</Pct>} />)}
          </Lista>
        </>
      )}

      {r.turmas.length > 0 && (
        <>
          <Secao>Por turma</Secao>
          <Lista semAvatar>
            {r.turmas.map((t) => (
              <Linha key={t.turma} titulo={t.turma}
                sub={plural(t.aulas, 'aula', 'aulas') + ' · ' + plural(t.alunos, 'aluno', 'alunos')}
                direita={<Pct>{t.pct}%</Pct>} />
            ))}
          </Lista>
        </>
      )}

      <BotaoContorno icone={Copy} onClick={copiar} className="mt-5">Copiar para colar no edital</BotaoContorno>
    </>
  );
}
