/**
 * Tính lương tháng theo công nhật — dùng chung cho màn hình, file Excel và máy chủ.
 * Thực lĩnh = số công × lương một công + giờ tăng ca × tiền một giờ + phụ cấp tháng − tạm ứng.
 * Số công = tổng hệ số của các ký hiệu công đã chấm (X = 1, N = 0,5, K = 0…).
 */
import type { DongLuong, LoaiCong, NhanVien, OCong } from './kieu';

/** Làm tròn số công / giờ tới 2 chữ số thập phân để không dính sai số số thực (0,1 + 0,2) */
const tron2 = (n: number) => Math.round(n * 100) / 100;

export function tinhLuong(nv: NhanVien, oCuaNv: OCong[], loaiCong: LoaiCong[], tamUng = 0): DongLuong {
  const heSo = new Map(loaiCong.map((l) => [l.id, l.heSo]));
  const soNgayTheoLoai: Record<string, number> = {};
  let soCong = 0;
  let gioTangCa = 0;
  for (const o of oCuaNv) {
    if (o.loaiCongId && heSo.has(o.loaiCongId)) {
      soCong += heSo.get(o.loaiCongId)!;
      soNgayTheoLoai[o.loaiCongId] = (soNgayTheoLoai[o.loaiCongId] ?? 0) + 1;
    }
    gioTangCa += o.gioTangCa || 0;
  }
  soCong = tron2(soCong);
  gioTangCa = tron2(gioTangCa);
  const tienCong = Math.round(soCong * nv.luongNgay);
  const tienTangCa = Math.round(gioTangCa * nv.luongGioTangCa);
  const phuCap = Math.round(nv.phuCapThang);
  return {
    nhanVienId: nv.id,
    hoTen: nv.hoTen,
    chucVu: nv.chucVu,
    soCong,
    gioTangCa,
    luongNgay: nv.luongNgay,
    luongGioTangCa: nv.luongGioTangCa,
    tienCong,
    tienTangCa,
    phuCap,
    tamUng,
    thucLinh: tienCong + tienTangCa + phuCap - tamUng,
    soNgayTheoLoai,
    soTaiKhoan: nv.soTaiKhoan,
    nganHang: nv.nganHang,
  };
}
