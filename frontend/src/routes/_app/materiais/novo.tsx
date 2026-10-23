import { createFileRoute } from '@tanstack/react-router';
import { TelaFormulario } from './-Formulario';

export const Route = createFileRoute('/_app/materiais/novo')({ component: () => <TelaFormulario /> });
