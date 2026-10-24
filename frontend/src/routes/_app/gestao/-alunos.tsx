/* Aluno na gestão: a linha da lista e o que se faz com ele. Usado na
   ficha da turma e na lista de todos os alunos. */
import { ArrowRightLeft, ChevronRight, Pencil, Plus, UserMinus, UserPlus } from 'lucide-react';
import { queryClient, leitura } from '../../../api/cliente';
import { Avatar, Linha, Lista } from '../../../ui/kit';
import { folha } from '../../../ui/folha';
import { toast } from '../../../ui/toast';
import { plural, textoErro } from '../../../util';
import { gravar, type Aluno, type TurmaGestao } from './-comum';

export function LinhasAlunos({ lista, mostrarTurma }: { lista: Aluno[]; mostrarTurma?: boolean }) {
  return (
    <Lista>
      {lista.map((a) => (
        <Linha
          key={a.turma + '|' + a.nome}
          esquerda={<Avatar nome={a.nome} tom={a.ativo ? undefined : 'falta'} />}
          titulo={<span className={a.ativo ? undefined : 'text-apagado'}>{a.nome}</span>}
          sub={mostrarTurma ? a.turma : undefined}
          direita={<ChevronRight size={18} className="shrink-0 text-apagado" />}
          onClick={() => acoesAluno(a)}
        />
      ))}
    </Lista>
  );
}

const CAMPOS_DADOS = (a?: Aluno) => [
  { id: 'nascimento', rotulo: 'Data de nascimento', tipo: 'date', valor: a?.nascimento || '' },
  { id: 'responsavel', rotulo: 'Responsável', valor: a?.responsavel || '' },
  { id: 'telefone', rotulo: 'Telefone com DDD', tipo: 'tel', dica: '85 9 9999 0000', valor: a?.telefone || '' },
];

export function novoAluno(turma: string) {
  folha.pedirFicha('Adicionar aluno', [{ id: 'nome', rotulo: 'Nome do aluno', obrigatorio: true }, ...CAMPOS_DADOS()],
    'Adicionar', (d) => { gravar('adicionarAluno', [turma, d.nome, d], d.nome + ' entrou em ' + turma); });
}

export function editarAluno(a: Aluno) {
  folha.pedirFicha('Dados de ' + a.nome, CAMPOS_DADOS(a), 'Salvar',
    (d) => { gravar('atualizarAluno', [a.nome, a.turma, d], 'Dados de ' + a.nome + ' salvos'); });
}

export function acoesAluno(a: Aluno) {
  if (!a.ativo) {
    folha.opcoes(a.nome, [{
      txt: 'Voltar para a chamada', sub: 'em ' + a.turma, icone: UserPlus,
      fn: () => { gravar('reativarAluno', [a.nome, a.turma], a.nome + ' voltou para a chamada'); },
    }]);
    return;
  }
  folha.opcoes(a.nome, [
    { txt: 'Editar dados', sub: 'nascimento, responsável, telefone', icone: Pencil, fn: () => editarAluno(a) },
    { txt: 'Mudar de turma', sub: 'hoje em ' + a.turma, icone: ArrowRightLeft, fn: () => moverAluno(a) },
    {
      txt: 'Desativar', sub: 'sai da chamada, histórico fica', icone: UserMinus, perigo: true,
      fn: () => { gravar('desativarAluno', [a.nome, a.turma], a.nome + ' saiu da chamada'); },
    },
  ]);
}

async function moverAluno(a: Aluno) {
  let ts: TurmaGestao[];
  try {
    /* Uma resposta só: a folha abre uma vez, com o que houver de até 1 min. */
    ts = await queryClient.fetchQuery({ ...leitura<TurmaGestao[]>('listarTurmasCompleto'), staleTime: 60_000 });
  } catch (e) {
    toast(textoErro(e), 'erro');
    return;
  }
  const mover = (destino: string) =>
    gravar('moverAluno', [a.nome, destino, a.turma], a.nome + ' agora está em ' + destino);
  folha.opcoes('Mover ' + a.nome + ' para', [
    ...ts.filter((t) => t.nome !== a.turma).map((t) => ({
      txt: t.nome, sub: plural(t.ativos, 'aluno', 'alunos'), ini: t.nome, fn: () => { mover(t.nome); },
    })),
    {
      txt: 'Criar turma nova', icone: Plus,
      fn: () => folha.pedirTexto('Criar turma', 'Nome da turma', '', 'Criar e mover', async (nova) => {
        if (await gravar('criarTurma', [nova], 'Turma ' + nova + ' criada')) mover(nova);
      }),
    },
  ]);
}
