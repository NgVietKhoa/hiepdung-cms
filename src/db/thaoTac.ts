/** Các thao tác nghiệp vụ gọi máy chủ: tạo, nhân bản, chuyển báo giá → nghiệm thu, xoá. */
import { homNayISO } from '../lib/dinhDang';
import { caiDatHienThi } from '../lib/hienThiXuong';
import {
  baoGiaMoi,
  chuyenBaoGiaThanhNghiemThu,
  hangMucTuDong,
  laBaoGiaRong,
  laNghiemThuRong,
  nghiemThuMoi,
  nhanBanTu,
} from '../lib/nghiepVu';
import { api } from './api';
import type { DongHangMuc } from './kieu';
import { khoaNhapTam, xoaNhapTam } from './nhapTam';

/* Nháp trống do CHÍNH máy này tạo: nhớ lại để lần mở sau xoá ngay nếu vẫn trống
   (máy chủ chỉ dọn nháp trống quá 10 phút, để không xoá nhầm nháp máy khác vừa tạo). */
const KHOA_NHAP_MOI = 'baoGiaNhanh:nhapMoi';
type NhapMoi = { loai: 'baoGia' | 'nghiemThu'; id: string };
function docNhapMoi(): NhapMoi[] {
  try {
    return JSON.parse(localStorage.getItem(KHOA_NHAP_MOI) ?? '[]');
  } catch {
    return [];
  }
}
function ghiNhapMoi(ds: NhapMoi[]) {
  try {
    localStorage.setItem(KHOA_NHAP_MOI, JSON.stringify(ds.slice(-50)));
  } catch {
    /* bỏ qua */
  }
}
const nhoNhapMoi = (m: NhapMoi) => ghiNhapMoi([...docNhapMoi(), m]);

export async function donNhapCuaMayNay(): Promise<void> {
  const conLai: NhapMoi[] = [];
  for (const m of docNhapMoi()) {
    try {
      if (m.loai === 'baoGia') {
        const bg = await api.baoGia.lay(m.id);
        if (bg && laBaoGiaRong(bg)) await api.baoGia.xoa(m.id);
      } else {
        const nt = await api.nghiemThu.lay(m.id);
        if (nt && laNghiemThuRong(nt)) await api.nghiemThu.xoa(m.id);
      }
    } catch {
      conLai.push(m); // mất mạng → để lần sau
    }
  }
  ghiNhapMoi(conLai);
}

/** Tạo báo giá mới (máy chủ cấp số), trả về id. */
export async function taoBaoGiaMoi(): Promise<string> {
  const bg = baoGiaMoi(await api.caiDat.lay(), homNayISO());
  nhoNhapMoi({ loai: 'baoGia', id: bg.id });
  await api.baoGia.luu(bg);
  return bg.id;
}

export async function nhanBanBaoGia(id: string): Promise<string> {
  const goc = await api.baoGia.lay(id);
  if (!goc) throw new Error('Không tìm thấy báo giá');
  const moi = nhanBanTu(goc, homNayISO());
  await api.baoGia.luu(moi);
  return moi.id;
}

export async function taoNghiemThuTuBaoGia(baoGiaId: string): Promise<string> {
  const [bg, dsKhach, cd] = await Promise.all([api.baoGia.lay(baoGiaId), api.khachHang.ds(), api.caiDat.lay()]);
  if (!bg) throw new Error('Không tìm thấy báo giá');
  const kh = dsKhach.find((k) => k.id === bg.khachHangId);
  const nt = chuyenBaoGiaThanhNghiemThu(bg, kh, caiDatHienThi(cd), '', homNayISO());
  await api.nghiemThu.luu(nt);
  return nt.id;
}

export async function taoNghiemThuTrong(): Promise<string> {
  const nt = nghiemThuMoi(caiDatHienThi(await api.caiDat.lay()), homNayISO());
  nhoNhapMoi({ loai: 'nghiemThu', id: nt.id });
  await api.nghiemThu.luu(nt);
  return nt.id;
}

export async function xoaBaoGia(id: string): Promise<void> {
  xoaNhapTam(khoaNhapTam('baoGia', id));
  await api.baoGia.xoa(id);
}

export async function xoaNghiemThu(id: string): Promise<void> {
  xoaNhapTam(khoaNhapTam('nghiemThu', id));
  await api.nghiemThu.xoa(id);
}

/** Lưu một dòng tự gõ vào danh mục để lần sau gợi ý. */
export async function luuDongVaoDanhMuc(dong: DongHangMuc): Promise<void> {
  await api.hangMuc.luu(hangMucTuDong(dong));
}
