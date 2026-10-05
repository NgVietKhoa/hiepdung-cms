import { useCallback, useEffect, useRef, useState } from 'react';
import { LoiApi } from '../db/api';
import { ghiNhapTam, xoaNhapTam } from '../db/nhapTam';

export type TrangThaiLuu = 'daLuu' | 'dangLuu' | 'loi';

const DO_TRE = 400;
const THU_LAI_SAU = 5000;

/**
 * Tự động lưu: mỗi lần `giaTri` đổi thì hẹn lưu sau 0,4 giây.
 * - Lưu ngay khi ẩn trang / rời màn hình.
 * - Có `khoaTam`: ghi thêm bản nháp tạm đồng bộ vào localStorage, không mất dữ liệu kể cả khi
 *   tab bị đóng hay mất mạng trước lúc máy chủ lưu xong.
 * - Mất mạng / máy chủ lỗi: tự thử lại sau 5 giây. Máy chủ từ chối (vd. trùng số) thì báo lỗi, chờ người dùng sửa.
 */
export function useTuLuu<T>(
  giaTri: T | undefined,
  luu: (v: T) => Promise<unknown>,
  khoaTam?: string,
) {
  const [trangThai, setTrangThai] = useState<TrangThaiLuu>('daLuu');
  const [thongDiepLoi, setThongDiepLoi] = useState('');
  const choLuu = useRef<T | null>(null);
  const hen = useRef<number>();
  const lanDau = useRef(true);
  const conGan = useRef(true);
  const hamLuu = useRef(luu);
  hamLuu.current = luu;
  const khoa = useRef(khoaTam);
  khoa.current = khoaTam;
  /** Hàng đợi lưu: lần lưu sau chỉ bắt đầu khi lần trước xong — hai lệnh ghi song song có thể về máy chủ
   *  sai thứ tự (bản cũ ghi đè bản mới). Mỗi lượt lấy bản mới nhất lúc tới lượt, nên lượt thừa tự bỏ qua. */
  const hangDoi = useRef<Promise<void>>(Promise.resolve());

  const luuNgay = useCallback((): Promise<void> => {
    window.clearTimeout(hen.current);
    const luot = hangDoi.current.then(async () => {
      const v = choLuu.current;
      if (v === null) return;
      choLuu.current = null;
      try {
        await hamLuu.current(v);
        if (choLuu.current === null) {
          if (khoa.current) xoaNhapTam(khoa.current);
          if (conGan.current) {
            setTrangThai('daLuu');
            setThongDiepLoi('');
          }
        }
      } catch (e) {
        console.error(e);
        if (!conGan.current) return;
        setTrangThai('loi');
        setThongDiepLoi(e instanceof Error ? e.message : 'Không lưu được');
        const nenThuLai = !(e instanceof LoiApi) || e.trangThai === 0 || e.trangThai >= 500;
        // Chỉ thử lại nếu trong lúc chờ người dùng chưa sửa thêm gì
        if (nenThuLai && choLuu.current === null) {
          choLuu.current = v;
          hen.current = window.setTimeout(luuNgay, THU_LAI_SAU);
        }
      }
    });
    hangDoi.current = luot;
    return luot;
  }, []);

  useEffect(() => {
    if (giaTri === undefined) return;
    // Lần nạp dữ liệu đầu tiên không cần lưu lại
    if (lanDau.current) {
      lanDau.current = false;
      return;
    }
    choLuu.current = giaTri;
    if (khoa.current) ghiNhapTam(khoa.current, giaTri);
    setTrangThai('dangLuu');
    window.clearTimeout(hen.current);
    hen.current = window.setTimeout(luuNgay, DO_TRE);
  }, [giaTri, luuNgay]);

  useEffect(() => {
    conGan.current = true;
    const khiAn = () => {
      if (document.visibilityState === 'hidden') void luuNgay();
    };
    const khiDong = () => void luuNgay();
    document.addEventListener('visibilitychange', khiAn);
    window.addEventListener('pagehide', khiDong);
    return () => {
      document.removeEventListener('visibilitychange', khiAn);
      window.removeEventListener('pagehide', khiDong);
      void luuNgay();
      conGan.current = false;
    };
  }, [luuNgay]);

  return { trangThai, thongDiepLoi, luuNgay };
}
