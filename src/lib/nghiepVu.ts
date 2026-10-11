/**
 * Logic nghiệp vụ thuần (không đụng mạng / CSDL): dựng chứng từ mới, nhân bản,
 * chuyển báo giá → biên bản nghiệm thu. Dùng chung cho trình duyệt và máy chủ.
 * Số chứng từ để trống ('') thì máy chủ sẽ tự cấp khi lưu.
 */
import type {
  BaoGia,
  BienBanNghiemThu,
  CaiDat,
  DongHangMuc,
  DongNghiemThu,
  HangMuc,
  KhachHang,
} from '../db/kieu';
import { taoId } from './id';
import { laDongTrong } from './phanMuc';

/** Đơn vị tính điền sẵn cho dòng mới: đơn vị đầu tiên trong danh sách ở Cài đặt */
export const donViTinhMacDinh = (cd: Pick<CaiDat, 'danhSachDonViTinh'>) => cd.danhSachDonViTinh[0] ?? '';

export function taoDongTrong(donViTinh = ''): DongHangMuc {
  return { id: taoId(), tenHangMuc: '', quyCach: '', donViTinh, soLuong: 1, donGia: 0, ghiChu: '' };
}

export function dongNghiemThuTrong(donViTinh = ''): DongNghiemThu {
  return { ...taoDongTrong(donViTinh), soLuongThucTe: 1 };
}

export function dongTuHangMuc(hm: HangMuc): Partial<DongHangMuc> {
  return { tenHangMuc: hm.ten, donViTinh: hm.donViTinh, donGia: hm.donGiaMacDinh, quyCach: hm.moTa };
}

export function khachHangTrong(): KhachHang {
  return {
    id: taoId(),
    tenCongTy: '',
    diaChi: '',
    maSoThue: '',
    nguoiLienHe: '',
    chucVu: '',
    soDienThoai: '',
    email: '',
    ghiChu: '',
    ngayTao: Date.now(),
  };
}

export function baoGiaMoi(cd: CaiDat, ngay: string): BaoGia {
  return {
    id: taoId(),
    soBaoGia: '',
    ngayLap: ngay,
    khachHangId: null,
    tieuDe: '',
    danhSachDong: [taoDongTrong(donViTinhMacDinh(cd))],
    tyLeVAT: cd.vatMacDinh,
    chietKhau: { kieu: 'phanTram', giaTri: 0 },
    thoiGianGiaoHang: cd.thoiGianGiaoHangMacDinh,
    hieuLucBaoGia: cd.hieuLucMacDinh,
    dieuKhoanThanhToan: cd.dieuKhoanThanhToanMacDinh,
    ghiChu: '',
    trangThai: 'nhap',
    ngayTao: Date.now(),
    ngaySua: Date.now(),
  };
}

export function nhanBanTu(goc: BaoGia, ngay: string): BaoGia {
  return {
    ...structuredClone(goc),
    id: taoId(),
    soBaoGia: '',
    ngayLap: ngay,
    trangThai: 'nhap',
    danhSachDong: goc.danhSachDong.map((d) => ({ ...d, id: taoId() })),
    ngayTao: Date.now(),
    ngaySua: Date.now(),
  };
}

/** Báo giá vừa tạo mà chưa nhập gì → xoá khi rời màn hình để không rác danh sách. */
export function laBaoGiaRong(bg: BaoGia): boolean {
  return (
    !bg.khachHangId &&
    !bg.tieuDe.trim() &&
    bg.danhSachDong.every(laDongTrong)
  );
}

export function chuyenBaoGiaThanhNghiemThu(
  bg: BaoGia,
  kh: KhachHang | undefined,
  cd: CaiDat,
  soBienBan: string,
  ngay: string,
): BienBanNghiemThu {
  return {
    id: taoId(),
    soBienBan,
    baoGiaId: bg.id,
    khachHangId: bg.khachHangId,
    ngayNghiemThu: ngay,
    diaDiem: cd.diaDiemNghiemThuMacDinh || cd.diaChi,
    canCuHopDong: '',
    ngayCanCu: '',
    tieuDe: bg.tieuDe,
    thanhPhanBenA: [{ hoTen: kh?.nguoiLienHe ?? '', chucVu: kh?.chucVu ?? '' }],
    thanhPhanBenB: [{ hoTen: cd.nguoiDaiDien, chucVu: cd.chucVu }],
    // Bỏ đúng những dòng mà bản in báo giá cũng bỏ — dòng chưa có tên nhưng có đơn giá vẫn được chuyển, để tổng không lệch
    danhSachDong: bg.danhSachDong
      .filter((d) => !laDongTrong(d))
      .map<DongNghiemThu>((d) => ({
        ...d,
        id: taoId(),
        soLuongThucTe: d.soLuong,
      })),
    tyLeVAT: bg.tyLeVAT,
    chietKhau: { ...bg.chietKhau },
    ketLuan: cd.ketLuanMacDinh,
    soAnh: 0,
    trangThai: 'nhap',
    ngayTao: Date.now(),
    ngaySua: Date.now(),
  };
}

export function nghiemThuMoi(cd: CaiDat, ngay: string): BienBanNghiemThu {
  return {
    id: taoId(),
    soBienBan: '',
    baoGiaId: null,
    khachHangId: null,
    ngayNghiemThu: ngay,
    diaDiem: cd.diaDiemNghiemThuMacDinh || cd.diaChi,
    canCuHopDong: '',
    ngayCanCu: '',
    tieuDe: '',
    thanhPhanBenA: [{ hoTen: '', chucVu: '' }],
    thanhPhanBenB: [{ hoTen: cd.nguoiDaiDien, chucVu: cd.chucVu }],
    danhSachDong: [dongNghiemThuTrong(donViTinhMacDinh(cd))],
    tyLeVAT: cd.vatMacDinh,
    chietKhau: { kieu: 'phanTram', giaTri: 0 },
    ketLuan: cd.ketLuanMacDinh,
    soAnh: 0,
    trangThai: 'nhap',
    ngayTao: Date.now(),
    ngaySua: Date.now(),
  };
}

export function laNghiemThuRong(nt: BienBanNghiemThu): boolean {
  return (
    !nt.baoGiaId &&
    !nt.khachHangId &&
    !nt.soAnh &&
    nt.danhSachDong.every(laDongTrong)
  );
}

/** Dòng tự gõ → hạng mục mới trong danh mục (chưa chọn nhóm: máy chủ xếp vào nhóm mặc định của DB, người dùng đổi sau) */
export function hangMucTuDong(dong: DongHangMuc): HangMuc {
  return {
    id: taoId(),
    ten: dong.tenHangMuc.trim(),
    donViTinh: dong.donViTinh,
    donGiaMacDinh: dong.donGia,
    nhom: '',
    moTa: dong.quyCach,
  };
}
