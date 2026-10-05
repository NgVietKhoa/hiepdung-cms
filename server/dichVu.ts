/** Nghiệp vụ phía máy chủ: đọc/ghi CSDL bằng Prisma. */
import { Prisma } from './generated/prisma/client';
import type {
  AnhDinhKem,
  BaoGia,
  BienBanNghiemThu,
  CaiDat,
  CotHangMuc,
  HangMuc,
  KhachHang,
  TomTatBaoGia,
  TomTatNghiemThu,
} from '../src/db/kieu';
import { taoDuLieuMau, type DuLieuMau } from '../src/db/duLieuMau';
import { chuanHoaDsCot } from '../src/lib/cotHangMuc';
import { namCua } from '../src/lib/dinhDang';
import { laBaoGiaRong, laNghiemThuRong } from '../src/lib/nghiepVu';
import { soKeTiep } from '../src/lib/soChungTu';
import {
  CHON_TOM_TAT_BAO_GIA,
  CHON_TOM_TAT_NGHIEM_THU,
  KEM_BAO_GIA,
  KEM_NGHIEM_THU,
  anhRaApp,
  baoGiaRaApp,
  baoGiaVaoDB,
  caiDatRaApp,
  caiDatVaoDB,
  chuoi,
  cotRaApp,
  cotVaoDB,
  dongBaoGiaVaoDB,
  dongNghiemThuVaoDB,
  hangMucRaApp,
  hangMucVaoDB,
  khachHangRaApp,
  khachHangVaoDB,
  nghiemThuRaApp,
  nghiemThuVaoDB,
  tomTatBaoGiaRaApp,
  tomTatNghiemThuRaApp,
} from './anhXa';
import { prisma } from './prisma';

type Tx = Prisma.TransactionClient;

export class LoiApi extends Error {
  constructor(
    public trangThai: number,
    message: string,
  ) {
    super(message);
  }
}

const laTrungKhoa = (e: unknown): e is Prisma.PrismaClientKnownRequestError =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

/**
 * Trùng đúng cột số chứng từ — không phải trùng khoá khác (vd. id dòng hạng mục).
 * Adapter pg ghi tên ràng buộc trong meta ("bao_gia_so_bao_gia_key"); engine cũ ghi tên trường ở meta.target.
 */
const laTrungSo = (e: unknown, cot: { db: string; truong: string }) => {
  if (!laTrungKhoa(e)) return false;
  const meta = JSON.stringify(e.meta ?? {});
  return meta.includes(`${cot.db}_key`) || meta.includes(`"${cot.truong}"`);
};
const COT_SO = {
  baoGia: { db: 'so_bao_gia', truong: 'soBaoGia' },
  nghiemThu: { db: 'so_bien_ban', truong: 'soBienBan' },
} as const;

/**
 * Xếp hàng các lần ghi CÙNG một chứng từ (lưu tự động dồn dập, hai máy cùng sửa): lần sau chờ lần trước xong.
 * Không có khoá này, hai giao dịch cùng xoá rồi tạo lại các dòng → trùng id dòng hoặc bản cũ ghi đè bản mới.
 * Khoá hai số (loại, hash id) không đụng khoá cấp số một số bên dưới; tự nhả khi giao dịch kết thúc.
 */
const KHOA_CHUNG_TU = { baoGia: 1, nghiemThu: 2 } as const;
const khoaChungTu = (tx: Tx, loai: keyof typeof KHOA_CHUNG_TU, id: string) =>
  tx.$executeRaw`SELECT pg_advisory_xact_lock(${KHOA_CHUNG_TU[loai]}::int, hashtext(${id}::text))`;

/* ---------- Cài đặt ---------- */

export async function layCaiDat(tx: Tx = prisma): Promise<CaiDat> {
  return caiDatRaApp(await tx.caiDat.findUnique({ where: { id: 'caiDat' } }));
}

export async function luuCaiDat(thayDoi: Partial<CaiDat>): Promise<CaiDat> {
  const duLieu = caiDatVaoDB({ ...(await layCaiDat()), ...thayDoi });
  return caiDatRaApp(
    await prisma.caiDat.upsert({ where: { id: 'caiDat' }, create: { id: 'caiDat', ...duLieu }, update: duLieu }),
  );
}

/* ---------- Khách hàng ---------- */

export async function dsKhachHang(): Promise<KhachHang[]> {
  return (await prisma.khachHang.findMany({ orderBy: { tenCongTy: 'asc' } })).map(khachHangRaApp);
}

export async function luuKhachHang(id: string, k: Partial<KhachHang>): Promise<KhachHang> {
  const duLieu = khachHangVaoDB(k);
  if (!duLieu.tenCongTy) throw new LoiApi(400, 'Thiếu tên khách hàng');
  return khachHangRaApp(await prisma.khachHang.upsert({ where: { id }, create: { id, ...duLieu }, update: duLieu }));
}

export async function xoaKhachHang(id: string): Promise<void> {
  // Báo giá / biên bản của khách được giữ lại, khoá ngoại tự đặt khach_hang_id = NULL
  await prisma.khachHang.deleteMany({ where: { id } });
}

export async function demBaoGiaCuaKhach(khachHangId: string): Promise<number> {
  return prisma.baoGia.count({ where: { khachHangId } });
}

/* ---------- Danh mục hạng mục ---------- */

export async function dsHangMuc(): Promise<HangMuc[]> {
  return (await prisma.hangMuc.findMany({ orderBy: { ten: 'asc' } })).map(hangMucRaApp);
}

export async function luuHangMuc(id: string, h: Partial<HangMuc>): Promise<HangMuc> {
  const duLieu = hangMucVaoDB(h);
  if (!duLieu.ten) throw new LoiApi(400, 'Thiếu tên hạng mục');
  return hangMucRaApp(await prisma.hangMuc.upsert({ where: { id }, create: { id, ...duLieu }, update: duLieu }));
}

export async function xoaHangMuc(id: string): Promise<void> {
  await prisma.hangMuc.deleteMany({ where: { id } });
}

/* ---------- Cột bảng hạng mục ---------- */

export async function dsCotHangMuc(tx: Tx = prisma): Promise<CotHangMuc[]> {
  return (await tx.cotHangMuc.findMany({ orderBy: { thuTu: 'asc' } })).map(cotRaApp);
}

/**
 * Ghi cả danh sách cột theo đúng thứ tự gửi lên (từ Cài đặt).
 * Cột tự thêm không còn trong danh sách thì xoá; cột gắn trường có sẵn thì không bao giờ xoá,
 * và trường mà cột gắn vào chỉ do dữ liệu ban đầu (seed) đặt — không đổi được qua API.
 */
export async function luuDsCotHangMuc(duLieu: unknown, tx?: Tx): Promise<CotHangMuc[]> {
  const ds = chuanHoaDsCot(duLieu);
  const ghi = async (t: Tx) => {
    const hienCo = new Map((await t.cotHangMuc.findMany()).map((c) => [c.id, c]));
    const conGiu = new Set(ds.map((c) => c.id));
    await t.cotHangMuc.deleteMany({ where: { truong: null, id: { notIn: [...conGiu] } } });
    let thuTu = 0;
    for (const c of ds) {
      const cu = hienCo.get(c.id);
      const ban = { ...cotVaoDB(c), truong: cu ? cu.truong : null, thuTu: thuTu++ };
      if (cu) await t.cotHangMuc.update({ where: { id: c.id }, data: ban });
      else await t.cotHangMuc.create({ data: { id: c.id, ...ban } });
    }
    // Cột gắn trường mà danh sách gửi lên bỏ sót: giữ lại, xếp xuống cuối
    for (const cu of hienCo.values()) {
      if (cu.truong && !conGiu.has(cu.id)) await t.cotHangMuc.update({ where: { id: cu.id }, data: { thuTu: thuTu++ } });
    }
    return dsCotHangMuc(t);
  };
  return tx ? ghi(tx) : prisma.$transaction(ghi);
}

/* ---------- Số chứng từ ---------- */

/** Mã khoá advisory của Postgres: mỗi loại chứng từ một khoá */
const KHOA_CAP_SO = { baoGia: 73_001, nghiemThu: 73_002 } as const;

async function capSo(tx: Tx, loai: 'baoGia' | 'nghiemThu', ngay: Date): Promise<string> {
  // Xếp hàng các giao dịch cùng cấp số (hai máy tạo cùng lúc) — khoá tự nhả khi giao dịch kết thúc
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${KHOA_CAP_SO[loai]})`;
  const cd = await layCaiDat(tx);
  const nam = namCua(ngay.toISOString().slice(0, 10));
  if (loai === 'baoGia') {
    const dau = `${cd.tienToBaoGia}-${nam}-`;
    const ds = await tx.baoGia.findMany({ where: { soBaoGia: { startsWith: dau } }, select: { soBaoGia: true } });
    return soKeTiep(ds.map((x) => x.soBaoGia), cd.tienToBaoGia, nam, cd.soChuSo);
  }
  const dau = `${cd.tienToNghiemThu}-${nam}-`;
  const ds = await tx.nghiemThu.findMany({ where: { soBienBan: { startsWith: dau } }, select: { soBienBan: true } });
  return soKeTiep(ds.map((x) => x.soBienBan), cd.tienToNghiemThu, nam, cd.soChuSo);
}

/**
 * Chạy `lam` với số chứng từ; nếu số do máy chủ tự cấp mà bị trùng (hai máy tạo cùng lúc)
 * thì thử lại với số mới. Số do người dùng tự gõ mà trùng thì báo lỗi.
 */
async function voiSoChungTu<T>(
  loai: keyof typeof COT_SO,
  soGui: string,
  lam: (tuCap: boolean) => Promise<T>,
): Promise<T> {
  const tuCap = !soGui.trim();
  for (let lan = 0; ; lan++) {
    try {
      return await lam(tuCap);
    } catch (e) {
      if (!laTrungSo(e, COT_SO[loai])) throw e;
      if (!tuCap) throw new LoiApi(409, `Số chứng từ "${soGui}" đã được dùng. Vui lòng đổi số khác.`);
      if (lan >= 4) throw new LoiApi(409, 'Không cấp được số chứng từ, vui lòng thử lại.');
    }
  }
}

const idHopLe = async (tx: Tx, bang: 'khachHang' | 'baoGia', id: unknown): Promise<string | null> => {
  const s = chuoi(id);
  if (!s) return null;
  const co =
    bang === 'khachHang'
      ? await tx.khachHang.findUnique({ where: { id: s }, select: { id: true } })
      : await tx.baoGia.findUnique({ where: { id: s }, select: { id: true } });
  return co ? s : null;
};

/* ---------- Báo giá ---------- */

/** Danh sách báo giá kèm tổng tiền tính sẵn — không tải các dòng hạng mục về trình duyệt */
export async function dsTomTatBaoGia(): Promise<TomTatBaoGia[]> {
  return (await prisma.baoGia.findMany({ select: CHON_TOM_TAT_BAO_GIA, orderBy: { ngaySua: 'desc' } })).map(
    tomTatBaoGiaRaApp,
  );
}

export async function layBaoGia(id: string): Promise<BaoGia | null> {
  const b = await prisma.baoGia.findUnique({ where: { id }, include: KEM_BAO_GIA });
  return b ? baoGiaRaApp(b) : null;
}

/**
 * Ghi cả báo giá (kèm toàn bộ dòng). Chưa có thì tạo mới; số để trống thì tự cấp.
 * `chiCapNhat`: chỉ ghi khi bản ghi còn tồn tại (dùng khi khôi phục bản nháp tạm).
 */
export async function luuBaoGia(b: BaoGia, chiCapNhat = false): Promise<BaoGia | null> {
  const id = chuoi(b.id);
  if (!id) throw new LoiApi(400, 'Thiếu mã báo giá');
  return voiSoChungTu('baoGia', chuoi(b.soBaoGia), (tuCap) =>
    prisma.$transaction(async (tx) => {
      await khoaChungTu(tx, 'baoGia', id);
      const ton = await tx.baoGia.findUnique({ where: { id }, select: { soBaoGia: true } });
      if (!ton && chiCapNhat) return null;
      const cot = baoGiaVaoDB(b);
      const soBaoGia = tuCap ? (ton?.soBaoGia ?? (await capSo(tx, 'baoGia', cot.ngayLap))) : chuoi(b.soBaoGia).trim();
      const khachHangId = await idHopLe(tx, 'khachHang', b.khachHangId);
      const dong = { create: dongBaoGiaVaoDB(b.danhSachDong) };
      if (ton) await tx.dongBaoGia.deleteMany({ where: { baoGiaId: id } });
      const kq = ton
        ? await tx.baoGia.update({ where: { id }, data: { ...cot, soBaoGia, khachHangId, danhSachDong: dong }, include: KEM_BAO_GIA })
        : await tx.baoGia.create({ data: { id, ...cot, soBaoGia, khachHangId, danhSachDong: dong }, include: KEM_BAO_GIA });
      return baoGiaRaApp(kq);
    }),
  );
}

export async function xoaBaoGia(id: string): Promise<void> {
  // Biên bản đã lập từ báo giá này được giữ lại, khoá ngoại tự đặt bao_gia_id = NULL
  await prisma.baoGia.deleteMany({ where: { id } });
}

/* ---------- Nghiệm thu ---------- */

export async function dsTomTatNghiemThu(baoGiaId?: string): Promise<TomTatNghiemThu[]> {
  return (
    await prisma.nghiemThu.findMany({
      where: baoGiaId ? { baoGiaId } : undefined,
      select: CHON_TOM_TAT_NGHIEM_THU,
      orderBy: { ngaySua: 'desc' },
    })
  ).map(tomTatNghiemThuRaApp);
}

export async function layNghiemThu(id: string): Promise<BienBanNghiemThu | null> {
  const n = await prisma.nghiemThu.findUnique({ where: { id }, include: KEM_NGHIEM_THU });
  return n ? nghiemThuRaApp(n) : null;
}

export async function luuNghiemThu(n: BienBanNghiemThu, chiCapNhat = false): Promise<BienBanNghiemThu | null> {
  const id = chuoi(n.id);
  if (!id) throw new LoiApi(400, 'Thiếu mã biên bản');
  return voiSoChungTu('nghiemThu', chuoi(n.soBienBan), (tuCap) =>
    prisma.$transaction(async (tx) => {
      await khoaChungTu(tx, 'nghiemThu', id);
      const ton = await tx.nghiemThu.findUnique({ where: { id }, select: { soBienBan: true } });
      if (!ton && chiCapNhat) return null;
      const cot = nghiemThuVaoDB(n);
      const soBienBan = tuCap
        ? (ton?.soBienBan ?? (await capSo(tx, 'nghiemThu', cot.ngayNghiemThu)))
        : chuoi(n.soBienBan).trim();
      const lienKet = {
        khachHangId: await idHopLe(tx, 'khachHang', n.khachHangId),
        baoGiaId: await idHopLe(tx, 'baoGia', n.baoGiaId),
      };
      const dong = { create: dongNghiemThuVaoDB(n.danhSachDong) };
      if (ton) await tx.dongNghiemThu.deleteMany({ where: { nghiemThuId: id } });
      const kq = ton
        ? await tx.nghiemThu.update({ where: { id }, data: { ...cot, ...lienKet, soBienBan, danhSachDong: dong }, include: KEM_NGHIEM_THU })
        : await tx.nghiemThu.create({ data: { id, ...cot, ...lienKet, soBienBan, danhSachDong: dong }, include: KEM_NGHIEM_THU });
      return nghiemThuRaApp(kq);
    }),
  );
}

export async function xoaNghiemThu(id: string): Promise<void> {
  // Ảnh và dòng hạng mục tự xoá theo (onDelete: Cascade)
  await prisma.nghiemThu.deleteMany({ where: { id } });
}

/* ---------- Ảnh nghiệm thu ---------- */

const TOI_DA_ANH = 8 * 1024 * 1024;

export async function dsAnh(nghiemThuId: string): Promise<AnhDinhKem[]> {
  return (await prisma.anhNghiemThu.findMany({ where: { nghiemThuId }, orderBy: { thuTu: 'asc' } })).map(anhRaApp);
}

export async function themAnh(nghiemThuId: string, duLieu: unknown, ghiChu: unknown): Promise<AnhDinhKem> {
  const anh = chuoi(duLieu);
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(anh)) throw new LoiApi(400, 'Ảnh không hợp lệ');
  if (anh.length > TOI_DA_ANH) throw new LoiApi(413, 'Ảnh quá lớn');
  if (!(await prisma.nghiemThu.findUnique({ where: { id: nghiemThuId }, select: { id: true } }))) {
    throw new LoiApi(404, 'Không tìm thấy biên bản');
  }
  const cuoi = await prisma.anhNghiemThu.aggregate({ where: { nghiemThuId }, _max: { thuTu: true } });
  return anhRaApp(
    await prisma.anhNghiemThu.create({
      data: { nghiemThuId, duLieu: anh, ghiChu: chuoi(ghiChu), thuTu: (cuoi._max.thuTu ?? 0) + 1 },
    }),
  );
}

export async function suaGhiChuAnh(id: string, ghiChu: unknown): Promise<void> {
  await prisma.anhNghiemThu.updateMany({ where: { id }, data: { ghiChu: chuoi(ghiChu) } });
}

export async function xoaAnh(id: string): Promise<void> {
  await prisma.anhNghiemThu.deleteMany({ where: { id } });
}

/* ---------- Dọn nháp trống ---------- */

/** Xoá báo giá / biên bản trống đã tạo quá 10 phút (tạo ra rồi đóng tab, chưa nhập gì). */
export async function donNhapRong(): Promise<number> {
  const truoc = new Date(Date.now() - 10 * 60 * 1000);
  const bg = (
    await prisma.baoGia.findMany({ where: { trangThai: 'nhap', khachHangId: null, ngaySua: { lt: truoc } }, include: KEM_BAO_GIA })
  )
    .map(baoGiaRaApp)
    .filter(laBaoGiaRong);
  const nt = (
    await prisma.nghiemThu.findMany({
      where: { trangThai: 'nhap', khachHangId: null, baoGiaId: null, ngaySua: { lt: truoc } },
      include: KEM_NGHIEM_THU,
    })
  )
    .map(nghiemThuRaApp)
    .filter(laNghiemThuRong);
  await prisma.baoGia.deleteMany({ where: { id: { in: bg.map((b) => b.id) } } });
  await prisma.nghiemThu.deleteMany({ where: { id: { in: nt.map((n) => n.id) } } });
  return bg.length + nt.length;
}

/* ---------- Ghi hàng loạt (dữ liệu mẫu, khôi phục) ---------- */

interface DuLieuDayDu extends DuLieuMau {
  anhNghiemThu: AnhDinhKem[];
}

/**
 * Ghi một bộ dữ liệu vào CSDL trong giao dịch `tx`.
 * `capSoMoi`: bỏ số chứng từ có sẵn, cấp số mới (dùng khi nạp dữ liệu mẫu vào DB đã có dữ liệu).
 */
async function ghiBoDuLieu(tx: Tx, d: DuLieuDayDu, capSoMoi: boolean): Promise<void> {
  const khIds = new Set(d.khachHang.map((k) => k.id));
  const bgIds = new Set(d.baoGia.map((b) => b.id));
  const ntIds = new Set(d.nghiemThu.map((n) => n.id));

  if (d.khachHang.length) {
    await tx.khachHang.createMany({
      data: d.khachHang.map((k) => ({ id: k.id, ...khachHangVaoDB(k), ngayTao: new Date(k.ngayTao || Date.now()) })),
    });
  }
  if (d.hangMuc.length) {
    await tx.hangMuc.createMany({ data: d.hangMuc.map((h) => ({ id: h.id, ...hangMucVaoDB(h) })) });
  }
  // Báo giá cũ trước, mới sau → số tự cấp tăng theo thời gian
  for (const b of [...d.baoGia].sort((x, y) => x.ngayLap.localeCompare(y.ngayLap))) {
    const cot = baoGiaVaoDB(b);
    await tx.baoGia.create({
      data: {
        id: b.id,
        ...cot,
        soBaoGia: capSoMoi || !b.soBaoGia ? await capSo(tx, 'baoGia', cot.ngayLap) : b.soBaoGia,
        khachHangId: b.khachHangId && khIds.has(b.khachHangId) ? b.khachHangId : null,
        ngayTao: new Date(b.ngayTao || Date.now()),
        danhSachDong: { create: dongBaoGiaVaoDB(b.danhSachDong) },
      },
    });
  }
  for (const n of [...d.nghiemThu].sort((x, y) => x.ngayNghiemThu.localeCompare(y.ngayNghiemThu))) {
    const cot = nghiemThuVaoDB(n);
    await tx.nghiemThu.create({
      data: {
        id: n.id,
        ...cot,
        soBienBan: capSoMoi || !n.soBienBan ? await capSo(tx, 'nghiemThu', cot.ngayNghiemThu) : n.soBienBan,
        khachHangId: n.khachHangId && khIds.has(n.khachHangId) ? n.khachHangId : null,
        baoGiaId: n.baoGiaId && bgIds.has(n.baoGiaId) ? n.baoGiaId : null,
        ngayTao: new Date(n.ngayTao || Date.now()),
        danhSachDong: { create: dongNghiemThuVaoDB(n.danhSachDong) },
      },
    });
  }
  const anh = d.anhNghiemThu.filter((a) => ntIds.has(a.nghiemThuId));
  for (let i = 0; i < anh.length; i += 20) {
    await tx.anhNghiemThu.createMany({
      data: anh.slice(i, i + 20).map((a) => ({
        id: a.id,
        nghiemThuId: a.nghiemThuId,
        duLieu: chuoi(a.duLieu),
        ghiChu: chuoi(a.ghiChu),
        thuTu: Number(a.thuTu) || 0,
      })),
    });
  }
}

const GIAO_DICH_DAI = { timeout: 5 * 60 * 1000, maxWait: 30 * 1000 };

async function xoaHetTrong(tx: Tx): Promise<void> {
  // Thứ tự theo khoá ngoại
  await tx.anhNghiemThu.deleteMany();
  await tx.dongNghiemThu.deleteMany();
  await tx.nghiemThu.deleteMany();
  await tx.dongBaoGia.deleteMany();
  await tx.baoGia.deleteMany();
  await tx.hangMuc.deleteMany();
  await tx.khachHang.deleteMany();
}

export async function napDuLieuMau(): Promise<void> {
  const mau = taoDuLieuMau(await layCaiDat());
  await prisma.$transaction((tx) => ghiBoDuLieu(tx, { ...mau, anhNghiemThu: [] }, true), GIAO_DICH_DAI);
}

export async function xoaToanBo(): Promise<void> {
  await prisma.$transaction(xoaHetTrong, GIAO_DICH_DAI);
}

/** Cài đặt, cột bảng hạng mục, tài khoản quản trị và dữ liệu mẫu lần đầu do seed tạo (prisma/seed.ts) — máy chủ chỉ nhắc nếu chưa chạy. */
export async function kiemTraDuLieuBanDau(): Promise<void> {
  const [caiDat, soCot, soTaiKhoan] = await Promise.all([
    prisma.caiDat.findUnique({ where: { id: 'caiDat' }, select: { id: true } }),
    prisma.cotHangMuc.count(),
    prisma.nguoiDung.count(),
  ]);
  if (!caiDat || !soCot || !soTaiKhoan) {
    console.warn('⚠ Chưa có dữ liệu ban đầu (cài đặt, cột bảng hạng mục, tài khoản quản trị) — hãy chạy: npm run db:seed');
  }
}

/* ---------- Sao lưu / khôi phục (định dạng tương thích bản lưu trên trình duyệt cũ) ---------- */

const MA_UNG_DUNG = 'hiep-dung-cms';
/** File sao lưu từ bản Báo giá nhanh cũ vẫn khôi phục được */
const MA_UNG_DUNG_CU = ['bao-gia-nhanh'];

/** Số ảnh đọc từ DB mỗi lượt khi ghi file sao lưu (mỗi ảnh ~100–300 KB) */
const ANH_MOI_LUOT = 20;

/**
 * Ghi file sao lưu (JSON) từng phần qua `ghi`: dữ liệu chữ ghi một lần, ảnh đọc và ghi theo từng lượt
 * nên máy chủ không phải giữ toàn bộ ảnh trong bộ nhớ.
 */
export async function ghiSaoLuu(ghi: (phan: string) => Promise<void>): Promise<void> {
  const [caiDat, cotHangMuc, khachHang, hangMuc, baoGia, nghiemThu] = await Promise.all([
    layCaiDat(),
    dsCotHangMuc(),
    prisma.khachHang.findMany(),
    prisma.hangMuc.findMany(),
    prisma.baoGia.findMany({ include: KEM_BAO_GIA }),
    prisma.nghiemThu.findMany({ include: KEM_NGHIEM_THU }),
  ]);
  const phanChu = JSON.stringify({
    ungDung: MA_UNG_DUNG,
    phienBan: 2,
    thoiDiem: new Date().toISOString(),
    caiDat: [caiDat],
    cotHangMuc,
    khachHang: khachHang.map(khachHangRaApp),
    hangMuc: hangMuc.map(hangMucRaApp),
    baoGia: baoGia.map(baoGiaRaApp),
    nghiemThu: nghiemThu.map(nghiemThuRaApp),
  });
  // Bỏ "}" cuối để nối tiếp mảng ảnh
  await ghi(`${phanChu.slice(0, -1)},"anhNghiemThu":[`);
  let sauId: string | undefined;
  let dau = true;
  for (;;) {
    const luot = await prisma.anhNghiemThu.findMany({
      take: ANH_MOI_LUOT,
      orderBy: { id: 'asc' },
      ...(sauId ? { cursor: { id: sauId }, skip: 1 } : {}),
    });
    if (!luot.length) break;
    for (const a of luot) {
      await ghi((dau ? '' : ',') + JSON.stringify(anhRaApp(a)));
      dau = false;
    }
    sauId = luot[luot.length - 1].id;
  }
  await ghi(']}');
}

/** Trình duyệt đã nhận đủ file sao lưu → ghi nhận thời điểm (để nhắc sao lưu định kỳ) */
export async function ghiNhanDaSaoLuu(): Promise<void> {
  await prisma.caiDat.updateMany({ where: { id: 'caiDat' }, data: { lanSaoLuuCuoi: new Date() } });
}

export async function khoiPhuc(duLieu: any): Promise<{ soBaoGia: number; soNghiemThu: number }> {
  if (duLieu?.ungDung !== MA_UNG_DUNG && !MA_UNG_DUNG_CU.includes(duLieu?.ungDung)) {
    throw new LoiApi(400, 'Đây không phải file sao lưu của ứng dụng (Báo giá nhanh / CMS xưởng).');
  }
  const mang = <T>(x: unknown) => (Array.isArray(x) ? (x as T[]) : []);
  const bo: DuLieuDayDu = {
    khachHang: mang<KhachHang>(duLieu.khachHang),
    hangMuc: mang<HangMuc>(duLieu.hangMuc),
    baoGia: mang<BaoGia>(duLieu.baoGia),
    nghiemThu: mang<BienBanNghiemThu>(duLieu.nghiemThu),
    anhNghiemThu: mang<AnhDinhKem>(duLieu.anhNghiemThu),
  };
  const caiDat = mang<CaiDat>(duLieu.caiDat)[0];
  await prisma.$transaction(async (tx) => {
    await xoaHetTrong(tx);
    if (caiDat) {
      const cot = caiDatVaoDB(caiDat);
      await tx.caiDat.upsert({ where: { id: 'caiDat' }, create: { id: 'caiDat', ...cot }, update: cot });
    }
    // File sao lưu cũ chưa có cột bảng hạng mục thì giữ nguyên cột đang có
    if (Array.isArray(duLieu.cotHangMuc)) await luuDsCotHangMuc(duLieu.cotHangMuc, tx);
    await ghiBoDuLieu(tx, bo, false);
  }, GIAO_DICH_DAI);
  return { soBaoGia: bo.baoGia.length, soNghiemThu: bo.nghiemThu.length };
}
