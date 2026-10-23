/* Tela de erro de carregamento. Erro de configuração (URL da API errada,
   implantação nova) diz o que conferir em vez de mostrar erro técnico,
   e oferece o app HTML antigo como plano B. */
import { CircleAlert, WifiOff } from 'lucide-react';
import { ErroConfig, ErroRede } from '../api/cliente';
import { URL_API } from '../api/transporte';
import { textoErro } from '../util';
import { Estado } from './kit';

const URL_HTML = import.meta.env.VITE_URL_HTML || URL_API;

export function ErroTela({ erro, tentar, titulo = 'Não deu para carregar' }: {
  erro: unknown; tentar?: () => void; titulo?: string;
}) {
  if (erro instanceof ErroConfig) {
    return (
      <>
        <Estado icone={CircleAlert} titulo="O app não achou a planilha"
          texto={<>{erro.message} Quem cuida do app: abra <b>/exec?fn=ping</b> no navegador. Respondeu com a versão, a URL está viva.</>}
          botao={tentar && { txt: 'Tentar de novo', fn: tentar }} />
        {URL_HTML && (
          <p className="text-center text-sm text-apagado">
            Enquanto isso, a chamada funciona pelo{' '}
            <a className="font-semibold text-roxo underline" href={URL_HTML}>link antigo do app</a>.
          </p>
        )}
      </>
    );
  }
  if (erro instanceof ErroRede) {
    return <Estado icone={WifiOff} titulo="Sem conexão" texto={erro.message} botao={tentar && { txt: 'Tentar de novo', fn: tentar }} />;
  }
  return <Estado icone={CircleAlert} titulo={titulo} texto={textoErro(erro)} botao={tentar && { txt: 'Tentar de novo', fn: tentar }} />;
}
