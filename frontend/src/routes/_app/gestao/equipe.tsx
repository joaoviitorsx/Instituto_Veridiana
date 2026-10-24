/* Equipe e acessos. Cada pessoa entra com e-mail e senha, e todas
   acessam tudo. Aqui se cadastra o e-mail; o servidor gera uma senha
   temporária que aparece UMA vez, para mandar pelo WhatsApp. No primeiro
   acesso a pessoa escolhe a dela. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Copy, KeyRound, Mail, MessageCircle, Pencil, Plus, User, UserMinus } from 'lucide-react';
import { clsx } from 'clsx';
import { leitura } from '../../../api/cliente';
import { useSessao } from '../../../sessao';
import { Tela } from '../../../ui/Tela';
import { Avatar, Banner, BotaoCheio, BotaoContorno, Campo, Esqueleto, Estado, Linha, Lista } from '../../../ui/kit';
import { CabecalhoSecao, CARTAO_ELEVADO } from '../../../ui/Heroi';
import { ErroTela } from '../../../ui/ErroTela';
import { Acoes, folha, type Opcao } from '../../../ui/folha';
import { toast } from '../../../ui/toast';
import { copiarTexto, plural, primeiroNome, vibrar } from '../../../util';
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
    fichaAcesso('Adicionar professora', null, 'Criar acesso', async (nome, email) => {
      if (await gravar('adicionarProfessor', [nome], '')) gerarAcesso(nome, email);
    });
  }

  return (
    <Tela titulo="Equipe e acessos" voltar="/gestao"
      barra={<BotaoCheio icone={Plus} onClick={nova}>Adicionar professora</BotaoCheio>}>
      {q.data ? (
        q.data.length ? (
          <>
            <CabecalhoSecao titulo={plural(q.data.length, 'pessoa na equipe', 'pessoas na equipe')} />
            <Lista>
              {q.data.map((p) => (
                <Linha key={p.nome}
                  esquerda={<Avatar nome={p.nome} />}
                  titulo={p.nome}
                  /* Situação escrita em todas, não só um pontinho de cor — e
                     embaixo do e-mail, não ao lado: ao lado ela espremia o
                     nome e cortava o e-mail em tela de 360px. */
                  sub={<>
                    <span className="block truncate">{p.email || 'sem e-mail'}</span>
                    <span className={clsx('mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold',
                      p.situacao === 'ativo' ? 'bg-presente-fraco text-presente'
                        : p.situacao === 'pendente' ? 'bg-justif-fraco text-justif-tinta' : 'bg-fundo text-apagado')}>
                      {p.situacao === 'ativo' ? 'Ativa' : p.situacao === 'pendente' ? 'Ainda não entrou' : 'Sem acesso'}
                    </span>
                  </>}
                  rotulo={p.nome + ', ' + SITUACAO[p.situacao]}
                  direita={<ChevronRight size={18} className="shrink-0 text-apagado" />}
                  onClick={() => acoes(p)} />
              ))}
            </Lista>
          </>
        ) : (
          <Estado icone={User} titulo="Ninguém na equipe ainda" texto='Toque em "Adicionar professora", aqui embaixo. Ela recebe uma senha para entrar no app.' />
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
  const [erro, setErro] = useState<{ campo: 'nome' | 'email'; msg: string } | null>(null);
  const primeiro = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => primeiro.current?.focus(), 320);
    return () => clearTimeout(t);
  }, []);
  function enviar() {
    const n = p ? p.nome : nome.trim().replace(/\s+/g, ' ');
    const e = email.trim().toLowerCase();
    if (n.length < 2) { setErro({ campo: 'nome', msg: 'Escreva o nome, como aparece na chamada.' }); vibrar(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setErro({ campo: 'email', msg: e ? 'Esse e-mail não parece completo. Confira o @ e o final.' : 'Escreva o e-mail que ela usa.' });
      vibrar(); return;
    }
    fechar();
    setTimeout(() => fn(n, e), 60);
  }
  return (
    <form onSubmit={(ev) => { ev.preventDefault(); enviar(); }} noValidate>
      <div className="px-2">
        {!p && (
          <Campo id="acNome" rotulo="Nome" icone={User} ref={primeiro} type="text" autoComplete="off" autoCapitalize="words"
            enterKeyHint="next" erro={erro?.campo === 'nome' ? erro.msg : undefined}
            value={nome} onChange={(e) => { setNome(e.target.value); setErro(null); }} />
        )}
        <Campo id="acEmail" rotulo="E-mail" icone={Mail} ref={p ? primeiro : undefined} type="email" inputMode="email" autoComplete="off"
          autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="done" placeholder="nome@email.com"
          erro={erro?.campo === 'email' ? erro.msg : undefined}
          value={email} onChange={(e) => { setEmail(e.target.value); setErro(null); }} />
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
      <Banner tom="sucesso" titulo="Acesso pronto">
        Mande agora para {primeiroNome(r.nome)}: esta senha não aparece de novo. Se perder, é só gerar outra.
      </Banner>
      {/* Cartão de credencial: o que a pessoa vai digitar, grande e separado. */}
      <div className={CARTAO_ELEVADO + ' mb-4 overflow-hidden'}>
        <div className="flex items-center gap-3 border-b border-borda px-4 py-3">
          <Mail size={18} className="shrink-0 text-apagado" />
          <span className="min-w-0">
            <small className="block text-xs text-apagado">E-mail</small>
            <b className="block text-base break-all select-text">{r.email}</b>
          </span>
        </div>
        <div className="flex items-center gap-3 bg-roxo-fraco/60 px-4 py-3">
          <KeyRound size={18} className="shrink-0 text-roxo" />
          <span className="min-w-0">
            <small className="block text-xs text-apagado">Senha temporária</small>
            <b className="block font-mono text-[26px] leading-tight tracking-[.14em] text-roxo select-text">{r.senha}</b>
          </span>
        </div>
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
