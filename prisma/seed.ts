/**
 * Dữ liệu ban đầu cho cơ sở dữ liệu — chạy: npm run db:seed (bản desktop tự chạy sau migration).
 * Chạy lại nhiều lần vẫn an toàn: chỉ thêm phần còn thiếu, không ghi đè những gì người dùng đã sửa trong Cài đặt.
 */
import { randomBytes } from 'node:crypto';
import { MOI_TRUONG } from '../server/moiTruong';
import { prisma } from '../server/prisma';
import { napDuLieuMau } from '../server/dichVu';
import { caiDatVaoDB } from '../server/anhXa';
import { bamMatKhau } from '../server/xacThuc';
import type { Prisma } from '../server/generated/prisma/client';
import { CAI_DAT_BAN_DAU, LOAI_CONG_BAN_DAU, VAI_TRO_BAN_DAU } from './duLieuBanDau';

/** Các cột của bảng nhập hạng mục, theo thứ tự hiện */
const COT_HANG_MUC: Omit<Prisma.CotHangMucCreateInput, 'thuTu'>[] = [
  {
    truong: 'tenHangMuc',
    tieuDe: 'Tên hàng hoá / dịch vụ',
    goiY: 'Gõ vài chữ để chọn, vd: tien truc',
    batBuoc: true,
    doRong: 160,
    heSoGian: 2,
  },
  { truong: 'quyCach', tieuDe: 'Quy cách', goiY: 'Vật liệu, kích thước…', doRong: 120, heSoGian: 1.4 },
  { truong: 'donViTinh', tieuDe: 'Đơn vị', doRong: 84 },
  { truong: 'soLuong', tieuDe: 'Số lượng', goiY: '0', kieu: 'so', batBuoc: true, doRong: 96 },
  { truong: 'donGia', tieuDe: 'Đơn giá', goiY: '0', kieu: 'so', batBuoc: true, doRong: 150 },
  { truong: 'thanhTien', tieuDe: 'Thành tiền', kieu: 'so', batBuoc: true, doRong: 140 },
];

async function seedCotHangMuc() {
  const daCo = new Set((await prisma.cotHangMuc.findMany({ select: { truong: true } })).map((c) => c.truong));
  const cuoi = await prisma.cotHangMuc.aggregate({ _max: { thuTu: true } });
  let thuTu = (cuoi._max.thuTu ?? -1) + 1;
  let soMoi = 0;
  for (const cot of COT_HANG_MUC) {
    if (daCo.has(cot.truong ?? null)) continue;
    await prisma.cotHangMuc.create({ data: { ...cot, thuTu: thuTu++ } });
    soMoi++;
  }
  console.log(soMoi ? `Đã thêm ${soMoi} cột bảng hạng mục.` : 'Cột bảng hạng mục: đã đủ, không thêm gì.');
}

/**
 * Cài đặt: chưa có thì tạo từ giá trị ban đầu. Đã có thì chỉ điền các danh sách còn trống
 * (đơn vị tính, nhóm hạng mục, mức VAT — cột mới thêm sau, DB cũ chưa có giá trị). Trả về true nếu vừa tạo mới.
 */
async function seedCaiDat(): Promise<boolean> {
  const cu = await prisma.caiDat.findUnique({ where: { id: 'caiDat' } });
  const banDau = caiDatVaoDB(CAI_DAT_BAN_DAU);
  if (!cu) {
    await prisma.caiDat.create({ data: { id: 'caiDat', ...banDau } });
    console.log('Đã tạo cài đặt ban đầu.');
    return true;
  }
  const thieu: Prisma.CaiDatUpdateInput = {};
  if (!cu.danhSachDonViTinh.length) thieu.danhSachDonViTinh = banDau.danhSachDonViTinh;
  if (!cu.nhomHangMuc.length) thieu.nhomHangMuc = banDau.nhomHangMuc;
  if (!cu.luaChonVAT.length) thieu.luaChonVAT = banDau.luaChonVAT;
  if (!cu.danhMucThu.length) thieu.danhMucThu = banDau.danhMucThu;
  if (!cu.danhMucChi.length) thieu.danhMucChi = banDau.danhMucChi;
  if (!cu.nhomVatTu.length) thieu.nhomVatTu = banDau.nhomVatTu;
  if (!cu.ngayNghiTuan.length) thieu.ngayNghiTuan = banDau.ngayNghiTuan;
  if (Object.keys(thieu).length) {
    await prisma.caiDat.update({ where: { id: 'caiDat' }, data: thieu });
    console.log(`Cài đặt: đã điền ${Object.keys(thieu).join(', ')}.`);
  } else {
    console.log('Cài đặt: đã đủ, không thêm gì.');
  }
  return false;
}

/** Lần đầu (vừa tạo cài đặt) mà DB chưa có chứng từ / khách nào: nạp dữ liệu mẫu để xem thử (SEED_DU_LIEU_MAU) */
async function seedDuLieuMau(lanDau: boolean) {
  if (!lanDau || !MOI_TRUONG.napDuLieuMau) return;
  if ((await prisma.baoGia.count()) + (await prisma.khachHang.count()) > 0) return;
  await napDuLieuMau();
  console.log('Đã nạp dữ liệu mẫu (lần chạy đầu tiên).');
}

/** Vai trò còn thiếu (theo tên). Vai trò đã có thì giữ nguyên quyền người dùng đã sửa. */
async function seedVaiTro() {
  let soMoi = 0;
  for (const [i, v] of VAI_TRO_BAN_DAU.entries()) {
    if (await prisma.vaiTro.findUnique({ where: { ten: v.ten } })) continue;
    await prisma.vaiTro.create({ data: { ten: v.ten, moTa: v.moTa, quyen: v.quyen, heThong: Boolean(v.heThong), thuTu: i } });
    soMoi++;
  }
  console.log(soMoi ? `Đã thêm ${soMoi} vai trò.` : 'Vai trò: đã đủ, không thêm gì.');
}

/**
 * Chưa có tài khoản nào: tạo tài khoản Quản trị đầu tiên (ADMIN_USERNAME / ADMIN_PASSWORD trong .env).
 * Không đặt mật khẩu thì tạo mật khẩu ngẫu nhiên và in ra một lần — đăng nhập rồi đổi ngay.
 */
async function seedQuanTri() {
  if (await prisma.nguoiDung.count()) return console.log('Tài khoản: đã có, không thêm gì.');
  const vaiTro = await prisma.vaiTro.findFirst({ where: { heThong: true }, orderBy: { thuTu: 'asc' } });
  if (!vaiTro) throw new Error('Thiếu vai trò Quản trị');
  const ngauNhien = !MOI_TRUONG.matKhauQuanTri;
  const matKhau = MOI_TRUONG.matKhauQuanTri || randomBytes(6).toString('base64url');
  await prisma.nguoiDung.create({
    data: { tenDangNhap: MOI_TRUONG.tenQuanTri, hoTen: 'Quản trị', matKhauBam: await bamMatKhau(matKhau), vaiTroId: vaiTro.id },
  });
  console.log(`Đã tạo tài khoản quản trị "${MOI_TRUONG.tenQuanTri}".`);
  if (ngauNhien) {
    console.log('┌──────────────────────────────────────────────────────────');
    console.log(`│ Mật khẩu tạm: ${matKhau}`);
    console.log('│ Chưa đặt ADMIN_PASSWORD trong .env nên mật khẩu được tạo ngẫu nhiên.');
    console.log('│ Đăng nhập rồi đổi mật khẩu ngay (bấm tên mình ở menu → Đổi mật khẩu).');
    console.log('└──────────────────────────────────────────────────────────');
  }
}

async function seedLoaiCong() {
  if (await prisma.loaiCong.count()) return console.log('Ký hiệu công: đã có, không thêm gì.');
  await prisma.loaiCong.createMany({ data: LOAI_CONG_BAN_DAU.map((l, thuTu) => ({ ...l, thuTu })) });
  console.log(`Đã thêm ${LOAI_CONG_BAN_DAU.length} ký hiệu công.`);
}

async function main() {
  await seedCotHangMuc();
  await seedDuLieuMau(await seedCaiDat());
  await seedVaiTro();
  await seedQuanTri();
  await seedLoaiCong();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
