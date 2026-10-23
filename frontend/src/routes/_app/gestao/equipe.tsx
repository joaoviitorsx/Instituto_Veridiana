/* Equipe e acessos. Cada pessoa entra com e-mail e senha, e todas
   acessam tudo. Aqui se cadastra o e-mail; o servidor gera uma senha
   temporária que aparece UMA vez, para mandar pelo WhatsApp. No primeiro
   acesso a pessoa escolhe a dela. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Copy, KeyRound, MessageCircle, Pencil, Plus, User, UserMinus } from 'lucide-react';
import { leitura } from '../../../api/cliente';
import { useSessao } from '../../../sessao';
import { Tela } from '../../../ui/Tela';
import { Avatar, BotaoCheio, BotaoContorno, CLASSE_INPUT, Esqueleto, Estado, Linha, Lista } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { Acoes, folha, type Opcao } from '../../../ui/folha';
import { toast } from '../../../ui/toast';
import { copiarTexto, primeiroNome, vibrar } from '../../../util';
import { gravar, type Pessoa } from './-comum';

export const Route = createFileRoute('/_app/gestao/equipe')({ component: Equipe });

const SITUACAO = {
  ativo: 'entra no app',
  pendente: 'ainda não fez o primeiro acesso',
  'sem-acesso': 'sem acesso ao app',
} as const;

/* O link que vai na mensagem da senha é o do PWA: é nele que a equipe
   instala o app. O /exec antigo continua valendo, mas não é o caminho novo. */
const URL_APP = typeof location !== 'undefined' ? location.origin + '/' : '';

function Equipe() {
  const navigate = useNavigate();
  const { usuario } = useSessao();
  const q = useQuery(leitura<Pessoa[]>('listarEquipe'));

  function acoes(p: Pessoa) {
    const eu = !!(usuario && p.email && p.email === usuario.email);
    const ops: Opcao[] = [];
    if (!p.email) {
      ops.push({ txt: 'Dar acesso ao app', sub: 'cadastrar e-mail e gerar senha', icone: KeyRound,
        fn: () => fichaAcesso('Acesso de ' + primeiroNome(p.nome), p, 'Gerar senha', gerarAcesso) });
    } else if (eu) {
      ops.push({ txt: 'Trocar minha senha', icone: KeyRound, fn: () => navigate({ to: '/senha' }) });
    } else {
      ops.push({ txt: 'Gerar senha nova', sub: 'a senha atual para de valer na hora', icone: KeyRound,
        fn: () => folha.confirmar('Senha nova', p.nome + ' vai precisar da senha nova para entrar. A atual para de valer agora.',
          'Gerar senha', () => gerarAcesso(p.nome, p.email)) });
      ops.push({ txt: 'Mudar e-mail', sub: p.email, icone: Pencil,
        fn: () => fichaAcesso('E-mail de ' + primeiroNome(p.nome), p, 'Salvar e gerar senha', gerarAcesso) });
    }
    if (!eu) {
      ops.push({ txt: 'Tirar da equipe', sub: 'perde o acesso; as chamadas antigas continuam com o nome',
        icone: UserMinus, perigo: true,
        fn: () => folha.confirmar('Tirar da equipe', p.nome + ' some da escolha na chamada e não entra mais no app. ' +
          'As chamadas já salvas continuam com o nome.', 'Tirar da equipe',
          () => { gravar('removerProfessor', [p.nome], p.nome + ' saiu da equipe'); }) });
    }
    folha.opcoes(p.nome, ops);
  }

  function nova() {
    fichaAcesso('Adicionar professora', null, 'Adicionar e gerar senha', async (nome, email) => {
      if (await gravar('adicionarProfessor', [nome], '')) gerarAcesso(nome, email);
    });
  }

  return (
    <Tela titulo="Equipe e acessos" voltar="/gestao"
      barra={<BotaoCheio icone={Plus} onClick={nova}>Adicionar professora</BotaoCheio>}>
      {q.data ? (
        q.data.length ? (
          <>
            <p className="mx-1 mb-4 flex items-center gap-2 text-[13px] leading-normal text-apagado">
              <span className="size-2.5 shrink-0 rounded-full bg-justif" /> ainda não fez o primeiro acesso
            </p>
            <Lista>
              {q.data.map((p) => (
                <Linha key={p.nome}
                  esquerda={<Avatar nome={p.nome} />}
                  titulo={p.nome}
                  sub={<span className="block truncate">{p.email || SITUACAO['sem-acesso']}</span>}
                  rotulo={p.nome + ', ' + SITUACAO[p.situacao]}
                  direita={<>
                    {p.situacao === 'pendente' && (
                      <span className="size-2.5 shrink-0 rounded-full bg-justif" title={SITUACAO.pendente} />
                    )}
                    <ChevronRight size={18} className="shrink-0 text-apagado" />
                  </>}
                  onClick={() => acoes(p)} />
              ))}
            </Lista>
          </>
        ) : (
          <Estado icone={User} titulo="Ninguém na equipe ainda" texto='Toque em "Adicionar professora" aqui embaixo.' />
        )
      ) : q.isError ? <ErroTela erro={q.error} tentar={() => q.refetch()} /> : <Esqueleto n={4} />}
    </Tela>
  );
}

/* Liga (ou troca) o e-mail e mostra a senha temporária. */
async function gerarAcesso(nome: string, email: string) {
  const g = await gravar<{ nome: string; email: string; senha: string }>('definirAcesso', [nome, email], '');
  if (g) mostrarSenha(g.r);
}

/* Folha com nome e e-mail. Nome só no cadastro novo: renomear quebraria
   o vínculo com as chamadas já salvas. */
function fichaAcesso(titulo: string, p: Pessoa | null, rotulo: string, fn: (nome: string, email: string) => void) {
  folha.abrir(titulo, (fechar) => <FichaAcesso p={p} rotulo={rotulo} fechar={fechar} fn={fn} />);
}

function FichaAcesso({ p, rotulo, fechar, fn }: {
  p: Pessoa | null; rotulo: string; fechar: () => void; fn: (nome: string, email: string) => void;
}) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState(p?.email || '');
  const primeiro = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => primeiro.current?.focus(), 320);
    return () => clearTimeout(t);
  }, []);
  function enviar() {
    const n = p ? p.nome : nome.trim().replace(/\s+/g, ' ');
    const e = email.trim().toLowerCase();
    if (n.length < 2) { toast('Escreva o nome.', 'erro'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { toast('Esse e-mail não parece certo.', 'erro'); return; }
    fechar();
    setTimeout(() => fn(n, e), 60);
  }
  return (
    <form onSubmit={(ev) => { ev.preventDefault(); enviar(); }}>
      <div className="px-2">
        {!p && (
          <div className="mb-4">
            <label htmlFor="acNome" className="mb-2 block text-[13px] font-semibold text-apagado">Nome</label>
            <input id="acNome" ref={primeiro} type="text" autoComplete="off" autoCapitalize="words"
              value={nome} onChange={(e) => setNome(e.target.value)} className={CLASSE_INPUT} />
          </div>
        )}
        <div className="mb-4">
          <label htmlFor="acEmail" className="mb-2 block text-[13px] font-semibold text-apagado">E-mail</label>
          <input id="acEmail" ref={p ? primeiro : undefined} type="email" inputMode="email" autoComplete="off"
            autoCapitalize="none" autoCorrect="off" spellCheck={false}
            value={email} onChange={(e) => setEmail(e.target.value)} className={CLASSE_INPUT} />
        </div>
      </div>
      <Acoes rotulo={rotulo} perigo={false} onCancelar={fechar} onConfirmar={enviar} />
      <button type="submit" hidden />
    </form>
  );
}

/* A senha temporária só existe aqui: fechou a folha, sumiu. */
function mostrarSenha(r: { nome: string; email: string; senha: string }) {
  vibrar();
  const texto = 'Oi, ' + primeiroNome(r.nome) + '! Seu acesso ao app do Instituto Veridiana:\n' +
    (URL_APP ? URL_APP + '\n' : '') + 'E-mail: ' + r.email + '\nSenha temporária: ' + r.senha +
    '\nNo primeiro acesso o app pede para você criar a sua senha.';
  folha.abrir('Acesso de ' + primeiroNome(r.nome), (
    <div className="px-2 pb-1">
      <p className="mb-3 text-sm text-apagado">
        Mande para {primeiroNome(r.nome)}. Essa senha não aparece de novo; se perder, é só gerar outra.
      </p>
      <div className="mb-4 grid gap-0.5 rounded-m border border-borda bg-fundo px-4 py-3.5">
        <small className="text-xs text-apagado">E-mail</small>
        <b className="text-base break-all">{r.email}</b>
        <small className="mt-2 text-xs text-apagado">Senha temporária</small>
        <b className="font-mono text-2xl tracking-[.12em] text-roxo select-text">{r.senha}</b>
      </div>
      <a href={'https://wa.me/?text=' + encodeURIComponent(texto)} target="_blank" rel="noopener"
        className="flex min-h-13 w-full items-center justify-center gap-2 rounded-m bg-presente p-3.5 text-base font-bold text-white active:bg-presente-fundo">
        <MessageCircle size={18} /> Enviar no WhatsApp
      </a>
      <BotaoContorno icone={Copy} className="mt-2"
        onClick={async () => { if (await copiarTexto(texto)) { vibrar(); toast('Mensagem copiada'); } }}>
        Copiar mensagem
      </BotaoContorno>
    </div>
  ));
}
