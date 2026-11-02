/** Số liệu tổng hợp cho màn Tổng quan. */
import express from 'express';
import type { TongQuan } from '../../src/modules/tongQuan/kieu';
import { congThang, khoangThang } from '../../src/lib/thang';
import { homNayISO } from '../../src/lib/dinhDang';
import { chuoiRaNgay, so } from '../anhXa';
import { dsTomTatBaoGia } from '../dichVu';
import { prisma } from '../prisma';
import { boc, thangTuQuery } from '../tienIch';
import { canQuyen } from '../xacThuc';
import { dsTomTatHoaDon } from './hoaDon';
import { dsVatTuTon } from './kho';
import { congNo, soQuy } from './thuChi';

const SO_THANG_BIEU_DO = 6;

export const tuyenTongQuan = express.Router();

tuyenTongQuan.get(
  '/tong-quan',
  canQuyen('tongQuan'),
  boc(async (req, res) => {
    const thang = thangTuQuery(req.query);
    const dau = congThang(thang, -(SO_THANG_BIEU_DO - 1));
    const tuBieuDo = chuoiRaNgay(khoangThang(dau).tu)!;
    const denThang = chuoiRaNgay(khoangThang(thang).den)!;
    const homNay = chuoiRaNgay(homNayISO())!;

    const [hoaDon, phieu, quy, phaiThu, phaiTra, baoGia, soNhanVien, daCham, vatTu] = await Promise.all([
      dsTomTatHoaDon({ ngayHoaDon: { gte: tuBieuDo, lt: denThang }, trangThai: 'hieuLuc' }),
      prisma.phieuThuChi.findMany({ where: { ngay: { gte: tuBieuDo, lt: denThang } }, select: { loai: true, ngay: true, soTien: true } }),
      soQuy(homNay, new Date(homNay.getTime() + 24 * 3600 * 1000)),
      congNo('phaiThu'),
      congNo('phaiTra'),
      dsTomTatBaoGia(),
      prisma.nhanVien.count({ where: { dangLam: true } }),
      prisma.chamCong.count({ where: { ngay: homNay, loaiCongId: { not: null }, nhanVien: { dangLam: true } } }),
      dsVatTuTon(),
    ]);

    const bieuDo = Array.from({ length: SO_THANG_BIEU_DO }, (_, i) => ({ thang: congThang(dau, i), doanhThu: 0, thu: 0, chi: 0 }));
    const cot = new Map(bieuDo.map((c) => [c.thang, c]));
    let muaVao = 0;
    for (const h of hoaDon) {
      const t = h.ngayHoaDon.slice(0, 7);
      if (h.loai === 'banRa') cot.get(t)!.doanhThu += h.tienTruocThue;
      else if (t === thang) muaVao += h.tienTruocThue;
    }
    for (const p of phieu) {
      const c = cot.get(p.ngay.toISOString().slice(0, 7));
      if (c) c[p.loai] += so(p.soTien);
    }
    const thangNay = cot.get(thang)!;

    const choChot = baoGia.filter((b) => b.trangThai === 'nhap' || b.trangThai === 'daGui');
    const chotThang = baoGia.filter((b) => b.trangThai === 'daChot' && b.ngay >= khoangThang(thang).tu && b.ngay < khoangThang(thang).den);

    const kq: TongQuan = {
      thang,
      doanhThu: thangNay.doanhThu,
      muaVao,
      thuThang: thangNay.thu,
      chiThang: thangNay.chi,
      tonQuy: quy.tonCuoi.tong,
      phaiThu: phaiThu.reduce((s, c) => s + Math.max(0, c.conNo), 0),
      phaiTra: phaiTra.reduce((s, c) => s + Math.max(0, c.conNo), 0),
      baoGiaCho: { so: choChot.length, tong: choChot.reduce((s, b) => s + b.tong, 0) },
      baoGiaChotThang: { so: chotThang.length, tong: chotThang.reduce((s, b) => s + b.tong, 0) },
      chamCongHomNay: { daCham, tongNhanVien: soNhanVien },
      vatTuSapHet: vatTu
        .filter((v) => !v.ngungDung && v.tonToiThieu > 0 && v.tonKho < v.tonToiThieu)
        .map((v) => ({ id: v.id, ten: v.ten, tonKho: v.tonKho, tonToiThieu: v.tonToiThieu, donViTinh: v.donViTinh })),
      bieuDo,
    };
    res.json(kq);
  }),
);
