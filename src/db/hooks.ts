import { useEffect, useRef, useState, type DependencyList } from 'react';
import { api, kenhThayDoi } from './api';
import type { CaiDat, CotHangMuc } from './kieu';
import { CAI_DAT_TRONG } from './macDinh';

const boNhoDemTruyVan = new Map<string, unknown>();

function taoKhoaCache(ham: () => unknown, phuThuoc: DependencyList): string {
  try {
    return `${ham.toString()}:${JSON.stringify(phuThuoc)}`;
  } catch {
    return '';
  }
}

/**
 * Tải dữ liệu từ máy chủ và tự tải lại khi:
 *  - có thao tác ghi dữ liệu trong ứng dụng,
 *  - người dùng quay lại tab / mở lại ứng dụng (thấy thay đổi từ máy khác).
 * Khởi tạo từ cache RAM (nếu đã có) giúp chuyển trang mượt mà không chớp nháy.
 */
export function useTruyVan<T>(ham: () => Promise<T>, phuThuoc: DependencyList): T | undefined {
  const khoa = taoKhoaCache(ham, phuThuoc);
  const [ketQua, setKetQua] = useState<T | undefined>(() => (khoa ? (boNhoDemTruyVan.get(khoa) as T | undefined) : undefined));
  const hamMoiNhat = useRef(ham);
  hamMoiNhat.current = ham;

  useEffect(() => {
    let huy = false;
    let lanGoi = 0;
    const tai = () => {
      const lan = ++lanGoi;
      hamMoiNhat
        .current()
        .then((v) => {
          if (!huy && lan === lanGoi) {
            if (khoa) boNhoDemTruyVan.set(khoa, v);
            setKetQua(v);
          }
        })
        .catch((e) => console.error('Không tải được dữ liệu', e));
    };
    tai();
    const boNghe = kenhThayDoi.nghe(() => {
      boNhoDemTruyVan.clear();
      tai();
    });
    const khiQuayLai = () => {
      if (document.visibilityState === 'visible') {
        boNhoDemTruyVan.clear();
        tai();
      }
    };
    document.addEventListener('visibilitychange', khiQuayLai);
    return () => {
      huy = true;
      boNghe();
      document.removeEventListener('visibilitychange', khiQuayLai);
    };
  }, phuThuoc);

  return ketQua;
}

/**
 * Dữ liệu dùng chung toàn ứng dụng (Cài đặt, cột hạng mục): một bản trong RAM cho mọi màn hình.
 * Mỗi lần dữ liệu đổi chỉ gọi máy chủ MỘT lần (không phải mỗi màn hình đang dùng một lần),
 * và chỉ nghe kênh thay đổi khi đang có màn hình dùng.
 */
function taoKhoChung<T>(tai: () => Promise<T>) {
  let giaTri: T | undefined;
  let dangTai: Promise<void> | null = null;
  let boNghe: (() => void) | null = null;
  const cacHamNghe = new Set<(v: T) => void>();
  const nap = (v: T) => {
    giaTri = v;
    cacHamNghe.forEach((fn) => fn(v));
  };
  const taiLai = () =>
    (dangTai ??= tai()
      .then(nap)
      .catch(console.error)
      .finally(() => {
        dangTai = null;
      }));
  return {
    lay: () => giaTri,
    nap,
    nghe(fn: (v: T) => void) {
      cacHamNghe.add(fn);
      // Màn hình đầu tiên bắt đầu dùng: tải bản mới (trong lúc không ai nghe có thể đã bị đổi)
      if (!boNghe) {
        boNghe = kenhThayDoi.nghe(() => void taiLai());
        void taiLai();
      }
      return () => {
        cacHamNghe.delete(fn);
        if (cacHamNghe.size === 0 && boNghe) {
          boNghe();
          boNghe = null;
        }
      };
    },
  };
}

const khoCaiDat = taoKhoChung(() => api.caiDat.lay());

export function layCaiDatHienTai(): CaiDat | undefined {
  return khoCaiDat.lay();
}

/** Ghi Cài đặt vừa lưu vào bản dùng chung (các màn hình đang mở cập nhật ngay, không cần tải lại) */
export function napCaiDatCache(cd: CaiDat) {
  khoCaiDat.nap(cd);
}

/** Cài đặt hiện tại, tự cập nhật khi thay đổi. Khởi tạo từ cache RAM để chuyển trang tức thì không giật nháy layout. */
export function useCaiDat(): CaiDat {
  const [cd, setCd] = useState<CaiDat>(() => khoCaiDat.lay() ?? CAI_DAT_TRONG);
  useEffect(() => khoCaiDat.nghe(setCd), []);
  return cd;
}

const khoCotHangMuc = taoKhoChung(() => api.cotHangMuc.ds());

/** Ghi danh sách cột vừa lưu vào bản dùng chung */
export function napCotHangMucCache(ds: CotHangMuc[]) {
  khoCotHangMuc.nap(ds);
}

/** Cột bảng nhập hạng mục (dữ liệu trong DB, chỉnh trong Cài đặt); giữ cache trong RAM. */
export function useCotHangMuc(): CotHangMuc[] | undefined {
  const [ds, setDs] = useState<CotHangMuc[] | undefined>(khoCotHangMuc.lay);
  useEffect(() => khoCotHangMuc.nghe(setDs), []);
  return ds;
}
