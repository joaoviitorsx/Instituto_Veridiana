import { createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { api, limparCache } from '../api/cliente';
import { usarSessao, usarSessaoDeTroca, guardarSenhaTemp, usuarioAtual, sessaoAtual, type Usuario } from '../sessao';
import { Logo } from '../ui/Logo';
import { BotaoCheio, Campo, CampoSenha } from '../ui/kit';
import { toast } from '../ui/toast';
import { textoErro } from '../util';

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

function Entrar() {
  const { volta, aviso } = Route.useSearch();
  const navigate = useNavigate();
  const seguir = useSeguir();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [indo, setIndo] = useState(false);
  const campoSenha = useRef<HTMLInputElement>(null);

  useEffect(() => { document.title = 'Entrar — Veridiana'; }, []);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !senha) { toast('Preencha e-mail e senha.', 'erro'); return; }
    setIndo(true);
    try {
      const r = await api<{ token: string; trocar: boolean; usuario: Usuario }>('entrar', [email.trim(), senha]);
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
      seguir(volta);
    } catch (err) {
      setIndo(false);
      setSenha('');
      campoSenha.current?.focus();
      toast(textoErro(err), 'erro');
    }
  }

  return (
    <main className="min-h-dvh bg-fundo pt-[env(safe-area-inset-top)]">
      <form onSubmit={entrar} noValidate className="mx-auto max-w-[400px] px-5 pt-8 pb-[calc(24px+env(safe-area-inset-bottom))]">
        <div className="mb-4 flex justify-center">
          <span className="size-16 rounded-[20px] bg-roxo p-1 text-white [&_.logo]:size-full"><Logo /></span>
        </div>
        <h2 className="mb-2 text-center text-[21px] font-bold tracking-tight">Instituto Veridiana</h2>
        <p className="mb-6 text-center text-[15px] leading-normal text-apagado">
          Entre com o e-mail e a senha que a gestão cadastrou para você.
        </p>
        {aviso && (
          <p className="mb-6 rounded-m bg-falta-fraco px-3.5 py-2.5 text-center text-[15px] text-falta">
            Sua sessão terminou. Entre de novo.
          </p>
        )}
        <Campo id="lgEmail" rotulo="E-mail" type="email" inputMode="email" autoComplete="username"
          autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <CampoSenha id="lgSenha" rotulo="Senha" autoComplete="current-password" ref={campoSenha}
          value={senha} onChange={(e) => setSenha(e.target.value)} />
        <BotaoCheio type="submit" disabled={indo} className="mt-2">{indo ? 'Entrando…' : 'Entrar'}</BotaoCheio>
        <p className="mt-4 text-center text-[13px] text-apagado">Esqueceu a senha? Peça para a gestão gerar uma nova.</p>
      </form>
    </main>
  );
}
