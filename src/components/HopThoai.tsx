import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { BieuTuong } from './BieuTuong';

/** Số hộp thoại đang mở (hộp xác nhận có thể mở chồng lên hộp khác) — chỉ mở khoá cuộn khi đóng hết. */
let soHopDangMo = 0;

/** Khung hộp thoại: toàn màn hình trên điện thoại, ở giữa trên máy tính. */
export function HopThoai({
  tieuDe,
  onDong,
  children,
  chanTrang,
}: {
  tieuDe: string;
  onDong: () => void;
  children: ReactNode;
  chanTrang?: ReactNode;
}) {
  useEffect(() => {
    const phim = (e: KeyboardEvent) => e.key === 'Escape' && onDong();
    document.addEventListener('keydown', phim);
    return () => document.removeEventListener('keydown', phim);
  }, [onDong]);

  // Trang cuộn bằng <html> (overflow-y: scroll) nên phải khoá ở <html>, khoá <body> không có tác dụng
  useEffect(() => {
    soHopDangMo++;
    document.documentElement.classList.add('khoa-cuon');
    return () => {
      if (--soHopDangMo === 0) document.documentElement.classList.remove('khoa-cuon');
    };
  }, []);

  return (
    <div className="nen-hop-thoai" onMouseDown={(e) => e.target === e.currentTarget && onDong()}>
      <div className="hop-thoai" role="dialog" aria-modal="true" aria-label={tieuDe}>
        <div className="hop-thoai-dau">
          <h2>{tieuDe}</h2>
          <button type="button" className="nut-bieu-tuong" onClick={onDong} aria-label="Đóng">
            <BieuTuong ten="dong" />
          </button>
        </div>
        <div className="hop-thoai-than">{children}</div>
        {chanTrang && <div className="hop-thoai-chan">{chanTrang}</div>}
      </div>
    </div>
  );
}

/* ---------- Hỏi xác nhận & thông báo ngắn (dùng chung toàn ứng dụng) ---------- */

interface YeuCauXacNhan {
  noiDung: string;
  nutDongY: string;
  nguyHiem: boolean;
  traLoi: (dongY: boolean) => void;
}

interface GiaoTiep {
  xacNhan: (noiDung: string, tuyChon?: { nutDongY?: string; nguyHiem?: boolean }) => Promise<boolean>;
  thongBao: (noiDung: string, loai?: 'thanhCong' | 'loi') => void;
}

const NguCanhGiaoTiep = createContext<GiaoTiep | null>(null);

export function NhaCungCapGiaoTiep({ children }: { children: ReactNode }) {
  const [yeuCau, setYeuCau] = useState<YeuCauXacNhan | null>(null);
  const [tin, setTin] = useState<{ noiDung: string; loai: string; ma: number } | null>(null);
  const hen = useRef<number>();

  const xacNhan = useCallback<GiaoTiep['xacNhan']>(
    (noiDung, tuyChon = {}) =>
      new Promise((resolve) =>
        setYeuCau({
          noiDung,
          nutDongY: tuyChon.nutDongY ?? 'Đồng ý',
          nguyHiem: tuyChon.nguyHiem ?? true,
          traLoi: (dongY) => {
            setYeuCau(null);
            resolve(dongY);
          },
        }),
      ),
    [],
  );

  const thongBao = useCallback<GiaoTiep['thongBao']>((noiDung, loai = 'thanhCong') => {
    window.clearTimeout(hen.current);
    setTin({ noiDung, loai, ma: Date.now() });
    hen.current = window.setTimeout(() => setTin(null), 3500);
  }, []);

  return (
    <NguCanhGiaoTiep.Provider value={{ xacNhan, thongBao }}>
      {children}
      {yeuCau && (
        <HopThoai
          tieuDe="Xác nhận"
          onDong={() => yeuCau.traLoi(false)}
          chanTrang={
            <div className="hang-nut">
              <button type="button" className="nut nut-phu" onClick={() => yeuCau.traLoi(false)}>
                Không
              </button>
              <button
                type="button"
                className={`nut ${yeuCau.nguyHiem ? 'nut-nguy-hiem' : 'nut-chinh'}`}
                onClick={() => yeuCau.traLoi(true)}
                autoFocus
              >
                {yeuCau.nutDongY}
              </button>
            </div>
          }
        >
          <p className="noi-dung-xac-nhan">{yeuCau.noiDung}</p>
        </HopThoai>
      )}
      {tin && (
        <div key={tin.ma} className={`thong-bao thong-bao-${tin.loai}`} role="status" onClick={() => setTin(null)}>
          {tin.noiDung}
        </div>
      )}
    </NguCanhGiaoTiep.Provider>
  );
}

export function useGiaoTiep(): GiaoTiep {
  const gt = useContext(NguCanhGiaoTiep);
  if (!gt) throw new Error('Thiếu NhaCungCapGiaoTiep');
  return gt;
}
