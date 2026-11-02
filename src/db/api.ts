/**
 * Gọi API máy chủ (thay cho IndexedDB). Mọi đường dẫn bắt đầu bằng /api:
 *  - khi phát triển, Vite chuyển tiếp /api sang máy chủ (xem vite.config.ts);
 *  - khi chạy thật, máy chủ phục vụ cả giao diện lẫn API trên cùng một cổng.
 */
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
} from './kieu';

export class LoiApi extends Error {
  constructor(
    /** 0 = không kết nối được máy chủ */
    public trangThai: number,
    message: string,
  ) {
    super(message);
  }
}

/* ---------- Thông báo cho giao diện ---------- */

type Nghe<T> = (giaTri: T) => void;
function taoKenh<T>() {
  const ds = new Set<Nghe<T>>();
  return {
    nghe(fn: Nghe<T>) {
      ds.add(fn);
      return () => void ds.delete(fn);
    },
    phat(giaTri: T) {
      ds.forEach((fn) => fn(giaTri));
    },
  };
}
/** Dữ liệu vừa thay đổi → các danh sách đang hiển thị tải lại */
export const kenhThayDoi = taoKenh<void>();
/** true = mất kết nối máy chủ, false = đã kết nối lại */
export const kenhMatKetNoi = taoKenh<boolean>();

/* ---------- Hàm gọi chung ---------- */

export interface TuyChonGoi {
  /** Báo cho các danh sách tải lại sau khi ghi (mặc định: có, với mọi lệnh ghi) */
  baoThayDoi?: boolean;
  /** Chờ tối đa bao lâu (ms) rồi coi như mất kết nối — để không treo "Đang kết nối…" mãi */
  thoiGianCho?: number;
  /** Nhận nguyên dữ liệu (Blob) thay vì đọc JSON — dùng cho file sao lưu */
  nhanFile?: boolean;
  /** Header thêm (vd. kiểu file khi tải file lên) */
  header?: Record<string, string>;
}

const CHO_MAC_DINH = 15_000;
const CHO_LAU = 5 * 60_000;

export async function goi<T>(phuongThuc: string, duongDan: string, than?: unknown, tuyChon: TuyChonGoi = {}): Promise<T> {
  const huy = new AbortController();
  const hen = window.setTimeout(() => huy.abort(), tuyChon.thoiGianCho ?? CHO_MAC_DINH);
  // File (PDF, Word, Excel) gửi nguyên dữ liệu nhị phân; còn lại gửi JSON
  const laFile = than instanceof Blob;
  try {
    let phanHoi: Response;
    try {
      phanHoi = await fetch(`/api${duongDan}`, {
        method: phuongThuc,
        headers: {
          ...(than !== undefined ? { 'Content-Type': laFile ? 'application/octet-stream' : 'application/json' } : {}),
          ...tuyChon.header,
        },
        body: laFile ? than : than !== undefined ? JSON.stringify(than) : undefined,
        signal: huy.signal,
      });
    } catch {
      kenhMatKetNoi.phat(true);
      throw new LoiApi(0, 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
    }
    kenhMatKetNoi.phat(phanHoi.status >= 502 && phanHoi.status <= 504);
    if (!phanHoi.ok) {
      const noiDung = await phanHoi.json().catch(() => null);
      throw new LoiApi(phanHoi.status, noiDung?.loi ?? `Lỗi máy chủ (${phanHoi.status})`);
    }
    // Đọc hết thân phản hồi trong thời gian chờ (file sao lưu lớn tải về từ từ)
    const ketQua = phanHoi.status === 204 ? undefined : tuyChon.nhanFile ? await phanHoi.blob() : await phanHoi.json();
    if (phuongThuc !== 'GET' && tuyChon.baoThayDoi !== false) kenhThayDoi.phat();
    return ketQua as T;
  } catch (e) {
    if (e instanceof LoiApi) throw e;
    // Đứt kết nối / hết thời gian chờ giữa lúc đang nhận dữ liệu
    kenhMatKetNoi.phat(true);
    throw new LoiApi(0, 'Mất kết nối máy chủ giữa chừng. Vui lòng thử lại.');
  } finally {
    window.clearTimeout(hen);
  }
}

/** GET trả về null khi không tìm thấy (404) */
export async function layHoacNull<T>(duongDan: string): Promise<T | null> {
  try {
    return await goi<T>('GET', duongDan);
  } catch (e) {
    if (e instanceof LoiApi && e.trangThai === 404) return null;
    throw e;
  }
}

export const ma = encodeURIComponent;

/* ---------- Các nhóm API ---------- */

export const api = {
  caiDat: {
    lay: () => goi<CaiDat>('GET', '/cai-dat'),
    luu: (cd: Partial<CaiDat>, tuyChon?: TuyChonGoi) => goi<CaiDat>('PUT', '/cai-dat', cd, tuyChon),
  },

  /** Cột bảng nhập hạng mục; lưu là ghi cả danh sách theo thứ tự */
  cotHangMuc: {
    ds: () => goi<CotHangMuc[]>('GET', '/cot-hang-muc'),
    luu: (ds: CotHangMuc[], tuyChon?: TuyChonGoi) => goi<CotHangMuc[]>('PUT', '/cot-hang-muc', ds, tuyChon),
  },

  khachHang: {
    ds: () => goi<KhachHang[]>('GET', '/khach-hang'),
    luu: (kh: KhachHang) => goi<KhachHang>('PUT', `/khach-hang/${ma(kh.id)}`, kh),
    xoa: (id: string) => goi<void>('DELETE', `/khach-hang/${ma(id)}`),
    soBaoGia: async (id: string) => (await goi<{ so: number }>('GET', `/khach-hang/${ma(id)}/so-bao-gia`)).so,
  },

  hangMuc: {
    ds: () => goi<HangMuc[]>('GET', '/hang-muc'),
    luu: (hm: HangMuc) => goi<HangMuc>('PUT', `/hang-muc/${ma(hm.id)}`, hm),
    xoa: (id: string) => goi<void>('DELETE', `/hang-muc/${ma(id)}`),
  },

  baoGia: {
    /** Danh sách tóm tắt (kèm tổng tiền), không có các dòng hạng mục */
    ds: () => goi<TomTatBaoGia[]>('GET', '/bao-gia'),
    lay: (id: string) => layHoacNull<BaoGia>(`/bao-gia/${ma(id)}`),
    /** Ghi cả báo giá; chưa có thì tạo, số trống thì máy chủ cấp. `chiCapNhat`: bỏ qua nếu đã bị xoá. */
    luu: (bg: BaoGia, tuyChon: TuyChonGoi & { chiCapNhat?: boolean } = {}) =>
      goi<BaoGia | null>('PUT', `/bao-gia/${ma(bg.id)}${tuyChon.chiCapNhat ? '?chiCapNhat=1' : ''}`, bg, tuyChon),
    xoa: (id: string) => goi<void>('DELETE', `/bao-gia/${ma(id)}`),
  },

  nghiemThu: {
    /** Danh sách tóm tắt; có `baoGiaId` thì chỉ lấy các biên bản lập từ báo giá đó */
    ds: (baoGiaId?: string) =>
      goi<TomTatNghiemThu[]>('GET', `/nghiem-thu${baoGiaId ? `?baoGiaId=${ma(baoGiaId)}` : ''}`),
    lay: (id: string) => layHoacNull<BienBanNghiemThu>(`/nghiem-thu/${ma(id)}`),
    luu: (nt: BienBanNghiemThu, tuyChon: TuyChonGoi & { chiCapNhat?: boolean } = {}) =>
      goi<BienBanNghiemThu | null>(
        'PUT',
        `/nghiem-thu/${ma(nt.id)}${tuyChon.chiCapNhat ? '?chiCapNhat=1' : ''}`,
        nt,
        tuyChon,
      ),
    xoa: (id: string) => goi<void>('DELETE', `/nghiem-thu/${ma(id)}`),
  },

  anh: {
    ds: (nghiemThuId: string) => goi<AnhDinhKem[]>('GET', `/nghiem-thu/${ma(nghiemThuId)}/anh`),
    them: (nghiemThuId: string, duLieu: string) =>
      goi<AnhDinhKem>('POST', `/nghiem-thu/${ma(nghiemThuId)}/anh`, { duLieu, ghiChu: '' }),
    suaGhiChu: (id: string, ghiChu: string) =>
      goi<void>('PATCH', `/anh/${ma(id)}`, { ghiChu }, { baoThayDoi: false }),
    xoa: (id: string) => goi<void>('DELETE', `/anh/${ma(id)}`),
  },

  /** Lưu file xuất vào thư mục trên máy chạy ứng dụng (THU_MUC_LUU_FILE trong .env) */
  file: {
    luu: (tenFile: string, duLieu: Blob) =>
      goi<{ tenFile: string; thuMuc: string }>('POST', `/luu-file?ten=${ma(tenFile)}`, duLieu, {
        baoThayDoi: false,
        thoiGianCho: CHO_LAU,
      }),
  },

  baoTri: {
    donNhapRong: () => goi<{ daXoa: number }>('POST', '/don-nhap-rong'),
    /** File sao lưu (JSON) nguyên dạng Blob — không đọc ra đối tượng rồi ghi lại */
    saoLuu: () => goi<Blob>('GET', '/sao-luu', undefined, { thoiGianCho: CHO_LAU, nhanFile: true }),
    /** Báo máy chủ đã tải xong file sao lưu (ghi thời điểm sao lưu gần nhất) */
    daTaiSaoLuu: () => goi<void>('POST', '/sao-luu/da-tai', undefined, { baoThayDoi: false }),
    khoiPhuc: (duLieu: unknown) =>
      goi<{ soBaoGia: number; soNghiemThu: number }>('POST', '/khoi-phuc', duLieu, { thoiGianCho: CHO_LAU }),
    napDuLieuMau: () => goi<void>('POST', '/du-lieu-mau'),
    xoaToanBo: () => goi<void>('DELETE', '/du-lieu'),
  },
};
