"""Monta o preview.html: o app inteiro num arquivo, com o mock do
google.script.run, para abrir no navegador sem servidor.

No preview os módulos sob demanda (gestão, agenda, materiais) já vêm
dentro da página, marcados como prontos: o carregador não pede nada.

    python3 gerar-preview.py            -> preview.html
    python3 gerar-preview.py --lazy X   -> X, com os módulos servidos
                                           pelo mock (testa o carregador)
"""
import json, os, sys

B = 'apps-script'
PARTES = ['AppNucleo', 'AppInicio', 'AppChamada']          # espelha PARTES em Codigo.gs
MODULOS = {                                                 # espelha MODULOS em Codigo.gs
    'gestao': ['AppGestao', 'AppCaixa', 'AppQr'],
    'agenda': ['AppAgenda'],
    'materiais': ['AppMateriais'],
}

def ler(n):
    with open(os.path.join(B, n + '.html'), encoding='utf-8') as f:
        return f.read()

def antes(alvo, tag, conteudo):
    i = alvo.rindex(tag)
    return alvo[:i] + conteudo + '\n' + alvo[i:]

def modulo(nome):
    return '\n'.join(ler(n) for n in MODULOS[nome]) + \
        '\n<script>modPronto(' + json.dumps(nome) + ');</script>'

lazy = '--lazy' in sys.argv
saida = sys.argv[sys.argv.index('--lazy') + 1] if lazy else 'preview.html'

h = antes(ler('Index'), '</head>', ler('Estilo'))
# No Apps Script quem põe o viewport é o doGet (addMetaTag). Sem ele o
# celular desenha o preview a 980 px e tudo sai minúsculo.
h = h.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="viewport" '
              'content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">', 1)
corpo = [ler(n) for n in PARTES]
if not lazy:
    corpo += [modulo(m) for m in MODULOS]
corpo.append(ler('AppPartida'))
h = antes(h, '</body>', '\n'.join(corpo))

mock = open('mock.js', encoding='utf-8').read()
if lazy:
    mock = 'window.__MODULOS = ' + json.dumps({m: modulo(m) for m in MODULOS}).replace('</', '<\\/') + ';\n' + mock
i = h.index('</head>')
h = h[:i] + '<script>\n' + mock + '\n</script>\n' + h[i:]
with open(saida, 'w', encoding='utf-8') as f:
    f.write(h)
print(saida, 'gerado,', len(h.encode('utf-8')), 'bytes')
