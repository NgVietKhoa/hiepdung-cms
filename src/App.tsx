import { lazy, Suspense, useEffect, useLayoutEffect, useState, type ComponentType } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { NhaCungCapGiaoTiep } from './components/HopThoai';
import { BoKhungMenu, DangTaiTrang } from './components/KhungTrang';
import { api, kenhMatKetNoi } from './db/api';
import { napCaiDatCache } from './db/hooks';
import { khoiPhucNhapTam } from './db/nhapTam';
import { donNhapCuaMayNay } from './db/thaoTac';

/*
 * Mỗi trang tách thành một file JS riêng: lần đầu vào ứng dụng chỉ tải phần cần để hiện trang đang mở.
 * Sau khi vào xong, các trang còn lại được tải ngầm (napTruocCacTrang) để chuyển trang vẫn tức thì.
 */
const cacHamNapTrang: (() => Promise<unknown>)[] = [];
function trangLuoi<K extends string>(nap: () => Promise<Record<K, ComponentType>>, ten: K) {
  cacHamNapTrang.push(nap);
  return lazy(() => nap().then((m) => ({ default: m[ten] })));
}
function napTruocCacTrang() {
  for (const nap of cacHamNapTrang) nap().catch(() => undefined);
}
const BangCongTrang = trangLuoi(() => import('./modules/chamCong/BangCongTrang'), 'BangCongTrang');
const BangLuongTrang = trangLuoi(() => import('./modules/chamCong/BangLuongTrang'), 'BangLuongTrang');
const NhanVienTrang = trangLuoi(() => import('./modules/chamCong/NhanVienTrang'), 'NhanVienTrang');
const HoaDonSua = trangLuoi(() => import('./modules/hoaDon/HoaDonSua'), 'HoaDonSua');
const HoaDonTrang = trangLuoi(() => import('./modules/hoaDon/HoaDonTrang'), 'HoaDonTrang');
const NhaCungCapTrang = trangLuoi(() => import('./modules/hoaDon/NhaCungCapTrang'), 'NhaCungCapTrang');
const CongNoTrang = trangLuoi(() => import('./modules/thuChi/CongNoTrang'), 'CongNoTrang');
const ThuChiTrang = trangLuoi(() => import('./modules/thuChi/ThuChiTrang'), 'ThuChiTrang');
const TongQuanTrang = trangLuoi(() => import('./modules/tongQuan/TongQuanTrang'), 'TongQuanTrang');
const BaoGiaSua = trangLuoi(() => import('./pages/BaoGiaSua'), 'BaoGiaSua');
const CaiDatTrang = trangLuoi(() => import('./pages/CaiDatTrang'), 'CaiDatTrang');
const ChonBaoGia = trangLuoi(() => import('./pages/ChonBaoGia'), 'ChonBaoGia');
const HangMucTrang = trangLuoi(() => import('./pages/HangMucTrang'), 'HangMucTrang');
const KhachHangTrang = trangLuoi(() => import('./pages/KhachHangTrang'), 'KhachHangTrang');
const NghiemThuSua = trangLuoi(() => import('./pages/NghiemThuSua'), 'NghiemThuSua');
const TrangChu = trangLuoi(() => import('./pages/TrangChu'), 'TrangChu');
const XemTruoc = trangLuoi(() => import('./pages/XemTruoc'), 'XemTruoc');

function CuonLenDau() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    if (window.scrollY > 0) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [pathname]);
  return null;
}

/** Tạo lại màn hình soạn thảo khi chuyển sang chứng từ khác (vd. sau "Nhân bản") để không lẫn trạng thái */
function TheoId({ children }: { children: (id: string) => JSX.Element }) {
  const { id = '' } = useParams();
  return children(id);
}

function ThanhMatKetNoi() {
  const [matKetNoi, setMatKetNoi] = useState(false);
  useEffect(() => kenhMatKetNoi.nghe(setMatKetNoi), []);
  if (!matKetNoi) return null;
  return (
    <div className="mat-ket-noi" role="alert">
      Mất kết nối máy chủ. Những gì đang nhập vẫn được giữ trên máy này và sẽ tự lưu khi có mạng lại.
    </div>
  );
}

type TrangThaiPhien = 'dangKiemTra' | 'sanSang' | 'khongKetNoi';

/** Việc làm một lần khi vào ứng dụng: gửi lại nháp tạm chưa lưu, dọn chứng từ trống bị bỏ dở. */
async function chuanBi() {
  // Thứ tự quan trọng: gửi lại phần đã gõ nhưng chưa kịp lưu, rồi mới dọn nháp trống
  await khoiPhucNhapTam();
  await donNhapCuaMayNay();
  await api.baoTri.donNhapRong().catch(console.error);
}

/** HashRouter (#/...) để chạy được trên mọi nơi lưu trữ tĩnh mà không cần cấu hình máy chủ. */
export function App() {
  const [phien, setPhien] = useState<TrangThaiPhien>('dangKiemTra');

  const kiemTra = () => {
    setPhien('dangKiemTra');
    api.caiDat
      .lay()
      .then(async (cd) => {
        napCaiDatCache(cd);
        await chuanBi();
        setPhien('sanSang');
      })
      .catch(() => setPhien('khongKetNoi'));
  };

  useEffect(kiemTra, []);

  // Tải ngầm mã các trang khác khi máy rảnh, sau khi trang đầu tiên đã hiện
  useEffect(() => {
    if (phien !== 'sanSang') return;
    const hen = window.setTimeout(napTruocCacTrang, 1500);
    return () => window.clearTimeout(hen);
  }, [phien]);

  if (phien === 'dangKiemTra') {
    return (
      <main className="man-don">
        <p className="dang-tai">
          <span className="vong-quay" /> Đang kết nối…
        </p>
      </main>
    );
  }
  if (phien === 'khongKetNoi') return <KhongKetNoi thuLai={kiemTra} />;
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NhaCungCapGiaoTiep>
          <CuonLenDau />
          <ThanhMatKetNoi />
          <Suspense fallback={<DangTaiTrang />}>
            <Routes>
              <Route element={<BoKhungMenu />}>
                <Route path="/" element={<TongQuanTrang />} />
  
                {/* Báo giá & nghiệm thu */}
                <Route path="/bao-gia" element={<TrangChu />} />
                <Route path="/khach-hang" element={<KhachHangTrang />} />
                <Route path="/hang-muc" element={<HangMucTrang />} />
  
                {/* Nhân sự */}
                <Route path="/cham-cong" element={<BangCongTrang />} />
                <Route path="/bang-luong" element={<BangLuongTrang />} />
                <Route path="/nhan-vien" element={<NhanVienTrang />} />
  
                {/* Tài chính */}
                <Route path="/hoa-don" element={<HoaDonTrang />} />
                <Route path="/nha-cung-cap" element={<NhaCungCapTrang />} />
                <Route path="/thu-chi" element={<ThuChiTrang />} />
                <Route path="/cong-no" element={<CongNoTrang />} />
  
                {/* Hệ thống */}
                <Route path="/cai-dat" element={<CaiDatTrang />} />
              </Route>
  
              {/* Các màn soạn thảo & in toàn màn hình (không menu) */}
              <Route path="/bao-gia/:id" element={<TheoId>{(id) => <BaoGiaSua key={id} />}</TheoId>} />
              <Route path="/nghiem-thu/moi" element={<ChonBaoGia />} />
              <Route path="/nghiem-thu/:id" element={<TheoId>{(id) => <NghiemThuSua key={id} />}</TheoId>} />
              <Route path="/in/:loai/:id" element={<XemTruoc />} />
              <Route path="/hoa-don/:id" element={<TheoId>{(id) => <HoaDonSua key={id} />}</TheoId>} />
  
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </NhaCungCapGiaoTiep>
    </HashRouter>
  );
}

function KhongKetNoi({ thuLai }: { thuLai: () => void }) {
  return (
    <main className="man-don">
      <div className="the the-man-don">
        <h1>Không kết nối được máy chủ</h1>
        <p>Kiểm tra mạng Wi-Fi / 4G, hoặc máy chủ của xưởng đã bật chưa.</p>
        <button type="button" className="nut nut-chinh nut-rong" onClick={thuLai}>
          Thử lại
        </button>
      </div>
    </main>
  );
}
