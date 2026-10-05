/**
 * Nội dung chữ dùng chung cho mọi định dạng xuất (PDF, Word, Excel) — để ba bản luôn ghi giống hệt nhau.
 */
import type { BaoGia, BienBanNghiemThu, CaiDat, ChietKhau, DongHangMuc } from '../db/kieu';
import { congNgay, dinhDangNgay, dinhDangSoLuong } from '../lib/dinhDang';
import { chiTietCoNoiDung, laDongTrong } from '../lib/phanMuc';
import type { KetQuaTinhTien } from '../lib/tinhTien';
import { thongTinNganHang } from './mauChung';

export interface DongTong {
  nhan: string;
  giaTri: number;
  dam?: boolean;
  /** Loại dòng — Excel dựa vào đây để viết công thức */
  loai: 'cong' | 'chietKhau' | 'sauChietKhau' | 'vat' | 'tong';
}

/** Bỏ dòng trống (chưa nhập tên, chi tiết lẫn đơn giá) */
export const dongCoNoiDung = <D extends DongHangMuc>(ds: D[]) => ds.filter((d) => !laDongTrong(d));

/** Tên hạng mục, bên dưới là các dòng chi tiết "- …", cuối cùng là ghi chú dòng (nếu có) trong ngoặc */
export const tenKemGhiChu = (d: DongHangMuc) =>
  [d.tenHangMuc, ...chiTietCoNoiDung(d).map((x) => `- ${x}`), d.ghiChu && `(${d.ghiChu})`].filter(Boolean).join('\n');

const nhanChietKhau = (ck: ChietKhau) =>
  ck.kieu === 'phanTram' ? `Chiết khấu (${dinhDangSoLuong(ck.giaTri)}%)` : 'Chiết khấu';

export function cacDongTongBaoGia(bg: BaoGia, tong: KetQuaTinhTien): DongTong[] {
  return [
    { loai: 'cong', nhan: 'Cộng tiền hàng', giaTri: tong.congTienHang },
    tong.tienChietKhau > 0 && { loai: 'chietKhau', nhan: nhanChietKhau(bg.chietKhau), giaTri: -tong.tienChietKhau },
    tong.tienChietKhau > 0 && bg.tyLeVAT > 0 && { loai: 'sauChietKhau', nhan: 'Cộng sau chiết khấu', giaTri: tong.sauChietKhau },
    bg.tyLeVAT > 0 && { loai: 'vat', nhan: `Thuế VAT ${dinhDangSoLuong(bg.tyLeVAT)}%`, giaTri: tong.tienVAT },
    { loai: 'tong', nhan: 'TỔNG THANH TOÁN', giaTri: tong.tongThanhToan, dam: true },
  ].filter(Boolean) as DongTong[];
}

export function cacDongTongNghiemThu(nt: BienBanNghiemThu, tong: KetQuaTinhTien): DongTong[] {
  return [
    { loai: 'cong', nhan: 'Cộng giá trị nghiệm thu', giaTri: tong.congTienHang },
    tong.tienChietKhau > 0 && { loai: 'chietKhau', nhan: nhanChietKhau(nt.chietKhau), giaTri: -tong.tienChietKhau },
    nt.tyLeVAT > 0 && { loai: 'vat', nhan: `Thuế VAT ${dinhDangSoLuong(nt.tyLeVAT)}%`, giaTri: tong.tienVAT },
    { loai: 'tong', nhan: 'TỔNG GIÁ TRỊ NGHIỆM THU', giaTri: tong.tongThanhToan, dam: true },
  ].filter(Boolean) as DongTong[];
}

/** Các gạch đầu dòng mục "ĐIỀU KHOẢN" của báo giá */
export function dieuKhoanBaoGia(bg: BaoGia, cd: CaiDat): string[] {
  const ngayHetHan = bg.hieuLucBaoGia > 0 ? congNgay(bg.ngayLap, bg.hieuLucBaoGia) : '';
  const nganHang = thongTinNganHang(cd);
  return [
    bg.thoiGianGiaoHang && `Thời gian giao hàng: ${bg.thoiGianGiaoHang}.`,
    bg.hieuLucBaoGia > 0 &&
      `Hiệu lực báo giá: ${bg.hieuLucBaoGia} ngày kể từ ngày báo giá (đến hết ngày ${dinhDangNgay(ngayHetHan)}).`,
    bg.dieuKhoanThanhToan && `Điều kiện thanh toán: ${bg.dieuKhoanThanhToan}`,
    nganHang && `Thông tin chuyển khoản: ${nganHang}.`,
    bg.ghiChu && `Ghi chú: ${bg.ghiChu}`,
  ].filter(Boolean) as string[];
}

/** Các dòng "Căn cứ…" đầu biên bản nghiệm thu */
export function canCuNghiemThu(nt: BienBanNghiemThu, bg: BaoGia | undefined): string[] {
  return [
    `Căn cứ Hợp đồng/Đơn đặt hàng số: ${nt.canCuHopDong || '....................'} ngày ${
      nt.ngayCanCu ? dinhDangNgay(nt.ngayCanCu) : '....../....../..........'
    };`,
    bg && `Căn cứ Báo giá số ${bg.soBaoGia} ngày ${dinhDangNgay(bg.ngayLap)};`,
    'Căn cứ khối lượng công việc thực tế đã thực hiện.',
  ].filter(Boolean) as string[];
}

/** "Người liên hệ: … – chức vụ – ĐT: …" của khách; rỗng nếu chưa có người liên hệ */
export function nguoiLienHe(kh: { nguoiLienHe: string; chucVu: string; soDienThoai: string } | undefined): string {
  if (!kh?.nguoiLienHe) return '';
  return `Người liên hệ: ${kh.nguoiLienHe}${kh.chucVu ? ` – ${kh.chucVu}` : ''}${kh.soDienThoai ? ` – ĐT: ${kh.soDienThoai}` : ''}`;
}

export const CAU_CHAO_BAO_GIA = (tenDonVi: string) => `${tenDonVi} xin trân trọng gửi tới Quý khách bảng báo giá như sau:`;
export const CAU_KET_BAO_GIA = 'Rất mong nhận được sự hợp tác của Quý khách. Trân trọng!';
export const CAU_KET_NGHIEM_THU = 'Biên bản được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị pháp lý như nhau.';
export const CHAM = '........................................';
