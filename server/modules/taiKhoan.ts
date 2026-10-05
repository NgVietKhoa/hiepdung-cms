/** Tài khoản, vai trò, đổi mật khẩu. */
import express from 'express';
import type { Prisma } from '../generated/prisma/client';
import { laMaQuyen } from '../../src/db/quyen';
import type { LuuTaiKhoan, TaiKhoan, VaiTro } from '../../src/modules/taiKhoan/kieu';
import { chuoi } from '../anhXa';
import { prisma } from '../prisma';
import { boc, LoiApi, thamSo, type Tx } from '../tienIch';
import { MAT_KHAU_TOI_THIEU, bamMatKhau, canQuyen, dungMatKhau, taoPhien } from '../xacThuc';

const vaiTroRaApp = (v: Prisma.VaiTroGetPayload<{ include: { _count: { select: { nguoiDung: true } } } }>): VaiTro => ({
  id: v.id,
  ten: v.ten,
  moTa: v.moTa,
  quyen: v.quyen.filter(laMaQuyen),
  heThong: v.heThong,
  thuTu: v.thuTu,
  soNguoiDung: v._count.nguoiDung,
});

const taiKhoanRaApp = (n: Prisma.NguoiDungGetPayload<object>): TaiKhoan => ({
  id: n.id,
  tenDangNhap: n.tenDangNhap,
  hoTen: n.hoTen,
  vaiTroId: n.vaiTroId,
  nhanVienId: n.nhanVienId,
  khoa: n.khoa,
  lanDangNhapCuoi: n.lanDangNhapCuoi ? n.lanDangNhapCuoi.getTime() : null,
  ngayTao: n.ngayTao.getTime(),
});

/** Tên đăng nhập: chữ thường không dấu, số, dấu chấm / gạch */
const TEN_HOP_LE = /^[a-z0-9._-]{3,40}$/;

/** Luôn phải còn ít nhất một tài khoản Quản trị chưa khoá — không thì không ai sửa được phân quyền nữa */
async function kiemTraConQuanTri(tx: Tx) {
  const so = await tx.nguoiDung.count({ where: { khoa: false, vaiTro: { heThong: true } } });
  if (!so) throw new LoiApi(400, 'Phải còn ít nhất một tài khoản Quản trị đang hoạt động');
}

export const tuyenTaiKhoan = express.Router();

/* ---------- Của chính mình (mọi tài khoản) ---------- */

tuyenTaiKhoan.post(
  '/toi/doi-mat-khau',
  boc(async (req, res) => {
    const moi = chuoi(req.body?.matKhauMoi);
    if (moi.length < MAT_KHAU_TOI_THIEU) throw new LoiApi(400, `Mật khẩu mới cần ít nhất ${MAT_KHAU_TOI_THIEU} ký tự`);
    const nd = await prisma.nguoiDung.findUniqueOrThrow({ where: { id: req.nguoiDung!.id } });
    if (!(await dungMatKhau(req.body?.matKhauCu, nd.matKhauBam))) throw new LoiApi(400, 'Mật khẩu hiện tại không đúng');
    const sau = await prisma.nguoiDung.update({
      where: { id: nd.id },
      data: { matKhauBam: await bamMatKhau(moi), phienBan: { increment: 1 } },
    });
    // Các máy khác đăng xuất; máy đang dùng nhận phiên mới
    res.json({ phien: taoPhien(sau) });
  }),
);

/* ---------- Quản lý (quyền taiKhoan) ---------- */

tuyenTaiKhoan.get(
  '/vai-tro',
  canQuyen('taiKhoan'),
  boc(async (_req, res) => {
    const ds = await prisma.vaiTro.findMany({
      include: { _count: { select: { nguoiDung: true } } },
      orderBy: [{ thuTu: 'asc' }, { ten: 'asc' }],
    });
    res.json(ds.map(vaiTroRaApp));
  }),
);

tuyenTaiKhoan.put(
  '/vai-tro/:id',
  canQuyen('taiKhoan'),
  boc(async (req, res) => {
    const id = thamSo(req);
    const v = req.body as Partial<VaiTro>;
    const ten = chuoi(v.ten).trim();
    if (!ten) throw new LoiApi(400, 'Thiếu tên vai trò');
    const cu = await prisma.vaiTro.findUnique({ where: { id } });
    const quyen = Array.isArray(v.quyen) ? [...new Set(v.quyen.filter(laMaQuyen))] : [];
    // Vai trò hệ thống chỉ đổi được tên / mô tả, quyền luôn đầy đủ
    const duLieu = { ten, moTa: chuoi(v.moTa), ...(cu?.heThong ? {} : { quyen }) };
    const kq = await prisma.vaiTro
      .upsert({
        where: { id },
        create: { id, ...duLieu, quyen, thuTu: (await prisma.vaiTro.count()) + 1 },
        update: duLieu,
        include: { _count: { select: { nguoiDung: true } } },
      })
      .catch((e) => {
        if (e?.code === 'P2002') throw new LoiApi(409, `Đã có vai trò "${ten}"`);
        throw e;
      });
    res.json(vaiTroRaApp(kq));
  }),
);

tuyenTaiKhoan.delete(
  '/vai-tro/:id',
  canQuyen('taiKhoan'),
  boc(async (req, res) => {
    const v = await prisma.vaiTro.findUnique({
      where: { id: thamSo(req) },
      include: { _count: { select: { nguoiDung: true } } },
    });
    if (v?.heThong) throw new LoiApi(400, 'Không xoá được vai trò Quản trị');
    if (v?._count.nguoiDung) throw new LoiApi(400, `Còn ${v._count.nguoiDung} tài khoản thuộc vai trò này — đổi vai trò cho họ trước`);
    await prisma.vaiTro.deleteMany({ where: { id: thamSo(req) } });
    res.status(204).end();
  }),
);

tuyenTaiKhoan.get(
  '/tai-khoan',
  canQuyen('taiKhoan'),
  boc(async (_req, res) => {
    res.json((await prisma.nguoiDung.findMany({ orderBy: { hoTen: 'asc' } })).map(taiKhoanRaApp));
  }),
);

tuyenTaiKhoan.put(
  '/tai-khoan/:id',
  canQuyen('taiKhoan'),
  boc(async (req, res) => {
    const id = thamSo(req);
    const t = req.body as LuuTaiKhoan;
    const tenDangNhap = chuoi(t.tenDangNhap).trim().toLowerCase();
    const hoTen = chuoi(t.hoTen).trim();
    const matKhau = chuoi(t.matKhau);
    if (!TEN_HOP_LE.test(tenDangNhap)) {
      throw new LoiApi(400, 'Tên đăng nhập 3–40 ký tự, chỉ gồm chữ thường không dấu, số, dấu chấm, gạch dưới');
    }
    if (!hoTen) throw new LoiApi(400, 'Thiếu họ tên');
    if (matKhau && matKhau.length < MAT_KHAU_TOI_THIEU) throw new LoiApi(400, `Mật khẩu cần ít nhất ${MAT_KHAU_TOI_THIEU} ký tự`);
    const kq = await prisma.$transaction(async (tx) => {
      const cu = await tx.nguoiDung.findUnique({ where: { id } });
      if (!cu && !matKhau) throw new LoiApi(400, 'Tài khoản mới cần có mật khẩu');
      const vaiTro = await tx.vaiTro.findUnique({ where: { id: chuoi(t.vaiTroId) } });
      if (!vaiTro) throw new LoiApi(400, 'Chưa chọn vai trò');
      const nhanVienId = chuoi(t.nhanVienId) || null;
      if (nhanVienId && !(await tx.nhanVien.findUnique({ where: { id: nhanVienId }, select: { id: true } }))) {
        throw new LoiApi(400, 'Không tìm thấy nhân viên');
      }
      const khoa = Boolean(t.khoa);
      if (khoa && id === req.nguoiDung!.id) throw new LoiApi(400, 'Không tự khoá tài khoản của mình được');
      const duLieu = { tenDangNhap, hoTen, vaiTroId: vaiTro.id, nhanVienId, khoa };
      const ghi = cu
        ? await tx.nguoiDung.update({
            where: { id },
            data: {
              ...duLieu,
              ...(matKhau ? { matKhauBam: await bamMatKhau(matKhau) } : {}),
              // Đặt lại mật khẩu hoặc khoá → đăng xuất người đó khỏi mọi máy
              ...(matKhau || (khoa && !cu.khoa) ? { phienBan: { increment: 1 } } : {}),
            },
          })
        : await tx.nguoiDung.create({ data: { id, ...duLieu, matKhauBam: await bamMatKhau(matKhau) } });
      await kiemTraConQuanTri(tx);
      return ghi;
    }).catch((e) => {
      if (e?.code === 'P2002') {
        const meta = JSON.stringify(e.meta ?? {});
        throw new LoiApi(409, meta.includes('nhan_vien') ? 'Nhân viên này đã gắn với tài khoản khác' : `Tên đăng nhập "${tenDangNhap}" đã có`);
      }
      throw e;
    });
    res.json(taiKhoanRaApp(kq));
  }),
);

tuyenTaiKhoan.delete(
  '/tai-khoan/:id',
  canQuyen('taiKhoan'),
  boc(async (req, res) => {
    const id = thamSo(req);
    if (id === req.nguoiDung!.id) throw new LoiApi(400, 'Không tự xoá tài khoản của mình được');
    await prisma.$transaction(async (tx) => {
      await tx.nguoiDung.deleteMany({ where: { id } });
      await kiemTraConQuanTri(tx);
    });
    res.status(204).end();
  }),
);
