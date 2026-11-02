import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BieuTuong } from '../components/BieuTuong';
import { NhanTrangThai, OTim, TrangChinh, Trong, useTaoMoi } from '../components/KhungTrang';
import { api } from '../db/api';
import { useCaiDat, useTruyVan } from '../db/hooks';
import { NHAN_TRANG_THAI_BAO_GIA, NHAN_TRANG_THAI_NGHIEM_THU } from '../db/kieu';
import { dinhDangNgay, dinhDangTien } from '../lib/dinhDang';
import { khop } from '../lib/timKiem';

type Loai = 'baoGia' | 'nghiemThu';
const SO_HIEN_THI = 30;

interface MucDanhSach {
  id: string;
  duongDan: string;
  duongDanIn: string;
  so: string;
  ngay: string;
  tenKhach: string;
  tieuDe: string;
  /** Tổng tiền máy chủ đã tính sẵn */
  tong: number;
  trangThai: string;
  nhanTrangThai: string;
}

export function TrangChu() {
  const tao = useTaoMoi();
  const cd = useCaiDat();
  const [loai, setLoai] = useState<Loai>('baoGia');
  const [cauTim, setCauTim] = useState('');
  const [locTrangThai, setLocTrangThai] = useState('tatCa');
  const [soHien, setSoHien] = useState(SO_HIEN_THI);

  const duLieu = useTruyVan(async () => {
    const [khach, baoGia, nghiemThu] = await Promise.all([
      api.khachHang.ds(),
      api.baoGia.ds(),
      api.nghiemThu.ds(),
    ]);
    const tenKhach = new Map(khach.map((k) => [k.id, k.tenCongTy]));
    const ten = (khachHangId: string | null) => (khachHangId && tenKhach.get(khachHangId)) || '(Chưa chọn khách)';
    const bg: MucDanhSach[] = baoGia.map((b) => ({
      ...b,
      duongDan: `/bao-gia/${b.id}`,
      duongDanIn: `/in/bao-gia/${b.id}`,
      tenKhach: ten(b.khachHangId),
      nhanTrangThai: NHAN_TRANG_THAI_BAO_GIA[b.trangThai],
    }));
    const nt: MucDanhSach[] = nghiemThu.map((n) => ({
      ...n,
      duongDan: `/nghiem-thu/${n.id}`,
      duongDanIn: `/in/nghiem-thu/${n.id}`,
      tenKhach: ten(n.khachHangId),
      nhanTrangThai: NHAN_TRANG_THAI_NGHIEM_THU[n.trangThai],
    }));
    return { bg, nt };
  }, []);

  const nhanTT: Record<string, string> = loai === 'baoGia' ? NHAN_TRANG_THAI_BAO_GIA : NHAN_TRANG_THAI_NGHIEM_THU;
  const tatCa = useMemo(() => (loai === 'baoGia' ? duLieu?.bg : duLieu?.nt) ?? [], [duLieu, loai]);

  /** Mỗi ô thống kê vừa cho xem số lượng + tổng tiền, vừa là nút lọc theo trạng thái */
  const thongKe = useMemo(
    () =>
      [['tatCa', 'Tất cả'], ...Object.entries(nhanTT)].map(([gt, nhan]) => {
        const ds = gt === 'tatCa' ? tatCa : tatCa.filter((m) => m.trangThai === gt);
        return { gt, nhan, so: ds.length, tong: ds.reduce((t, m) => t + m.tong, 0) };
      }),
    [tatCa, nhanTT],
  );

  const danhSach = useMemo(
    () =>
      tatCa.filter(
        (m) =>
          (locTrangThai === 'tatCa' || m.trangThai === locTrangThai) &&
          khop(`${m.so} ${m.tenKhach} ${m.tieuDe}`, cauTim),
      ),
    [tatCa, locTrangThai, cauTim],
  );

  const coDuLieu = !!(duLieu?.bg.length || duLieu?.nt.length);
  const canNhacSaoLuu =
    coDuLieu && (!cd.lanSaoLuuCuoi || Date.now() - cd.lanSaoLuuCuoi > 30 * 24 * 3600 * 1000);

  const doiLoai = (v: Loai) => {
    setLoai(v);
    setLocTrangThai('tatCa');
    setSoHien(SO_HIEN_THI);
  };

  return (
    <TrangChinh tieuDe="Báo giá & nghiệm thu" phuDe={cd.tenDonVi || undefined}>
      <div className="tao-nhanh">
        <button type="button" className="o-tao o-tao-bao-gia" onClick={tao.baoGia}>
          <span className="o-bieu-tuong">
            <BieuTuong ten="them" co={30} />
          </span>
          <span>
            <strong>Báo giá mới</strong>
            <small>Lập & gửi khách</small>
          </span>
        </button>
        <button type="button" className="o-tao o-tao-nghiem-thu" onClick={tao.nghiemThu}>
          <span className="o-bieu-tuong">
            <BieuTuong ten="them" co={30} />
          </span>
          <span>
            <strong>Nghiệm thu</strong>
            <small>Từ báo giá đã chốt</small>
          </span>
        </button>
      </div>

      {canNhacSaoLuu && (
        <Link to="/cai-dat#sao-luu" className="canh-bao-sao-luu">
          <BieuTuong ten="canhBao" />
          <span>Đã lâu chưa sao lưu dữ liệu. Bấm vào đây để sao lưu.</span>
          <BieuTuong ten="muiTenPhai" />
        </Link>
      )}

      <div className="tab-loai" role="tablist" aria-label="Loại chứng từ">
        {(
          [
            ['baoGia', 'Báo giá', duLieu?.bg.length],
            ['nghiemThu', 'Nghiệm thu', duLieu?.nt.length],
          ] as const
        ).map(([gt, nhan, so]) => (
          <button
            key={gt}
            type="button"
            role="tab"
            aria-selected={loai === gt}
            className={loai === gt ? 'dang-chon' : ''}
            onClick={() => doiLoai(gt)}
          >
            {nhan}
            <span className="dem">{so ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="luoi-thong-ke" role="radiogroup" aria-label="Lọc theo trạng thái">
        {thongKe.map((t) => (
          <button
            key={t.gt}
            type="button"
            role="radio"
            aria-checked={locTrangThai === t.gt}
            className={`o-thong-ke ${t.so > 0 ? 'co' : 'rong'} ${locTrangThai === t.gt ? 'dang-chon' : ''}`}
            onClick={() => {
              setLocTrangThai(t.gt);
              setSoHien(SO_HIEN_THI);
            }}
          >
            <span className="tk-nhan">{t.nhan}</span>
            <span className="tk-so">{t.so}</span>
            <span className="tk-tien">{dinhDangTien(t.tong)}</span>
          </button>
        ))}
      </div>

      <OTim value={cauTim} onChange={setCauTim} placeholder="Tìm theo tên khách, số chứng từ, tiêu đề…" />

      {!duLieu && <p className="dang-tai">Đang tải…</p>}

      {duLieu && danhSach.length === 0 && (
        <Trong
          bieuTuong={cauTim ? 'tim' : 'vanBan'}
          hanhDong={
            !cauTim &&
            locTrangThai === 'tatCa' && (
              <button type="button" className="nut nut-chinh" onClick={loai === 'baoGia' ? tao.baoGia : tao.nghiemThu}>
                <BieuTuong ten="them" /> {loai === 'baoGia' ? 'Tạo báo giá đầu tiên' : 'Tạo biên bản nghiệm thu'}
              </button>
            )
          }
        >
          {cauTim || locTrangThai !== 'tatCa'
            ? 'Không tìm thấy chứng từ phù hợp.'
            : loai === 'baoGia'
              ? 'Chưa có báo giá nào.'
              : 'Chưa có biên bản nghiệm thu nào.'}
        </Trong>
      )}

      {danhSach.length > 0 && (
        <div className="bang-ct">
          <div className="dau-bang-ct" aria-hidden="true">
            <span>Số</span>
            <span>Khách hàng / nội dung</span>
            <span>Ngày</span>
            <span className="so">{loai === 'baoGia' ? 'Tổng tiền' : 'Giá trị'}</span>
            <span>Trạng thái</span>
            <span />
          </div>
          <ul className="ds-ct">
            {danhSach.slice(0, soHien).map((m) => (
              <li key={m.id} className="dong-ct">
                <Link to={m.duongDan} className="dong-ct-mo">
                  <span className="ct-so">{m.so || '—'}</span>
                  <span className="ct-khach">
                    <strong>{m.tenKhach}</strong>
                    {m.tieuDe && <small>{m.tieuDe}</small>}
                  </span>
                  <span className="ct-ngay">{dinhDangNgay(m.ngay)}</span>
                  <span className="ct-tien">{dinhDangTien(m.tong)}</span>
                  <span className="ct-tt">
                    <NhanTrangThai loai={m.trangThai} nhan={m.nhanTrangThai} />
                  </span>
                </Link>
                <Link to={m.duongDanIn} className="nut-in-nhanh" aria-label={`Xem và in ${m.so}`} title="Xem & in / gửi Zalo">
                  <BieuTuong ten="in" co={22} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {danhSach.length > soHien && (
        <button type="button" className="nut nut-vien nut-rong xem-them" onClick={() => setSoHien((n) => n + SO_HIEN_THI)}>
          Xem thêm ({danhSach.length - soHien})
        </button>
      )}
    </TrangChinh>
  );
}
