/** Nén ảnh trên trình duyệt bằng canvas. */

function docAnh(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh'));
    };
    img.src = url;
  });
}

function veLenCanvas(img: HTMLImageElement, canhLonNhat: number, nenTrang: boolean): HTMLCanvasElement {
  const tyLe = Math.min(1, canhLonNhat / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * tyLe);
  canvas.height = Math.round(img.naturalHeight * tyLe);
  const ctx = canvas.getContext('2d')!;
  if (nenTrang) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Ảnh chụp sản phẩm: JPEG, cạnh dài tối đa 1280px (~150–300 KB). */
export async function nenAnhChup(file: Blob, canhLonNhat = 1280, chatLuong = 0.72): Promise<string> {
  const img = await docAnh(file);
  return veLenCanvas(img, canhLonNhat, true).toDataURL('image/jpeg', chatLuong);
}

/** Logo: PNG giữ nền trong suốt, cạnh dài tối đa 400px. */
export async function nenLogo(file: Blob): Promise<string> {
  const img = await docAnh(file);
  return veLenCanvas(img, 400, false).toDataURL('image/png');
}
