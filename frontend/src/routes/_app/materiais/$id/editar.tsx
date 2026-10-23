import { createFileRoute } from '@tanstack/react-router';
import { TelaFormulario } from '../-Formulario';

export const Route = createFileRoute('/_app/materiais/$id/editar')({ component: Editar });

function Editar() {
  const { id } = Route.useParams();
  return <TelaFormulario id={id} />;
}
