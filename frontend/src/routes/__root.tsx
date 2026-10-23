import { createRootRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { MapPinOff } from 'lucide-react';
import { Toaster } from '../ui/toast';
import { Folha } from '../ui/folha';
import { AvisoAtualizacao } from '../ui/AvisoAtualizacao';
import { Estado } from '../ui/kit';
import { Tela } from '../ui/Tela';

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster />
      <Folha />
      <AvisoAtualizacao />
    </>
  ),
  notFoundComponent: NaoAchou,
});

function NaoAchou() {
  const navigate = useNavigate();
  return (
    <Tela titulo="Não encontrado">
      <Estado icone={MapPinOff} titulo="Essa tela não existe" texto="O link pode estar errado ou ser de uma versão antiga."
        botao={{ txt: 'Ir para o início', fn: () => navigate({ to: '/' }) }} />
    </Tela>
  );
}
