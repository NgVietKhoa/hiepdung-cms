/** Gọi API các module CMS (báo giá ở src/db/api.ts). */
import { goi, layHoacNull, ma, type TuyChonGoi } from '../db/api';
import type { BangCong, DongLuong, LoaiCong, NhanVien, OCong } from './chamCong/kieu';
import type { HoaDon, LoaiHoaDon, NhaCungCap, TepHoaDon, TomTatHoaDon } from './hoaDon/kieu';
import type { CongNo, LoaiCongNo, PhieuThuChi, SoQuy } from './thuChi/kieu';
import type { TongQuan } from './tongQuan/kieu';

/** Chuỗi truy vấn từ đối tượng, bỏ giá trị trống */
const truyVan = (q: Record<string, string | undefined>) => {
  const s = new URLSearchParams(Object.entries(q).filter((x): x is [string, string] => Boolean(x[1]))).toString();
  return s ? `?${s}` : '';
};

/** Tải file lên: gửi nguyên dữ liệu, kiểu file ở header */
const taiLen = <T>(duongDan: string, file: File | Blob, ten: string) =>
  goi<T>('POST', `${duongDan}${truyVan({ ten })}`, file, {
    header: { 'X-Kieu-File': file.type || 'application/octet-stream' },
    thoiGianCho: 120_000,
  } satisfies TuyChonGoi);

export const apiCms = {
  tongQuan: (thang: string) => goi<TongQuan>('GET', `/tong-quan${truyVan({ thang })}`),

  chamCong: {
    dsNhanVien: () => goi<NhanVien[]>('GET', '/nhan-vien'),
    luuNhanVien: (n: NhanVien) => goi<NhanVien>('PUT', `/nhan-vien/${ma(n.id)}`, n),
    xoaNhanVien: (id: string) => goi<void>('DELETE', `/nhan-vien/${ma(id)}`),
    thuTuNhanVien: (ids: string[]) => goi<void>('POST', '/nhan-vien/thu-tu', ids),
    luuLoaiCong: (ds: LoaiCong[]) => goi<LoaiCong[]>('PUT', '/loai-cong', ds),
    bangCong: (thang: string) => goi<BangCong>('GET', `/cham-cong${truyVan({ thang })}`),
    /** Ghi nhiều ô; không báo các danh sách tải lại (bảng công tự cập nhật tại chỗ) */
    ghiO: (ds: OCong[]) => goi<void>('PUT', '/cham-cong', ds, { baoThayDoi: false }),
    bangLuong: (thang: string) => goi<DongLuong[]>('GET', `/bang-luong${truyVan({ thang })}`),
    tamUng: (thang: string) => goi<PhieuThuChi[]>('GET', `/tam-ung${truyVan({ thang })}`),
  },

  hoaDon: {
    dsNhaCungCap: () => goi<NhaCungCap[]>('GET', '/nha-cung-cap'),
    luuNhaCungCap: (n: NhaCungCap) => goi<NhaCungCap>('PUT', `/nha-cung-cap/${ma(n.id)}`, n),
    xoaNhaCungCap: (id: string) => goi<void>('DELETE', `/nha-cung-cap/${ma(id)}`),
    ds: (q: { loai?: LoaiHoaDon; thang?: string; tatCa?: boolean; baoGiaId?: string }) =>
      goi<TomTatHoaDon[]>('GET', `/hoa-don${truyVan({ loai: q.loai, thang: q.thang, tatCa: q.tatCa ? '1' : undefined, baoGiaId: q.baoGiaId })}`),
    lay: (id: string) => layHoacNull<HoaDon>(`/hoa-don/${ma(id)}`),
    luu: (h: HoaDon, tuyChon?: TuyChonGoi) => goi<HoaDon>('PUT', `/hoa-don/${ma(h.id)}`, h, tuyChon),
    xoa: (id: string) => goi<void>('DELETE', `/hoa-don/${ma(id)}`),
    tuBaoGia: (baoGiaId: string) => goi<Partial<HoaDon>>('GET', `/hoa-don-tu-bao-gia/${ma(baoGiaId)}`),
    dsTep: (id: string) => goi<TepHoaDon[]>('GET', `/hoa-don/${ma(id)}/tep`),
    themTep: (id: string, file: File) => taiLen<TepHoaDon>(`/hoa-don/${ma(id)}/tep`, file, file.name),
    taiTep: (id: string) => goi<Blob>('GET', `/tep-hoa-don/${ma(id)}`, undefined, { nhanFile: true, thoiGianCho: 120_000 }),
    xoaTep: (id: string) => goi<void>('DELETE', `/tep-hoa-don/${ma(id)}`),
    thueGTGT: (thang: string) =>
      goi<{ dauRa: { soHoaDon: number; tienTruocThue: number; tienThue: number }; dauVao: { soHoaDon: number; tienTruocThue: number; tienThue: number }; phaiNop: number }>(
        'GET',
        `/thue-gtgt${truyVan({ thang })}`,
      ),
  },

  thuChi: {
    ds: (q: { thang?: string; loai?: 'thu' | 'chi'; hoaDonId?: string }) => goi<PhieuThuChi[]>('GET', `/phieu-thu-chi${truyVan(q)}`),
    luu: (p: PhieuThuChi) => goi<PhieuThuChi>('PUT', `/phieu-thu-chi/${ma(p.id)}`, p),
    xoa: (id: string) => goi<void>('DELETE', `/phieu-thu-chi/${ma(id)}`),
    soQuy: (thang: string) => goi<SoQuy>('GET', `/so-quy${truyVan({ thang })}`),
    congNo: (loai: LoaiCongNo) => goi<CongNo[]>('GET', `/cong-no${truyVan({ loai })}`),
  },
};
