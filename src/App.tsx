import { lazy, Suspense, useEffect, useLayoutEffect, useState, type ComponentType, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { KhongCoQuyen } from './components/ChungCms';
import { NhaCungCapGiaoTiep } from './components/HopThoai';
import { BoKhungMenu, DangTaiTrang } from './components/KhungTrang';
import { trangDau } from './components/menu';
import { api, kenhCanDangNhap, kenhMatKetNoi } from './db/api';
import { khoiPhucNhapTam } from './db/nhapTam';
import { NhaCungCapPhien, usePhien } from './db/phien';
import type { MaQuyen, NguoiDungPhien } from './db/quyen';
import { donNhapCuaMayNay } from './db/thaoTac';
import { DangNhap } from './pages/DangNhap';

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
const CongCuaToiTrang = trangLuoi(() => import('./modules/chamCong/CongCuaToiTrang'), 'CongCuaToiTrang');
const NhanVienTrang = trangLuoi(() => import('./modules/chamCong/NhanVienTrang'), 'NhanVienTrang');
const HoaDonSua = trangLuoi(() => import('./modules/hoaDon/HoaDonSua'), 'HoaDonSua');
const HoaDonTrang = trangLuoi(() => import('./modules/hoaDon/HoaDonTrang'), 'HoaDonTrang');
const NhaCungCapTrang = trangLuoi(() => import('./modules/hoaDon/NhaCungCapTrang'), 'NhaCungCapTrang');
const KhoTrang = trangLuoi(() => import('./modules/kho/KhoTrang'), 'KhoTrang');
const PhieuKhoSua = trangLuoi(() => import('./modules/kho/PhieuKhoSua'), 'PhieuKhoSua');
const PhieuKhoTrang = trangLuoi(() => import('./modules/kho/PhieuKhoTrang'), 'PhieuKhoTrang');
const TaiKhoanTrang = trangLuoi(() => import('./modules/taiKhoan/TaiKhoanTrang'), 'TaiKhoanTrang');
const ToiTrang = trangLuoi(() => import('./modules/taiKhoan/ToiTrang'), 'ToiTrang');
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

/** Chỉ hiện trang khi tài khoản có ít nhất một trong các quyền */
function Can({ quyen, children }: { quyen: MaQuyen[]; children: ReactNode }) {
  const { coQuyen } = usePhien();
  return coQuyen(...quyen) ? <>{children}</> : <KhongCoQuyen />;
}

/** "/" — Tổng quan nếu có quyền, không thì trang đầu tiên được dùng */
function TrangGoc() {
  const { nguoiDung, coQuyen } = usePhien();
  return coQuyen('tongQuan') ? <TongQuanTrang /> : <Navigate to={trangDau(nguoiDung)} replace />;
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

type TrangThaiPhien = 'dangKiemTra' | 'canDangNhap' | 'sanSang' | 'khongKetNoi';

/** Việc làm một lần khi vào ứng dụng (người lập báo giá): gửi lại nháp tạm chưa lưu, dọn chứng từ trống bị bỏ dở. */
async function chuanBi(nd: NguoiDungPhien) {
  if (!nd.quyen.includes('baoGia')) return;
  // Thứ tự quan trọng: gửi lại phần đã gõ nhưng chưa kịp lưu, rồi mới dọn nháp trống
  await khoiPhucNhapTam();
  await donNhapCuaMayNay();
  await api.baoTri.donNhapRong().catch(console.error);
}

/** HashRouter (#/...) để chạy được trên mọi nơi lưu trữ tĩnh mà không cần cấu hình máy chủ. */
export function App() {
  const [phien, setPhien] = useState<TrangThaiPhien>('dangKiemTra');
  const [nguoiDung, setNguoiDung] = useState<NguoiDungPhien | null>(null);

  const kiemTra = () => {
    setPhien('dangKiemTra');
    api.phien
      .kiemTra()
      .then(async ({ hopLe, nguoiDung: nd }) => {
        if (!hopLe || !nd) return setPhien('canDangNhap');
        setNguoiDung(nd);
        await chuanBi(nd);
        setPhien('sanSang');
      })
      .catch(() => setPhien('khongKetNoi'));
  };

  useEffect(() => {
    kiemTra();
    return kenhCanDangNhap.nghe(() => {
      setNguoiDung(null);
      setPhien('canDangNhap');
    });
  }, []);

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
  if (phien === 'canDangNhap' || !nguoiDung) return <DangNhap onXong={kiemTra} />;

  const bg: MaQuyen[] = ['baoGia'];
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <NhaCungCapPhien nguoiDung={nguoiDung}>
        <NhaCungCapGiaoTiep>
          <CuonLenDau />
          <ThanhMatKetNoi />
          <Suspense fallback={<DangTaiTrang />}>
            <Routes>
              <Route element={<BoKhungMenu />}>
                <Route path="/" element={<TrangGoc />} />
                <Route path="/toi" element={<ToiTrang />} />
  
                {/* Báo giá & nghiệm thu */}
                <Route path="/bao-gia" element={<Can quyen={bg}><TrangChu /></Can>} />
                <Route path="/khach-hang" element={<Can quyen={bg}><KhachHangTrang /></Can>} />
                <Route path="/hang-muc" element={<Can quyen={bg}><HangMucTrang /></Can>} />
  
                {/* Nhân sự */}
                <Route path="/cham-cong" element={<Can quyen={['chamCong']}><BangCongTrang /></Can>} />
                <Route path="/bang-luong" element={<Can quyen={['chamCong']}><BangLuongTrang /></Can>} />
                <Route path="/nhan-vien" element={<Can quyen={['chamCong']}><NhanVienTrang /></Can>} />
                <Route path="/cong-cua-toi" element={<CongCuaToiTrang />} />
  
                {/* Tài chính */}
                <Route path="/hoa-don" element={<Can quyen={['hoaDon']}><HoaDonTrang /></Can>} />
                <Route path="/nha-cung-cap" element={<Can quyen={['hoaDon', 'thuChi', 'kho']}><NhaCungCapTrang /></Can>} />
                <Route path="/thu-chi" element={<Can quyen={['thuChi']}><ThuChiTrang /></Can>} />
                <Route path="/cong-no" element={<Can quyen={['thuChi']}><CongNoTrang /></Can>} />
  
                {/* Kho */}
                <Route path="/kho" element={<Can quyen={['kho']}><KhoTrang /></Can>} />
                <Route path="/phieu-kho" element={<Can quyen={['kho']}><PhieuKhoTrang /></Can>} />
  
                {/* Website & hệ thống */}
                <Route path="/tai-khoan" element={<Can quyen={['taiKhoan']}><TaiKhoanTrang /></Can>} />
                <Route path="/cai-dat" element={<Can quyen={['caiDat']}><CaiDatTrang /></Can>} />
              </Route>
  
              {/* Các màn soạn thảo & in toàn màn hình (không menu) */}
              <Route path="/bao-gia/:id" element={<Can quyen={bg}><TheoId>{(id) => <BaoGiaSua key={id} />}</TheoId></Can>} />
              <Route path="/nghiem-thu/moi" element={<Can quyen={bg}><ChonBaoGia /></Can>} />
              <Route path="/nghiem-thu/:id" element={<Can quyen={bg}><TheoId>{(id) => <NghiemThuSua key={id} />}</TheoId></Can>} />
              <Route path="/in/:loai/:id" element={<Can quyen={bg}><XemTruoc /></Can>} />
              <Route path="/hoa-don/:id" element={<Can quyen={['hoaDon']}><TheoId>{(id) => <HoaDonSua key={id} />}</TheoId></Can>} />
              <Route path="/phieu-kho/:id" element={<Can quyen={['kho']}><TheoId>{(id) => <PhieuKhoSua key={id} />}</TheoId></Can>} />
  
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </NhaCungCapGiaoTiep>
      </NhaCungCapPhien>
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
