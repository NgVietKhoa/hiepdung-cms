/**
 * Landing page: quản lý nội dung (cần quyền landing) và API công khai cho trang landing (không cần đăng nhập).
 * Trang landing làm riêng, có thể ở tên miền khác → API công khai bật CORS (LANDING_ORIGIN trong .env).
 */
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Prisma } from '../generated/prisma/client';
import type { AnhLanding, CaiDatLanding, KhoiLanding, LienHeLanding, MucKhoi, TrangCongKhai } from '../../src/modules/landing/kieu';
import { duongDanAnh } from '../../src/modules/landing/kieu';
import { dangHien } from '../../src/lib/hienThiXuong';
import { chuoi } from '../anhXa';
import { layCaiDat } from '../dichVu';
import { MOI_TRUONG } from '../moiTruong';
import { prisma } from '../prisma';
import { boc, lanLuot, LoiApi, thamSo } from '../tienIch';
import { canQuyen } from '../xacThuc';

/* ---------- Chuyển đổi ---------- */

const mucVaoDB = (x: unknown): MucKhoi[] =>
  (Array.isArray(x) ? x : []).slice(0, 60).map((m) => ({
    tieuDe: chuoi(m?.tieuDe),
    moTa: chuoi(m?.moTa),
    anhId: chuoi(m?.anhId) || null,
    lienKet: chuoi(m?.lienKet),
  }));

const khoiRaApp = (k: Prisma.KhoiLandingGetPayload<object>): KhoiLanding => ({
  id: k.id,
  loai: k.loai,
  tieuDe: k.tieuDe,
  phuDe: k.phuDe,
  noiDung: k.noiDung,
  anhId: k.anhId,
  nutChu: k.nutChu,
  nutLienKet: k.nutLienKet,
  danhSachMuc: mucVaoDB(k.danhSachMuc),
  hien: k.hien,
  thuTu: k.thuTu,
  ngaySua: k.ngaySua.getTime(),
});

const khoiVaoDB = (k: Partial<KhoiLanding>) => ({
  loai: chuoi(k.loai).trim() || 'tuyChon',
  tieuDe: chuoi(k.tieuDe),
  phuDe: chuoi(k.phuDe),
  noiDung: chuoi(k.noiDung),
  anhId: chuoi(k.anhId) || null,
  nutChu: chuoi(k.nutChu),
  nutLienKet: chuoi(k.nutLienKet),
  danhSachMuc: mucVaoDB(k.danhSachMuc) as unknown as Prisma.InputJsonValue,
  hien: k.hien !== false,
});

const CHON_ANH = { id: true, tenFile: true, kieuFile: true, kichThuoc: true, moTa: true, ngayTao: true } as const;
const anhRaApp = (a: Prisma.AnhLandingGetPayload<{ select: typeof CHON_ANH }>): AnhLanding => ({ ...a, ngayTao: a.ngayTao.getTime() });

const lienHeRaApp = (l: Prisma.LienHeLandingGetPayload<object>): LienHeLanding => ({
  id: l.id,
  hoTen: l.hoTen,
  soDienThoai: l.soDienThoai,
  email: l.email,
  noiDung: l.noiDung,
  daXuLy: l.daXuLy,
  ghiChu: l.ghiChu,
  ngayTao: l.ngayTao.getTime(),
});

const CAI_DAT_TRONG: CaiDatLanding = {
  xuatBan: false,
  tieuDeTrang: '',
  moTa: '',
  tuKhoa: '',
  anhChiaSeId: null,
  lienKetZalo: '',
  lienKetFacebook: '',
  banDo: '',
  maTheoDoi: '',
};
async function layCaiDatLanding(): Promise<CaiDatLanding> {
  const c = await prisma.caiDatLanding.findUnique({ where: { id: 'landing' } });
  if (!c) return { ...CAI_DAT_TRONG };
  const { id: _id, ...con } = c;
  return con;
}
const caiDatLandingVaoDB = (c: Partial<CaiDatLanding>) => ({
  xuatBan: Boolean(c.xuatBan),
  tieuDeTrang: chuoi(c.tieuDeTrang),
  moTa: chuoi(c.moTa),
  tuKhoa: chuoi(c.tuKhoa),
  anhChiaSeId: chuoi(c.anhChiaSeId) || null,
  lienKetZalo: chuoi(c.lienKetZalo),
  lienKetFacebook: chuoi(c.lienKetFacebook),
  banDo: chuoi(c.banDo),
  maTheoDoi: chuoi(c.maTheoDoi),
});

/* ---------- Ảnh ---------- */

const ANH_TOI_DA = 5 * 1024 * 1024;
const KIEU_ANH = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

/* ---------- Tuyến quản lý (quyền landing) ---------- */

export const tuyenLanding = express.Router();
tuyenLanding.use('/landing', canQuyen('landing'));

tuyenLanding.get(
  '/landing/khoi',
  boc(async (_req, res) => {
    res.json((await prisma.khoiLanding.findMany({ orderBy: { thuTu: 'asc' } })).map(khoiRaApp));
  }),
);

tuyenLanding.put(
  '/landing/khoi/:id',
  boc(async (req, res) => {
    const id = thamSo(req);
    const duLieu = khoiVaoDB(req.body ?? {});
    const thuTu = ((await prisma.khoiLanding.aggregate({ _max: { thuTu: true } }))._max.thuTu ?? 0) + 1;
    const k = await prisma.khoiLanding.upsert({ where: { id }, create: { id, ...duLieu, thuTu }, update: duLieu });
    res.json(khoiRaApp(k));
  }),
);

tuyenLanding.delete(
  '/landing/khoi/:id',
  boc(async (req, res) => {
    await prisma.khoiLanding.deleteMany({ where: { id: thamSo(req) } });
    res.status(204).end();
  }),
);

/** Đổi thứ tự khối: gửi danh sách id theo thứ tự mới */
tuyenLanding.post(
  '/landing/thu-tu',
  boc(async (req, res) => {
    const ids = Array.isArray(req.body) ? req.body.map((x: unknown) => chuoi(x)) : [];
    await prisma.$transaction((tx) => lanLuot(ids, (id, i) => tx.khoiLanding.updateMany({ where: { id }, data: { thuTu: i + 1 } })));
    res.status(204).end();
  }),
);

tuyenLanding.get(
  '/landing/anh',
  boc(async (_req, res) => {
    res.json((await prisma.anhLanding.findMany({ select: CHON_ANH, orderBy: { ngayTao: 'desc' } })).map(anhRaApp));
  }),
);

/** Tải ảnh lên: thân là dữ liệu nhị phân, ?ten= tên file, header X-Kieu-File là kiểu ảnh */
tuyenLanding.post(
  '/landing/anh',
  express.raw({ type: () => true, limit: ANH_TOI_DA }),
  boc(async (req, res) => {
    const duLieu = req.body as Buffer;
    const kieuFile = chuoi(req.headers['x-kieu-file']);
    if (!Buffer.isBuffer(duLieu) || !duLieu.length) throw new LoiApi(400, 'File trống');
    if (!KIEU_ANH.includes(kieuFile)) throw new LoiApi(400, 'Chỉ nhận ảnh JPEG, PNG, WebP, GIF, SVG');
    const a = await prisma.anhLanding.create({
      data: {
        tenFile: chuoi(req.query.ten).slice(0, 200) || 'anh',
        kieuFile,
        kichThuoc: duLieu.length,
        moTa: chuoi(req.query.moTa).slice(0, 300),
        duLieu: new Uint8Array(duLieu),
      },
      select: CHON_ANH,
    });
    res.status(201).json(anhRaApp(a));
  }),
);

tuyenLanding.patch(
  '/landing/anh/:id',
  boc(async (req, res) => {
    await prisma.anhLanding.updateMany({ where: { id: thamSo(req) }, data: { moTa: chuoi(req.body?.moTa).slice(0, 300) } });
    res.status(204).end();
  }),
);

tuyenLanding.delete(
  '/landing/anh/:id',
  boc(async (req, res) => {
    await prisma.anhLanding.deleteMany({ where: { id: thamSo(req) } });
    res.status(204).end();
  }),
);

tuyenLanding.get(
  '/landing/lien-he',
  boc(async (_req, res) => {
    res.json((await prisma.lienHeLanding.findMany({ orderBy: { ngayTao: 'desc' }, take: 500 })).map(lienHeRaApp));
  }),
);

tuyenLanding.patch(
  '/landing/lien-he/:id',
  boc(async (req, res) => {
    const data: Prisma.LienHeLandingUpdateManyMutationInput = {};
    if (req.body?.daXuLy !== undefined) data.daXuLy = Boolean(req.body.daXuLy);
    if (req.body?.ghiChu !== undefined) data.ghiChu = chuoi(req.body.ghiChu);
    await prisma.lienHeLanding.updateMany({ where: { id: thamSo(req) }, data });
    res.status(204).end();
  }),
);

tuyenLanding.delete(
  '/landing/lien-he/:id',
  boc(async (req, res) => {
    await prisma.lienHeLanding.deleteMany({ where: { id: thamSo(req) } });
    res.status(204).end();
  }),
);

tuyenLanding.get('/landing/cai-dat', boc(async (_req, res) => res.json(await layCaiDatLanding())));

tuyenLanding.put(
  '/landing/cai-dat',
  boc(async (req, res) => {
    const duLieu = caiDatLandingVaoDB({ ...(await layCaiDatLanding()), ...(req.body ?? {}) });
    await prisma.caiDatLanding.upsert({ where: { id: 'landing' }, create: { id: 'landing', ...duLieu }, update: duLieu });
    res.json(await layCaiDatLanding());
  }),
);

/* ---------- API công khai (không cần đăng nhập) ---------- */

/** CORS cho trang landing ở tên miền khác */
function choPhepNguon(req: Request, res: Response, next: NextFunction) {
  const nguon = req.headers.origin;
  const dsNguon = MOI_TRUONG.nguonLanding;
  if (nguon && (!dsNguon.length || dsNguon.includes(nguon))) {
    res.setHeader('Access-Control-Allow-Origin', dsNguon.length ? nguon : '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
}

/** Giới hạn gửi form liên hệ: tối đa 5 lần / 10 phút mỗi IP (đơn giản, trong bộ nhớ) */
const lanGui = new Map<string, number[]>();
function quaNhieu(ip: string): boolean {
  const bayGio = Date.now();
  const ds = (lanGui.get(ip) ?? []).filter((t) => bayGio - t < 10 * 60 * 1000);
  ds.push(bayGio);
  lanGui.set(ip, ds);
  if (lanGui.size > 5000) lanGui.clear();
  return ds.length > 5;
}

export const tuyenCongKhai = express.Router();
tuyenCongKhai.use(choPhepNguon);

tuyenCongKhai.get(
  '/trang',
  boc(async (_req, res) => {
    const [cdl, cd, khoi] = await Promise.all([
      layCaiDatLanding(),
      layCaiDat(),
      prisma.khoiLanding.findMany({ where: { hien: true }, orderBy: { thuTu: 'asc' } }),
    ]);
    if (!cdl.xuatBan) throw new LoiApi(503, 'Trang đang được xây dựng');
    const hien = (k: Parameters<typeof dangHien>[1], v: string) => (dangHien(cd, k) ? v : '');
    const trang: TrangCongKhai = {
      seo: {
        tieuDe: cdl.tieuDeTrang || cd.tenDonVi,
        moTa: cdl.moTa,
        tuKhoa: cdl.tuKhoa,
        anhChiaSe: duongDanAnh(cdl.anhChiaSeId),
        maTheoDoi: cdl.maTheoDoi,
      },
      xuong: {
        ten: cd.tenDonVi,
        diaChi: hien('diaChi', cd.diaChi),
        dienThoai: hien('dienThoai', cd.dienThoai),
        email: hien('email', cd.email),
        logo: cd.logo && dangHien(cd, 'logo') ? '/api/cong-khai/logo' : null,
        zalo: cdl.lienKetZalo,
        facebook: cdl.lienKetFacebook,
        banDo: cdl.banDo,
      },
      khoi: khoi.map(khoiRaApp).map(({ anhId, danhSachMuc, hien: _h, thuTu: _t, ngaySua: _n, ...k }) => ({
        ...k,
        anh: duongDanAnh(anhId),
        danhSachMuc: danhSachMuc.map(({ anhId: a, ...m }) => ({ ...m, anh: duongDanAnh(a) })),
      })),
    };
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json(trang);
  }),
);

tuyenCongKhai.get(
  '/anh/:id',
  boc(async (req, res) => {
    const a = await prisma.anhLanding.findUnique({ where: { id: thamSo(req) } });
    if (!a) throw new LoiApi(404, 'Không có ảnh này');
    res.setHeader('Content-Type', a.kieuFile);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    // SVG có thể chứa mã chạy — không cho chạy khi mở thẳng
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
    res.send(Buffer.from(a.duLieu));
  }),
);

/** Logo xưởng (lưu dạng data URL trong Cài đặt) */
tuyenCongKhai.get(
  '/logo',
  boc(async (_req, res) => {
    const cd = await layCaiDat();
    const m = /^data:([^;]+);base64,(.*)$/.exec(cd.logo);
    if (!m || !dangHien(cd, 'logo')) throw new LoiApi(404, 'Chưa có logo');
    res.setHeader('Content-Type', m[1]);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(m[2], 'base64'));
  }),
);

tuyenCongKhai.post(
  '/lien-he',
  express.json({ limit: '20kb' }),
  boc(async (req, res) => {
    const b = req.body ?? {};
    // Ô bẫy: người thật không thấy ô "website" nên để trống; máy tự điền thì bỏ qua (vẫn trả về thành công)
    if (chuoi(b.website)) return res.status(201).json({ ok: true });
    const hoTen = chuoi(b.hoTen).trim().slice(0, 120);
    const soDienThoai = chuoi(b.soDienThoai).trim().slice(0, 30);
    const email = chuoi(b.email).trim().slice(0, 120);
    if (!hoTen || (!soDienThoai && !email)) throw new LoiApi(400, 'Vui lòng nhập họ tên và số điện thoại hoặc email');
    if (quaNhieu(req.ip ?? '')) throw new LoiApi(429, 'Bạn gửi quá nhiều lần, vui lòng thử lại sau');
    await prisma.lienHeLanding.create({
      data: { hoTen, soDienThoai, email, noiDung: chuoi(b.noiDung).slice(0, 3000), ip: (req.ip ?? '').slice(0, 60) },
    });
    res.status(201).json({ ok: true });
  }),
);
