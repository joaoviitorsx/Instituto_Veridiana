/* Tudo que pede login mora aqui dentro. Sem sessão, login — e depois
   volta para onde a pessoa queria ir (a turma do QR, por exemplo). */
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useEffect } from 'react';
import { api } from '../api/cliente';
import { sessaoAtual, usuarioAtual, atualizarUsuario, type Usuario } from '../sessao';

export const Route = createFileRoute('/_app')({
  beforeLoad: ({ location }) => {
    if (!sessaoAtual() || !usuarioAtual()) {
      throw redirect({ to: '/entrar', search: { volta: location.href }, replace: true });
    }
  },
  component: Logado,
});

function Logado() {
  /* A tela abre na hora com o nome guardado, sem perguntar ao servidor.
     Nome mudou na planilha? Atualiza por trás. Sessão caiu? A api manda
     para o login. Sem rede, nada acontece. */
  useEffect(() => {
    const t = sessaoAtual();
    api<Usuario>('quemSou').then((u) => {
      const a = usuarioAtual();
      if (sessaoAtual() === t && u && a && u.nome !== a.nome) atualizarUsuario(u);
    }).catch(() => {});
  }, []);
  return <Outlet />;
}
