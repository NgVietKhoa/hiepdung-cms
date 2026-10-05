/** Tiện ích dùng chung cho các module máy chủ: bọc route async, cấp số phiếu, lọc theo ngày. */
import type { NextFunction, Request, Response } from 'express';
import { Prisma } from './generated/prisma/client';
import { laThang, khoangThang, thangHienTai } from '../src/lib/thang';
import { namCua } from '../src/lib/dinhDang';
import { soKeTiep } from '../src/lib/soChungTu';
import { chuoi, chuoiRaNgay } from './anhXa';
import { LoiApi } from './dichVu';

export { LoiApi };
export type Tx = Prisma.TransactionClient;

type XuLy = (req: Request, res: Response) => Promise<unknown>;
/** Bọc hàm async để lỗi được chuyển tới bộ xử lý lỗi chung */
export const boc = (fn: XuLy) => (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);
export const thamSo = (req: Request, ten = 'id') => String(req.params[ten]);

/** Trả JSON; null/undefined → 404 với thông báo */
export const traVe = (res: Response, kq: unknown, khongThay = 'Không tìm thấy') => {
  if (kq == null) throw new LoiApi(404, khongThay);
  res.json(kq);
};

/**
 * Khoảng ngày lọc từ query: ?thang=YYYY-MM, hoặc ?tu=YYYY-MM-DD&den=YYYY-MM-DD (den tính cả ngày đó).
 * Không có gì thì lấy tháng hiện tại. Trả về [tu, den) dạng Date cho cột @db.Date.
 */
export function khoangNgay(q: Request['query']): { tu: Date; den: Date } {
  const tu = chuoiRaNgay(q.tu);
  const den = chuoiRaNgay(q.den);
  if (tu && den) return { tu, den: new Date(den.getTime() + 24 * 3600 * 1000) };
  const thang = laThang(q.thang) ? q.thang : thangHienTai();
  const k = khoangThang(thang);
  return { tu: chuoiRaNgay(k.tu)!, den: chuoiRaNgay(k.den)! };
}

/** ?thang=YYYY-MM hợp lệ, không có thì tháng hiện tại */
export const thangTuQuery = (q: Request['query']) => (laThang(q.thang) ? q.thang : thangHienTai());

/* ---------- Cấp số phiếu ---------- */

/** Khoá advisory theo loại phiếu (khác khoá báo giá 73_001 / nghiệm thu 73_002 trong dichVu.ts) */
export const KHOA_CAP_SO = { phieuThu: 73_011, phieuChi: 73_012, phieuNhap: 73_021, phieuXuat: 73_022 } as const;

/**
 * Số kế tiếp dạng "PT-2026-001" trong giao dịch có khoá — hai máy tạo cùng lúc không trùng số.
 * `dsSo(dau)` trả về các số đã có bắt đầu bằng `dau`.
 */
export async function capSoPhieu(
  tx: Tx,
  khoa: number,
  tienTo: string,
  ngay: Date,
  soChuSo: number,
  dsSo: (dau: string) => Promise<string[]>,
): Promise<string> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${khoa})`;
  const nam = namCua(ngay.toISOString().slice(0, 10));
  return soKeTiep(await dsSo(`${tienTo}-${nam}-`), tienTo, nam, soChuSo);
}

/** Lỗi trùng giá trị UNIQUE (vd. số phiếu người dùng tự gõ đã có) → báo rõ ràng */
export async function baoTrungSo<T>(soGui: unknown, lam: () => Promise<T>): Promise<T> {
  try {
    return await lam();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new LoiApi(409, `Số phiếu "${chuoi(soGui)}" đã được dùng. Vui lòng đổi số khác.`);
    }
    throw e;
  }
}

/** Ghi lần lượt từng phần tử trong giao dịch (thay cho Promise.all — một giao dịch chỉ chạy được một lệnh một lúc) */
export async function lanLuot<T>(ds: T[], lam: (x: T, i: number) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < ds.length; i++) await lam(ds[i], i);
}
