import { createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { api, limparCache } from '../api/cliente';
import { usarSessao, usarSessaoDeTroca, guardarSenhaTemp, usuarioAtual, sessaoAtual, type Usuario } from '../sessao';
import { KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { corDoSistema } from '../ui/Tela';
import { Banner, BotaoCheio, Campo, CampoSenha } from '../ui/kit';
import { textoErro, vibrar } from '../util';

type Busca = { volta?: string; aviso?: 1 };

export const Route = createFileRoute('/entrar')({
  validateSearch: (s: Record<string, unknown>): Busca => ({
    /* Só caminho do próprio app: link de fora não vira redirecionamento. */
    volta: typeof s.volta === 'string' && s.volta.startsWith('/') && !s.volta.startsWith('//') ? s.volta : undefined,
    aviso: s.aviso ? 1 : undefined,
  }),
  /* Já entrou (atalho guardado, voltar do navegador): segue para o app. */
  beforeLoad: ({ search }) => {
    if (sessaoAtual() && usuarioAtual()) throw redirect({ href: search.volta || '/', replace: true });
  },
  component: Entrar,
});

/* Depois do login, para onde a pessoa queria ir. */
export function useSeguir() {
  const router = useRouter();
  return (volta?: string) => router.history.replace(volta || '/');
}

/* Último e-mail que entrou neste aparelho: a sessão vence a cada 30 dias
   e ninguém precisa digitar o e-mail de novo (só a senha). */
const CHAVE_EMAIL = 'veridiana.ultimo-email';
function ultimoEmail() { try { return localStorage.getItem(CHAVE_EMAIL) || ''; } catch { return ''; } }
function guardarEmail(e: string) { try { localStorage.setItem(CHAVE_EMAIL, e); } catch { /* nada */ } }

/* Login. Topo de marca + folha clara com o formulário, como em app de
   banco: a primeira tela é a cara do instituto. O erro aparece embaixo do
   campo (perto do problema), não num toast que some. Com o teclado aberto
   a tela fica baixa e o topo encolhe. */
function Entrar() {
  const { volta, aviso } = Route.useSearch();
  const navigate = useNavigate();
  const seguir = useSeguir();
  const lembrado = useRef(ultimoEmail()).current;
  const [email, setEmail] = useState(lembrado);
  const [senha, setSenha] = useState('');
  const [indo, setIndo] = useState(false);
  const [erro, setErro] = useState<{ campo: 'email' | 'senha'; msg: string } | null>(null);
  const campoSenha = useRef<HTMLInputElement>(null);

  useEffect(() => { document.title = 'Entrar — Veridiana'; corDoSistema('#4A1D6E'); }, []);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim();
    if (!em) { setErro({ campo: 'email', msg: 'Escreva o seu e-mail.' }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setErro({ campo: 'email', msg: 'Esse e-mail não parece completo. Confira o @ e o final.' }); return; }
    if (!senha) { setErro({ campo: 'senha', msg: 'Escreva a sua senha.' }); campoSenha.current?.focus(); return; }
    setErro(null);
    setIndo(true);
    try {
      const r = await api<{ token: string; trocar: boolean; usuario: Usuario }>('entrar', [em, senha]);
      guardarEmail(r.usuario.email);
      /* Outra pessoa neste aparelho: nada de quem estava antes. */
      const antes = usuarioAtual();
      if (antes && antes.email !== r.usuario.email) await limparCache();
      if (r.trocar) {
        /* Senha temporária: a sessão só serve para trocar. */
        usarSessaoDeTroca(r.token, r.usuario);
        guardarSenhaTemp(senha);
        navigate({ to: '/senha', search: { primeira: 1, volta }, replace: true });
        return;
      }
      usarSessao(r.token, r.usuario);
      vibrar();
      seguir(volta);
    } catch (err) {
      setIndo(false);
      setSenha('');
      campoSenha.current?.focus();
      setErro({ campo: 'senha', msg: textoErro(err) });
    }
  }

  return (
    <main className="flex min-h-dvh flex-col bg-roxo">
      {/* Topo de marca */}
      <div className="sobre-roxo flex flex-col items-center px-6 pt-[calc(env(safe-area-inset-top)+44px)] pb-10 text-center text-white
        baixo:flex-row baixo:gap-3 baixo:pt-[calc(env(safe-area-inset-top)+12px)] baixo:pb-5 baixo:text-left">
        <span className="mb-4 size-20 rounded-[24px] bg-white p-1.5 text-roxo shadow-[0_10px_30px_rgba(0,0,0,.25)] [&_.logo]:size-full baixo:mb-0 baixo:size-11 baixo:rounded-xl baixo:p-1">
          <Logo />
        </span>
        <div>
          <h1 className="text-[26px] leading-tight font-extrabold tracking-tight baixo:text-lg">Instituto Veridiana</h1>
          <p className="mt-1 text-[15px] text-roxo-claro baixo:hidden">Chamada e gestão do instituto</p>
        </div>
      </div>

      {/* Folha do formulário */}
      <form onSubmit={entrar} noValidate
        className="-mt-px flex flex-1 flex-col rounded-t-[28px] bg-fundo px-5 pt-7 pb-[calc(20px+env(safe-area-inset-bottom))] baixo:pt-5">
        <div className="mx-auto w-full max-w-[400px] flex-1">
          <h2 className="text-[22px] font-extrabold tracking-tight">{lembrado ? 'Que bom te ver de novo' : 'Entrar'}</h2>
          <p className="mt-1 mb-6 text-[15px] leading-normal text-apagado baixo:mb-4">
            {lembrado ? 'Digite sua senha para continuar.' : 'Use o e-mail e a senha que a gestão cadastrou para você.'}
          </p>

          {/* Não é erro de ninguém: é segurança. Tom informativo, diz o que
              aconteceu, por quê, e que nada se perdeu. */}
          {aviso && (
            <Banner tom="info" icone={ShieldCheck} titulo="Por segurança, entre de novo">
              Faz um tempo que você entrou neste celular, ou a sua senha mudou. Depois de entrar,
              o app abre na mesma tela em que você estava — nada se perdeu.
            </Banner>
          )}

          <Campo id="lgEmail" rotulo="E-mail" icone={Mail} type="email" inputMode="email" autoComplete="username"
            autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus={!lembrado} enterKeyHint="next"
            placeholder="seu@email.com"
            erro={erro?.campo === 'email' ? erro.msg : undefined}
            value={email} onChange={(e) => { setEmail(e.target.value); if (erro?.campo === 'email') setErro(null); }} />
          <CampoSenha id="lgSenha" rotulo="Senha" icone={LockKeyhole} autoComplete="current-password" ref={campoSenha}
            autoFocus={!!lembrado} enterKeyHint="go"
            erro={erro?.campo === 'senha' ? erro.msg : undefined}
            value={senha} onChange={(e) => { setSenha(e.target.value); if (erro?.campo === 'senha') setErro(null); }} />

          <BotaoCheio type="submit" carregando={indo} className="mt-2 text-[17px]">
            {indo ? 'Entrando…' : 'Entrar'}
          </BotaoCheio>

          {lembrado && (
            <button type="button" onClick={() => { setEmail(''); setSenha(''); setErro(null); guardarEmail(''); document.getElementById('lgEmail')?.focus(); }}
              className="mx-auto mt-3 block min-h-11 px-3 text-sm font-semibold text-roxo">
              Não é {lembrado}? Entrar com outro e-mail
            </button>
          )}
        </div>

        <div className="mx-auto mt-6 flex w-full max-w-[400px] items-start gap-3 rounded-m bg-papel px-4 py-3 text-[13px] leading-snug text-apagado shadow-cartao">
          <KeyRound size={18} className="mt-px shrink-0 text-roxo" />
          <span><b className="text-tinta">Esqueceu a senha?</b> Peça para alguém da gestão gerar uma nova em Gestão → Equipe e acessos.</span>
        </div>
      </form>
    </main>
  );
}
