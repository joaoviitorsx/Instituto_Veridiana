/* Reduz a foto ANTES de subir. Nota fiscal de 4 MB em 4G instável não
   chega — e o comprovante é justamente o que não pode faltar.
   Mesma conta do app HTML: lado maior em 1400 px, JPEG a 0,75. */
export function reduzirFoto(file: File | undefined | null): Promise<string> {
  return new Promise((ok) => {
    if (!file) { ok(''); return; }
    const r = new FileReader();
    r.onerror = () => ok('');
    r.onload = () => {
      const img = new Image();
      img.onerror = () => ok('');
      img.onload = () => {
        const max = 1400;
        const e = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * e);
        c.height = Math.round(img.height * e);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        try { ok(c.toDataURL('image/jpeg', 0.75)); } catch { ok(''); }
      };
      img.src = String(r.result);
    };
    r.readAsDataURL(file);
  });
}
