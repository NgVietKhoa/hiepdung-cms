/** Tạo PDF, đặt tên file, tải về, in, chia sẻ (Zalo...). */
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { boDau } from '../lib/timKiem';

type PdfMake = typeof import('pdfmake/build/pdfmake');
let pdfMakeDangTai: Promise<PdfMake> | null = null;

/** pdfmake + font Roboto (~2 MB) chỉ tải khi cần xuất văn bản lần đầu. */
function layPdfMake(): Promise<PdfMake> {
  if (!pdfMakeDangTai) {
    pdfMakeDangTai = Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]).then(
      ([modPdf, modFont]) => {
        const pdfMake: any = (modPdf as any).default ?? modPdf;
        // vfs_fonts.js xuất thẳng bảng font (module.exports = vfs)
        pdfMake.vfs = (modFont as any).default ?? modFont;
        return pdfMake;
      },
    );
  }
  return pdfMakeDangTai;
}

export async function taoPdf(dinhNghia: TDocumentDefinitions): Promise<Blob> {
  const pdfMake = await layPdfMake();
  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(dinhNghia).getBlob((blob: Blob) => resolve(blob));
    } catch (e) {
      reject(e);
    }
  });
}

const TIEN_TO_CONG_TY =
  /^(công ty|cty)\s*(tnhh|cổ phần|cp)?\s*(một thành viên|mtv)?\s*|^(doanh nghiệp tư nhân|dntn)\s*|^(anh|chị|ông|bà)\s+/i;

/** "Công ty TNHH Thiết bị Hoàng Long" → "ThietBiHoangLong" */
export function tenKhachChoFile(tenKhach: string): string {
  const gon = tenKhach.replace(/\(.*?\)/g, '').trim().replace(TIEN_TO_CONG_TY, '');
  const camel = boDau(gon)
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t[0].toUpperCase() + t.slice(1))
    .join('');
  return camel.slice(0, 40) || 'KhachHang';
}

export function taiFile(blob: Blob, tenFile: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = tenFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function coTheChiaSeFile(): boolean {
  try {
    const thu = new File([new Blob(['x'], { type: 'application/pdf' })], 'thu.pdf', { type: 'application/pdf' });
    return !!navigator.canShare?.({ files: [thu] });
  } catch {
    return false;
  }
}

/** Mở bảng chia sẻ của điện thoại (Zalo, Messenger, Gmail...). Trả về false nếu không hỗ trợ. */
export async function chiaSeFile(blob: Blob, tenFile: string, tieuDe: string): Promise<boolean> {
  const file = new File([blob], tenFile, { type: 'application/pdf' });
  if (!navigator.canShare?.({ files: [file] })) return false;
  try {
    await navigator.share({ files: [file], title: tieuDe });
  } catch (e) {
    // Người dùng bấm huỷ — không phải lỗi
    if ((e as Error).name !== 'AbortError') throw e;
  }
  return true;
}

/** In: máy tính in qua khung ẩn; nếu không được thì mở PDF ở thẻ mới để in từ trình xem PDF. */
export function inPdf(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const laDienThoai = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (laDienThoai) {
    window.open(url, '_blank');
    return;
  }
  const khung = document.createElement('iframe');
  khung.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  khung.src = url;
  khung.onload = () => {
    try {
      khung.contentWindow?.focus();
      khung.contentWindow?.print();
    } catch {
      window.open(url, '_blank');
    }
    setTimeout(() => {
      khung.remove();
      URL.revokeObjectURL(url);
    }, 120_000);
  };
  document.body.appendChild(khung);
}
