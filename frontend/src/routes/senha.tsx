/* Criar a senha (primeiro acesso, com a temporária) ou trocar a senha. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { api } from '../api/cliente';
import { usarSessao, useSessao, pegarSenhaTemp, guardarSenhaTemp, type Usuario } from '../sessao';
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

  if (!sessao || !usuario) {
    navigate({ to: '/entrar', replace: true });
    return null;
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (nova.length < 6) { toast('A senha nova precisa ter pelo menos 6 caracteres.', 'erro'); return; }
    if (nova !== conf) { toast('As duas senhas novas não são iguais.', 'erro'); return; }
    setIndo(true);
    try {
      const r = await api<{ token: string; usuario: Usuario }>('trocarSenha', [primeira ? pegarSenhaTemp() : atual, nova]);
      guardarSenhaTemp('');
      usarSessao(r.token, r.usuario);
      vibrar(); toast('Senha salva');
      if (primeira) seguir(volta); else sair();
    } catch (err) {
      setIndo(false);
      toast(textoErro(err), 'erro');
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
        {!primeira && <CampoSenha id="tsAtual" rotulo="Senha atual" autoComplete="current-password" autoFocus
          value={atual} onChange={(e) => setAtual(e.target.value)} />}
        <CampoSenha id="tsNova" rotulo="Senha nova" autoComplete="new-password" autoFocus={!!primeira}
          value={nova} onChange={(e) => setNova(e.target.value)} />
        <CampoSenha id="tsConf" rotulo="Repita a senha nova" autoComplete="new-password"
          value={conf} onChange={(e) => setConf(e.target.value)} />
        <BotaoCheio type="submit" disabled={indo} className="mt-2">{indo ? 'Salvando…' : 'Salvar senha'}</BotaoCheio>
      </form>
    </Tela>
  );
}
