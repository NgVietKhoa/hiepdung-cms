/**
 * Đăng nhập bằng tài khoản riêng (bảng nguoi_dung), quyền theo vai trò (bảng vai_tro).
 * Phiên đăng nhập là chuỗi "id.phiên-bản.hạn.chữ-ký" ký HMAC bằng APP_SECRET, hiệu lực 30 ngày.
 * Đổi mật khẩu / khoá tài khoản thì tăng `phienBan` → mọi phiên cũ của người đó hết hiệu lực ngay.
 */
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { NextFunction, Request, Response } from 'express';
import { TAT_CA_QUYEN, laMaQuyen, type MaQuyen, type NguoiDungPhien } from '../src/db/quyen';
import { MOI_TRUONG } from './moiTruong';
import { prisma } from './prisma';

declare module 'express-serve-static-core' {
  interface Request {
    /** Người đang đăng nhập (do napPhien gắn vào) */
    nguoiDung?: NguoiDungPhien;
  }
}

const HIEU_LUC = 30 * 24 * 3600 * 1000;
const bamScrypt = promisify(scrypt) as (matKhau: string, muoi: Buffer, doDai: number) => Promise<Buffer>;

/** Chưa đặt APP_SECRET thì dùng chuỗi ngẫu nhiên — phiên đăng nhập mất khi khởi động lại máy chủ */
const BI_MAT = MOI_TRUONG.biMat || randomBytes(32).toString('hex');

/* ---------- Mật khẩu ---------- */

export const MAT_KHAU_TOI_THIEU = 6;

export async function bamMatKhau(matKhau: string): Promise<string> {
  const muoi = randomBytes(16);
  const bam = await bamScrypt(matKhau, muoi, 64);
  return `${muoi.toString('hex')}:${bam.toString('hex')}`;
}

export async function dungMatKhau(matKhau: unknown, daBam: string): Promise<boolean> {
  if (typeof matKhau !== 'string' || !matKhau) return false;
  const [muoi, bam] = daBam.split(':');
  if (!muoi || !bam) return false;
  const thu = await bamScrypt(matKhau, Buffer.from(muoi, 'hex'), 64);
  const goc = Buffer.from(bam, 'hex');
  return goc.length === thu.length && timingSafeEqual(goc, thu);
}

/* ---------- Phiên đăng nhập ---------- */

const ky = (noiDung: string) => createHmac('sha256', BI_MAT).update(noiDung).digest('hex');

/** So sánh không lộ thời gian */
function bangNhau(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function taoPhien(nguoiDung: { id: string; phienBan: number }): string {
  const noiDung = `${nguoiDung.id}.${nguoiDung.phienBan}.${Date.now() + HIEU_LUC}`;
  return `${noiDung}.${ky(noiDung)}`;
}

function docChuoiPhien(phien: string | undefined): { id: string; phienBan: number } | null {
  if (!phien) return null;
  const phan = phien.split('.');
  if (phan.length !== 4) return null;
  const [id, phienBan, hetHan, chuKy] = phan;
  if (Number(hetHan) < Date.now()) return null;
  if (!bangNhau(chuKy, ky(`${id}.${phienBan}.${hetHan}`))) return null;
  return { id, phienBan: Number(phienBan) };
}

function layPhien(req: Request): string | undefined {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : undefined;
}

const KEM_VAI_TRO = { vaiTro: true } as const;

function quyenCuaVaiTro(vt: { heThong: boolean; quyen: string[] }): MaQuyen[] {
  return vt.heThong ? [...TAT_CA_QUYEN] : vt.quyen.filter(laMaQuyen);
}

/** Đọc người dùng từ phiên; tài khoản bị khoá / đã đổi mật khẩu → null */
async function nguoiDungTuPhien(phien: string | undefined): Promise<NguoiDungPhien | null> {
  const p = docChuoiPhien(phien);
  if (!p) return null;
  const nd = await prisma.nguoiDung.findUnique({ where: { id: p.id }, include: KEM_VAI_TRO });
  if (!nd || nd.khoa || nd.phienBan !== p.phienBan) return null;
  return {
    id: nd.id,
    tenDangNhap: nd.tenDangNhap,
    hoTen: nd.hoTen,
    vaiTro: nd.vaiTro.ten,
    quyen: quyenCuaVaiTro(nd.vaiTro),
    nhanVienId: nd.nhanVienId,
  };
}

/** Kiểm tra tên đăng nhập + mật khẩu; đúng thì trả về chuỗi phiên */
export async function dangNhap(tenDangNhap: unknown, matKhau: unknown): Promise<string | null> {
  const ten = String(tenDangNhap ?? '').trim().toLowerCase();
  const nd = ten ? await prisma.nguoiDung.findUnique({ where: { tenDangNhap: ten } }) : null;
  // Không có tài khoản vẫn băm thử để thời gian phản hồi như nhau
  const dung = await dungMatKhau(matKhau, nd?.matKhauBam ?? '00:00');
  if (!nd || nd.khoa || !dung) return null;
  await prisma.nguoiDung.update({ where: { id: nd.id }, data: { lanDangNhapCuoi: new Date() } });
  return taoPhien(nd);
}

/* ---------- Middleware ---------- */

/** Gắn req.nguoiDung nếu có phiên hợp lệ (không chặn) */
export function napPhien(req: Request, _res: Response, next: NextFunction) {
  nguoiDungTuPhien(layPhien(req))
    .then((nd) => {
      if (nd) req.nguoiDung = nd;
      next();
    })
    .catch(next);
}

export function batBuocDangNhap(req: Request, res: Response, next: NextFunction) {
  if (req.nguoiDung) return next();
  res.status(401).json({ loi: 'Cần đăng nhập' });
}

export const coQuyen = (req: Request, ...ma: MaQuyen[]) => ma.some((q) => req.nguoiDung?.quyen.includes(q));

/** Cần ít nhất một trong các quyền */
export const canQuyen =
  (...ma: MaQuyen[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (coQuyen(req, ...ma)) return next();
    res.status(403).json({ loi: 'Tài khoản của bạn không có quyền dùng chức năng này' });
  };
