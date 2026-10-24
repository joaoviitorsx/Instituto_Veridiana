/* Certificado de participação de uma turma.

   Uma menina de 17 anos aqui não tem nada no papel. O instituto tem o
   registro exato de quantas aulas ela frequentou, e é o único lugar que
   consegue emitir esse documento.

   Individual: PDF com link público, para abrir no celular da família
   (que não tem conta Google) e mandar no WhatsApp. Turma inteira: só no
   Drive, sem link público — teria o nome de 20 crianças num link aberto. */
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ChevronRight, Copy, ExternalLink, FolderLock, LoaderCircle, Medal, MessageCircle, Share2, UserPlus, UserX } from 'lucide-react';
import { clsx } from 'clsx';
import { escrever, leitura } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { Avatar, Banner, BotaoCheio, Esqueleto, Estado, Linha, Lista } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { folha } from '../../../ui/folha';
import { toast } from '../../../ui/toast';
import { copiarTexto, linkZap, plural, textoErro, vibrar } from '../../../util';
import { editarContato, Intro } from '../gestao/-relatorios';

type AlunaCert = {
  nome: string; turma: string; ativo: boolean; aulas: number; horas: number; desde: string;
  homonimo: boolean; responsavel: string; telefone: string;
};
type Gerado = {
  ok: boolean; url: string; nome: string; completo: boolean; quantidade: number;
  aluno: string; publico: boolean; ignorados: string[];
};

export const Route = createFileRoute('/_app/certificados/$turma')({ component: CertTurma });

/* O Drive leva seus segundos para montar o PDF; a turma inteira, mais. */
const PRAZO_PDF = 120_000;

const BOTAO = 'flex min-h-13 w-full items-center justify-center gap-2 rounded-m p-3.5 text-base font-bold no-underline transition-colors duration-150';

function CertTurma() {
  const { turma } = Route.useParams();
  const q = useQuery(leitura<AlunaCert[]>('alunosParaCertificado', turma));
  const [gerando, setGerando] = useState(false);
  /* Lista de outra turma (resposta atrasada) nunca vale aqui: "turma
     inteira" emitiria os certificados das alunas erradas. */
  const as = q.data?.every((a) => a.turma === turma) ? q.data : undefined;
  const com = (as || []).filter((a) => a.aulas > 0);

  async function emitir(nomes: string[], umNome: string) {
    if (gerando) return;
    setGerando(true);
    folha.abrir(umNome ? 'Gerando o certificado…' : 'Gerando ' + nomes.length + ' certificados…', (
      <div className="flex items-center gap-3 px-2 pb-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-roxo-fraco text-roxo">
          <LoaderCircle size={22} className="animate-spin" />
        </span>
        <p className="text-sm leading-snug text-apagado">
          O Drive leva alguns segundos para montar o PDF. Pode fechar esta janela: quando ficar pronto, ela abre sozinha.
        </p>
      </div>
    ));
    try {
      const r = await escrever<Gerado>('gerarCertificado', [nomes, turma], { prazo: PRAZO_PDF });
      vibrar();
      const ficha = umNome ? as?.find((a) => a.nome === umNome) : undefined;
      folha.abrir(r.quantidade === 1 ? 'Certificado pronto' : r.quantidade + ' certificados prontos',
        <Pronto r={r} umNome={umNome} ficha={ficha} turma={turma} />);
    } catch (e) {
      folha.fechar();
      toast('Não deu para gerar. ' + textoErro(e), 'erro');
    } finally {
      setGerando(false);
    }
  }

  function todos() {
    if (!as || !com.length) return;
    folha.confirmar('Gerar ' + com.length + ' certificados?',
      'Sai um PDF com uma página por aluna, de ' + turma + '. Bom para imprimir e entregar no fim do ano.',
      'Gerar', () => emitir(com.map((a) => a.nome), ''), { perigo: false });
  }

  let corpo;
  if (q.isError && !as) corpo = <ErroTela erro={q.error} tentar={() => q.refetch()} />;
  else if (!as) corpo = <Esqueleto n={5} />;
  else if (!com.length) {
    corpo = <Estado icone={Medal} titulo="Ninguém com presença ainda"
      texto="O certificado conta as aulas em que a aluna esteve presente. Assim que esta turma tiver chamadas salvas, os certificados aparecem aqui." />;
  } else {
    corpo = (
      <>
        <Intro>Toque na aluna para gerar o certificado dela.</Intro>
        <Lista>
          {as.map((a) => {
            const vazio = a.aulas === 0;
            return (
              <Linha key={a.nome}
                esquerda={<Avatar nome={a.nome} tom={vazio ? 'falta' : undefined} />}
                titulo={<span className={clsx(vazio && 'text-apagado')}>{a.nome}</span>}
                sub={vazio ? 'sem presença ainda' : plural(a.aulas, 'aula', 'aulas') + ' · ' + plural(a.horas, 'hora', 'horas')}
                direita={vazio ? undefined : <ChevronRight size={18} className="shrink-0 text-apagado" />}
                onClick={vazio ? undefined : () => emitir([a.nome], a.nome)}
                rotulo={vazio ? undefined : 'Gerar certificado de ' + a.nome} />
            );
          })}
        </Lista>
      </>
    );
  }

  return (
    <Tela titulo={turma} voltar="/certificados"
      barra={com.length > 0 && (
        <BotaoCheio icone={Medal} onClick={todos} carregando={gerando}>
          {gerando ? 'Gerando…' : 'Gerar da turma inteira (' + com.length + ')'}
        </BotaoCheio>
      )}>
      {corpo}
    </Tela>
  );
}

function Pronto({ r, umNome, ficha, turma }: { r: Gerado; umNome: string; ficha?: AlunaCert; turma: string }) {
  const texto = 'Oi! Segue o certificado de participação de ' + (umNome || 'a aluna') +
    ' no Instituto Veridiana. É só abrir o link e salvar: ' + r.url;
  const zap = umNome && r.publico && ficha?.telefone ? linkZap(ficha.telefone, texto) : '';
  const podeCompartilhar = umNome && r.publico && typeof navigator.share === 'function';

  async function copiar() {
    if (await copiarTexto(r.url)) { vibrar(); toast('Link copiado'); }
    else toast('Não deu para copiar sozinho. Segure o dedo no link.', 'erro');
  }
  function compartilhar() {
    navigator.share({ title: 'Certificado — Instituto Veridiana', text: texto }).catch(() => {});
  }

  return (
    <div className="px-2 pb-1">
      <p className="mb-3 text-sm text-apagado [overflow-wrap:anywhere]">{r.nome}</p>
      {r.completo === false && (
        <Banner tom="atencao" titulo="As horas podem estar a menos" className="mb-3">
          O histórico é longo e a conta parou antes do fim. Na planilha, use Veridiana → Recontar horas dos certificados e gere de novo.
        </Banner>
      )}
      <a href={r.url} target="_blank" rel="noopener" className={clsx(BOTAO, 'bg-roxo text-white active:bg-roxo-fundo')}>
        <ExternalLink size={18} /> Abrir o PDF
      </a>
      {zap ? (
        <a href={zap} target="_blank" rel="noopener" className={clsx(BOTAO, 'mt-2 bg-presente text-white active:bg-presente-fundo')}>
          <MessageCircle size={18} /> Enviar no WhatsApp
        </a>
      ) : umNome && r.publico ? (
        <button type="button" onClick={() => { folha.fechar(); setTimeout(() => editarContato(umNome, turma), 80); }}
          className={clsx(BOTAO, 'mt-2 border border-dashed border-borda bg-fundo text-apagado active:bg-borda')}>
          <UserPlus size={18} /> Cadastrar telefone para o WhatsApp
        </button>
      ) : null}
      <div className="mt-2 flex gap-2">
        {podeCompartilhar && (
          <button type="button" onClick={compartilhar} className={clsx(BOTAO, 'flex-1 bg-fundo text-roxo active:bg-borda')}>
            <Share2 size={18} /> Compartilhar
          </button>
        )}
        <button type="button" onClick={copiar} className={clsx(BOTAO, 'flex-1 bg-fundo text-roxo active:bg-borda')}>
          <Copy size={18} /> Copiar link
        </button>
      </div>
      {!r.publico && r.quantidade > 1 && (
        <Banner tom="info" icone={FolderLock} titulo="Este PDF fica só no Drive" className="mt-4 mb-0">
          Ele tem o nome de {r.quantidade} crianças, por isso não ganha link aberto. É para imprimir. Para mandar à família,
          gere o certificado de cada aluna.
        </Banner>
      )}
      {r.ignorados?.length > 0 && (
        <Banner tom="info" icone={UserX} titulo="Ficaram de fora" className="mt-3 mb-0">
          {r.ignorados.join(', ')} — ainda sem presença registrada.
        </Banner>
      )}
    </div>
  );
}
