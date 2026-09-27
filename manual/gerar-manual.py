"""Gera o PDF do manual do usuário.

    python3 manual/gerar-manual.py [pasta-com-prints]

- põe o logo do app (a bailarina de AppInicio.html) na capa;
- converte os prints (PNG do preview, 2x) para JPEG em manual/img/;
- imprime manual/manual.html em A4 pelo Chrome headless do cache do
  Playwright, em manual/Veridiana-Manual-do-Usuario.pdf.

Sem pasta de prints, usa os que já estão em manual/img/.
"""
import glob, os, re, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
IMG = os.path.join(AQUI, 'img')
SAIDA = os.path.join(AQUI, 'Veridiana-Manual-do-Usuario.pdf')

def chrome():
    achados = sorted(glob.glob(os.path.expanduser(
        '~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell')))
    if not achados:
        sys.exit('Chrome headless do Playwright não encontrado em ~/.cache/ms-playwright')
    return achados[-1]

def prints(origem):
    from PIL import Image
    os.makedirs(IMG, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(origem, '[0-9][0-9]-*.png'))):
        nome = os.path.splitext(os.path.basename(f))[0] + '.jpg'
        im = Image.open(f).convert('RGB')
        im.save(os.path.join(IMG, nome), 'JPEG', quality=86, optimize=True, progressive=True)

def logo():
    src = open(os.path.join(RAIZ, 'apps-script', 'AppInicio.html'), encoding='utf-8').read()
    m = re.search(r"var LOGO = ((?:'[^']*'\s*\+?\s*)+);", src)
    partes = re.findall(r"'([^']*)'", m.group(1))
    return ''.join(partes)

if len(sys.argv) > 1:
    prints(sys.argv[1])

html = open(os.path.join(AQUI, 'manual.html'), encoding='utf-8').read().replace('{{LOGO}}', logo())
tmp = os.path.join(AQUI, '.manual-montado.html')
open(tmp, 'w', encoding='utf-8').write(html)
try:
    subprocess.run([chrome(), '--no-sandbox', '--headless', '--no-pdf-header-footer',
                    '--virtual-time-budget=8000', '--run-all-compositor-stages-before-draw',
                    '--print-to-pdf=' + SAIDA, 'file://' + tmp],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
finally:
    os.remove(tmp)
print(SAIDA, os.path.getsize(SAIDA) // 1024, 'KB')
