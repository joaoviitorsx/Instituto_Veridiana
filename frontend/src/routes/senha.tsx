/* Criar a senha (primeiro acesso, com a temporária) ou trocar a senha. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { api } from '../api/cliente';
import { usarSessao, useSessao, pegarSenhaTemp, guardarSenhaTemp, type Usuario } from '../sessao';
import { KeyRound, LockKeyhole } from 'lucide-react';
import { Tela, useVoltar } from '../ui/Tela';
import { BotaoCheio, CampoSenha } from '../ui/kit';
import { toast } from '../ui/toast';
import { primeiroNome, textoErro, vibrar } from '../util';
import { useSeguir } from './entrar';

type Busca = { primeira?: 1; volta?: string };

export const Route = createFileRoute('/senha')({
  validateSearch: (s: Record<string, unknown>): Busca => ({
    primeira: s.primeira ? 1 : undefined,
    volta: typeof s.volta === 'string' && s.volta.startsWith('/') && !s.volta.startsWith('//') ? s.volta : undefined,
  }),
  component: Senha,
});

function Senha() {
  const { primeira, volta } = Route.useSearch();
  const { sessao, usuario } = useSessao();
  const navigate = useNavigate();
  const seguir = useSeguir();
  const sair = useVoltar('/');
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [conf, setConf] = useState('');
  const [indo, setIndo] = useState(false);
  /* Erro embaixo do campo certo, não num toast. */
  const [erro, setErro] = useState<{ campo: 'atual' | 'nova' | 'conf'; msg: string } | null>(null);

  if (!sessao || !usuario) {
    navigate({ to: '/entrar', replace: true });
    return null;
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!primeira && !atual) { setErro({ campo: 'atual', msg: 'Escreva a senha que você usa hoje.' }); return; }
    if (nova.length < 6) { setErro({ campo: 'nova', msg: 'Pelo menos 6 letras ou números.' }); return; }
    if (nova !== conf) { setErro({ campo: 'conf', msg: 'Não ficou igual à senha nova. Digite de novo.' }); return; }
    setErro(null);
    setIndo(true);
    try {
      const r = await api<{ token: string; usuario: Usuario }>('trocarSenha', [primeira ? pegarSenhaTemp() : atual, nova]);
      guardarSenhaTemp('');
      usarSessao(r.token, r.usuario);
      vibrar(); toast('Senha salva');
      if (primeira) seguir(volta); else sair();
    } catch (err) {
      setIndo(false);
      const msg = textoErro(err);
      setErro({ campo: /atual/i.test(msg) ? 'atual' : 'nova', msg });
    }
  }

  return (
    <Tela titulo={primeira ? 'Criar sua senha' : 'Trocar senha'} voltar={primeira ? false : '/'} solto>
      <form onSubmit={salvar} noValidate className="mx-auto max-w-[400px] px-5 pt-8 pb-6">
        <h2 className="mb-2 text-center text-[21px] font-bold tracking-tight">
          {primeira ? 'Olá, ' + primeiroNome(usuario.nome) + '!' : 'Trocar senha'}
        </h2>
        <p className="mb-6 text-center text-[15px] leading-normal text-apagado">
          {primeira
            ? 'Essa senha foi só para o primeiro acesso. Escolha a sua, com pelo menos 6 caracteres.'
            : 'Pelo menos 6 caracteres. Os outros aparelhos onde você entrou vão pedir a senha nova.'}
        </p>
        <input type="email" autoComplete="username" hidden readOnly value={usuario.email} />
        {!primeira && <CampoSenha id="tsAtual" rotulo="Senha atual" icone={LockKeyhole} autoComplete="current-password" autoFocus
          erro={erro?.campo === 'atual' ? erro.msg : undefined}
          value={atual} onChange={(e) => { setAtual(e.target.value); setErro(null); }} />}
        <CampoSenha id="tsNova" rotulo="Senha nova" icone={KeyRound} autoComplete="new-password" autoFocus={!!primeira}
          erro={erro?.campo === 'nova' ? erro.msg : undefined}
          value={nova} onChange={(e) => { setNova(e.target.value); setErro(null); }} />
        <CampoSenha id="tsConf" rotulo="Repita a senha nova" icone={KeyRound} autoComplete="new-password"
          erro={erro?.campo === 'conf' ? erro.msg : undefined}
          value={conf} onChange={(e) => { setConf(e.target.value); setErro(null); }} />
        <BotaoCheio type="submit" carregando={indo} className="mt-2">{indo ? 'Salvando…' : 'Salvar senha'}</BotaoCheio>
      </form>
    </Tela>
  );
}
