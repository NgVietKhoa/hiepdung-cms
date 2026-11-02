/** Vật tư, phiếu nhập / xuất kho, tồn kho, thẻ kho. Tồn kho không lưu mà luôn tính từ các phiếu. */
import express from 'express';
import { Prisma } from '../generated/prisma/client';
import type { DongTheKho, PhieuKho, TomTatPhieuKho, VatTu, VatTuTon } from '../../src/modules/kho/kieu';
import { tongPhieuKho } from '../../src/modules/kho/kieu';
import { dinhDangSoLuong } from '../../src/lib/dinhDang';
import { homNayISO } from '../../src/lib/dinhDang';
import { chuoi, chuoiRaNgay, ngayRaChuoi, so, soLuong, tien, trongDanhSach } from '../anhXa';
import { layCaiDat } from '../dichVu';
import { prisma } from '../prisma';
import { baoTrungSo, boc, capSoPhieu, KHOA_CAP_SO, khoangNgay, LoiApi, thamSo, traVe, type Tx } from '../tienIch';

const vatTuRaApp = (v: Prisma.VatTuGetPayload<object>): VatTu => ({
  id: v.id,
  maVatTu: v.maVatTu,
  ten: v.ten,
  donViTinh: v.donViTinh,
  nhom: v.nhom,
  quyCach: v.quyCach,
  tonToiThieu: so(v.tonToiThieu),
  ghiChu: v.ghiChu,
  ngungDung: v.ngungDung,
});
const vatTuVaoDB = (v: Partial<VatTu>) => ({
  maVatTu: chuoi(v.maVatTu).trim(),
  ten: chuoi(v.ten).trim(),
  donViTinh: chuoi(v.donViTinh).trim(),
  nhom: chuoi(v.nhom).trim(),
  quyCach: chuoi(v.quyCach),
  tonToiThieu: soLuong(v.tonToiThieu),
  ghiChu: chuoi(v.ghiChu),
  ngungDung: Boolean(v.ngungDung),
});

/** Tồn kho của các vật tư (hoặc chỉ `ids`): nhập cộng, xuất trừ */
async function tonTheoVatTu(tx: Tx = prisma, ids?: string[]): Promise<Map<string, number>> {
  const loc = ids ? Prisma.sql`WHERE d.vat_tu_id IN (${Prisma.join(ids)})` : Prisma.empty;
  const dong = await tx.$queryRaw<{ vat_tu_id: string; ton: Prisma.Decimal }[]>`
    SELECT d.vat_tu_id, SUM(CASE WHEN p.loai = 'nhap' THEN d.so_luong ELSE -d.so_luong END) AS ton
    FROM dong_phieu_kho d JOIN phieu_kho p ON p.id = d.phieu_kho_id
    ${loc}
    GROUP BY d.vat_tu_id`;
  return new Map(dong.map((d) => [d.vat_tu_id, so(d.ton)]));
}

/** Đơn giá lần nhập gần nhất của từng vật tư */
async function giaNhapGanNhat(): Promise<Map<string, number>> {
  const dong = await prisma.$queryRaw<{ vat_tu_id: string; don_gia: Prisma.Decimal }[]>`
    SELECT DISTINCT ON (d.vat_tu_id) d.vat_tu_id, d.don_gia
    FROM dong_phieu_kho d JOIN phieu_kho p ON p.id = d.phieu_kho_id
    WHERE p.loai = 'nhap' AND d.don_gia > 0
    ORDER BY d.vat_tu_id, p.ngay DESC, p.ngay_tao DESC`;
  return new Map(dong.map((d) => [d.vat_tu_id, so(d.don_gia)]));
}

export async function dsVatTuTon(): Promise<VatTuTon[]> {
  const [ds, ton, gia] = await Promise.all([
    prisma.vatTu.findMany({ orderBy: [{ nhom: 'asc' }, { ten: 'asc' }] }),
    tonTheoVatTu(),
    giaNhapGanNhat(),
  ]);
  return ds.map((v) => ({ ...vatTuRaApp(v), tonKho: ton.get(v.id) ?? 0, giaNhapGanNhat: gia.get(v.id) ?? 0 }));
}

/* ---------- Phiếu kho ---------- */

const KEM_PHIEU = { danhSachDong: { orderBy: { stt: 'asc' } } } satisfies Prisma.PhieuKhoInclude;

const phieuKhoRaApp = (p: Prisma.PhieuKhoGetPayload<{ include: typeof KEM_PHIEU }>): PhieuKho => ({
  id: p.id,
  loai: p.loai,
  soPhieu: p.soPhieu,
  ngay: ngayRaChuoi(p.ngay),
  nhaCungCapId: p.nhaCungCapId,
  hoaDonId: p.hoaDonId,
  baoGiaId: p.baoGiaId,
  nguoiGiaoNhan: p.nguoiGiaoNhan,
  ghiChu: p.ghiChu,
  nguoiLap: p.nguoiLap,
  danhSachDong: p.danhSachDong.map((d) => ({
    id: d.id,
    vatTuId: d.vatTuId,
    soLuong: so(d.soLuong),
    donGia: so(d.donGia),
    ghiChu: d.ghiChu,
  })),
  ngayTao: p.ngayTao.getTime(),
  ngaySua: p.ngaySua.getTime(),
});

/* ---------- Tuyến ---------- */

export const tuyenKho = express.Router();
tuyenKho.get('/vat-tu', boc(async (_req, res) => res.json(await dsVatTuTon())));

tuyenKho.put(
  '/vat-tu/:id',
  boc(async (req, res) => {
    const id = thamSo(req);
    const duLieu = vatTuVaoDB(req.body ?? {});
    if (!duLieu.ten) throw new LoiApi(400, 'Thiếu tên vật tư');
    res.json(vatTuRaApp(await prisma.vatTu.upsert({ where: { id }, create: { id, ...duLieu }, update: duLieu })));
  }),
);

tuyenKho.delete(
  '/vat-tu/:id',
  boc(async (req, res) => {
    const id = thamSo(req);
    if (await prisma.dongPhieuKho.count({ where: { vatTuId: id } })) {
      throw new LoiApi(400, 'Vật tư đã có phiếu nhập / xuất — hãy đánh dấu "Ngừng dùng" thay vì xoá');
    }
    await prisma.vatTu.deleteMany({ where: { id } });
    res.status(204).end();
  }),
);

tuyenKho.get(
  '/vat-tu/:id/the-kho',
  boc(async (req, res) => {
    const vatTuId = thamSo(req);
    const dong = await prisma.dongPhieuKho.findMany({
      where: { vatTuId },
      include: { phieuKho: { include: { nhaCungCap: { select: { tenCongTy: true } }, baoGia: { select: { soBaoGia: true } } } } },
    });
    dong.sort((a, b) => a.phieuKho.ngay.getTime() - b.phieuKho.ngay.getTime() || a.phieuKho.ngayTao.getTime() - b.phieuKho.ngayTao.getTime());
    let ton = 0;
    const the: DongTheKho[] = dong.map((d) => {
      const p = d.phieuKho;
      const sl = so(d.soLuong);
      ton += p.loai === 'nhap' ? sl : -sl;
      return {
        phieuKhoId: p.id,
        soPhieu: p.soPhieu,
        loai: p.loai,
        ngay: ngayRaChuoi(p.ngay),
        soLuong: sl,
        donGia: so(d.donGia),
        tonSau: Math.round(ton * 1000) / 1000,
        dienGiai: [p.nhaCungCap?.tenCongTy, p.baoGia ? `Báo giá ${p.baoGia.soBaoGia}` : '', p.nguoiGiaoNhan, d.ghiChu || p.ghiChu]
          .filter(Boolean)
          .join(' · '),
      };
    });
    res.json(the.reverse());
  }),
);

/** ?thang= hoặc ?tu=&den=, ?loai=nhap|xuat */
tuyenKho.get(
  '/phieu-kho',
  boc(async (req, res) => {
    const { tu, den } = khoangNgay(req.query);
    const loai = req.query.loai === 'nhap' || req.query.loai === 'xuat' ? req.query.loai : undefined;
    const ds = await prisma.phieuKho.findMany({
      where: { ngay: { gte: tu, lt: den }, ...(loai ? { loai } : {}) },
      include: { ...KEM_PHIEU, nhaCungCap: { select: { tenCongTy: true } }, baoGia: { select: { soBaoGia: true } } },
      orderBy: [{ ngay: 'desc' }, { soPhieu: 'desc' }],
    });
    res.json(
      ds.map<TomTatPhieuKho>((p) => {
        const app = phieuKhoRaApp(p);
        return {
          id: p.id,
          loai: p.loai,
          soPhieu: p.soPhieu,
          ngay: app.ngay,
          doiTuong: p.nhaCungCap?.tenCongTy ?? (p.baoGia ? `Báo giá ${p.baoGia.soBaoGia}` : ''),
          nguoiGiaoNhan: p.nguoiGiaoNhan,
          soDong: p.danhSachDong.length,
          tongTien: tongPhieuKho(app),
          ghiChu: p.ghiChu,
        };
      }),
    );
  }),
);

tuyenKho.get(
  '/phieu-kho/:id',
  boc(async (req, res) => {
    const p = await prisma.phieuKho.findUnique({ where: { id: thamSo(req) }, include: KEM_PHIEU });
    traVe(res, p && phieuKhoRaApp(p), 'Không tìm thấy phiếu kho');
  }),
);

/** Ghi cả phiếu kèm các dòng; xuất vượt tồn thì báo lỗi và không ghi gì */
tuyenKho.put(
  '/phieu-kho/:id',
  boc(async (req, res) => {
    const id = thamSo(req);
    const p = req.body as Partial<PhieuKho>;
    const loai = trongDanhSach(p.loai, ['nhap', 'xuat'] as const, 'nhap');
    const ngay = chuoiRaNgay(p.ngay) ?? chuoiRaNgay(homNayISO())!;
    const dong = (Array.isArray(p.danhSachDong) ? p.danhSachDong : [])
      .map((d, i) => ({
        stt: i + 1,
        vatTuId: chuoi(d?.vatTuId),
        soLuong: soLuong(d?.soLuong),
        donGia: tien(d?.donGia),
        ghiChu: chuoi(d?.ghiChu),
      }))
      .filter((d) => d.vatTuId && d.soLuong > 0);
    if (!dong.length) throw new LoiApi(400, 'Phiếu cần ít nhất một vật tư có số lượng');
    const soGui = chuoi(p.soPhieu).trim();
    const kq = await baoTrungSo(soGui, () =>
      prisma.$transaction(async (tx) => {
        // Xếp hàng các lần ghi phiếu kho để kiểm tra tồn không bị hai phiếu xuất cùng lúc vượt qua
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(73030)`;
        const cu = await tx.phieuKho.findUnique({ where: { id } });
        let soPhieu = soGui || (cu && cu.loai === loai ? cu.soPhieu : '');
        if (!soPhieu) {
          const cd = await layCaiDat(tx);
          soPhieu = await capSoPhieu(
            tx,
            loai === 'nhap' ? KHOA_CAP_SO.phieuNhap : KHOA_CAP_SO.phieuXuat,
            loai === 'nhap' ? cd.tienToPhieuNhap : cd.tienToPhieuXuat,
            ngay,
            cd.soChuSo,
            async (dau) => (await tx.phieuKho.findMany({ where: { soPhieu: { startsWith: dau } }, select: { soPhieu: true } })).map((x) => x.soPhieu),
          );
        }
        const coId = async (bang: 'nhaCungCap' | 'hoaDon' | 'baoGia', x: unknown) => {
          const s = chuoi(x);
          if (!s) return null;
          const tim = { where: { id: s }, select: { id: true } } as const;
          const co =
            bang === 'nhaCungCap' ? await tx.nhaCungCap.findUnique(tim) : bang === 'hoaDon' ? await tx.hoaDon.findUnique(tim) : await tx.baoGia.findUnique(tim);
          return co ? s : null;
        };
        const duLieu = {
          loai,
          soPhieu,
          ngay,
          nhaCungCapId: loai === 'nhap' ? await coId('nhaCungCap', p.nhaCungCapId) : null,
          hoaDonId: loai === 'nhap' ? await coId('hoaDon', p.hoaDonId) : null,
          baoGiaId: loai === 'xuat' ? await coId('baoGia', p.baoGiaId) : null,
          nguoiGiaoNhan: chuoi(p.nguoiGiaoNhan).trim(),
          ghiChu: chuoi(p.ghiChu),
        };
        const vatTuCu = cu ? (await tx.dongPhieuKho.findMany({ where: { phieuKhoId: id }, select: { vatTuId: true } })).map((d) => d.vatTuId) : [];
        if (cu) await tx.dongPhieuKho.deleteMany({ where: { phieuKhoId: id } });
        const ghi = cu
          ? await tx.phieuKho.update({ where: { id }, data: { ...duLieu, danhSachDong: { create: dong } }, include: KEM_PHIEU })
          : await tx.phieuKho.create({ data: { id, ...duLieu, danhSachDong: { create: dong } }, include: KEM_PHIEU });
        // Kiểm tra tồn sau khi ghi (gồm cả vật tư vừa bỏ khỏi phiếu nhập)
        const ids = [...new Set([...dong.map((d) => d.vatTuId), ...vatTuCu])];
        const ton = await tonTheoVatTu(tx, ids);
        const am = ids.filter((v) => (ton.get(v) ?? 0) < -0.0005);
        if (am.length) {
          const ten = await tx.vatTu.findMany({ where: { id: { in: am } }, select: { id: true, ten: true, donViTinh: true } });
          const chiTiet = ten.map((v) => `${v.ten} (thiếu ${dinhDangSoLuong(-(ton.get(v.id) ?? 0))} ${v.donViTinh})`).join(', ');
          throw new LoiApi(400, `Không đủ tồn kho: ${chiTiet}`);
        }
        return ghi;
      }),
    ).catch((e) => {
      if (e?.code === 'P2003') throw new LoiApi(400, 'Có vật tư không còn tồn tại — tải lại trang');
      throw e;
    });
    res.json(phieuKhoRaApp(kq));
  }),
);

tuyenKho.delete(
  '/phieu-kho/:id',
  boc(async (req, res) => {
    const id = thamSo(req);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(73030)`;
      const vatTu = (await tx.dongPhieuKho.findMany({ where: { phieuKhoId: id }, select: { vatTuId: true } })).map((d) => d.vatTuId);
      await tx.phieuKho.deleteMany({ where: { id } });
      // Xoá phiếu nhập mà hàng đã xuất rồi thì tồn bị âm
      const ton = await tonTheoVatTu(tx, vatTu.length ? vatTu : ['-']);
      if ([...ton.values()].some((t) => t < -0.0005)) {
        throw new LoiApi(400, 'Không xoá được: vật tư của phiếu nhập này đã được xuất, tồn kho sẽ bị âm');
      }
    });
    res.status(204).end();
  }),
);
