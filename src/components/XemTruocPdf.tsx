import { useEffect, useRef, useState } from 'react';

/**
 * Vẽ từng trang PDF thành ảnh bằng pdf.js — xem được trên mọi điện thoại
 * (trình duyệt điện thoại thường không hiển thị được PDF nhúng trong trang).
 */
export function XemTruocPdf({ blob }: { blob: Blob }) {
  const khung = useRef<HTMLDivElement>(null);
  const [loi, setLoi] = useState('');

  useEffect(() => {
    let huy = false;
    const noiChua = khung.current!;
    noiChua.replaceChildren();
    (async () => {
      try {
        const [pdfjs, { default: duongDanWorker }] = await Promise.all([
          import('pdfjs-dist/legacy/build/pdf.mjs'),
          import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
        ]);
        pdfjs.GlobalWorkerOptions.workerSrc = duongDanWorker;
        const taiLieu = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
        const doNet = Math.min(window.devicePixelRatio || 1, 2);
        for (let so = 1; so <= taiLieu.numPages && !huy; so++) {
          const trang = await taiLieu.getPage(so);
          const rong = noiChua.clientWidth || 600;
          const goc = trang.getViewport({ scale: 1 });
          const khungNhin = trang.getViewport({ scale: (rong / goc.width) * doNet });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(khungNhin.width);
          canvas.height = Math.floor(khungNhin.height);
          canvas.className = 'trang-pdf';
          canvas.setAttribute('aria-label', `Trang ${so}`);
          noiChua.appendChild(canvas);
          await trang.render({ canvasContext: canvas.getContext('2d')!, viewport: khungNhin }).promise;
        }
        void taiLieu.destroy();
      } catch (e) {
        console.error(e);
        if (!huy) setLoi('Không hiển thị được bản xem trước. Bạn vẫn có thể bấm "Tải PDF".');
      }
    })();
    return () => {
      huy = true;
    };
  }, [blob]);

  return (
    <>
      {loi && <p className="trong">{loi}</p>}
      <div ref={khung} className="khung-xem-truoc" />
    </>
  );
}
