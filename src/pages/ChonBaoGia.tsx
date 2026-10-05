import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BieuTuong } from '../components/BieuTuong';
import { useGiaoTiep } from '../components/HopThoai';
import { NhanTrangThai, OTim, The, TrangSoan, Trong } from '../components/KhungTrang';
import { api } from '../db/api';
import { useTruyVan } from '../db/hooks';
import { NHAN_TRANG_THAI_BAO_GIA } from '../db/kieu';
import { taoNghiemThuTrong, taoNghiemThuTuBaoGia } from '../db/thaoTac';
import { dinhDangNgay } from '../lib/dinhDang';
import { khop } from '../lib/timKiem';

/** "+ Tạo nghiệm thu": chọn báo giá làm gốc, hoặc lập biên bản trống. */
export function ChonBaoGia() {
  const dieuHuong = useNavigate();
  const { thongBao } = useGiaoTiep();
  const [cauTim, setCauTim] = useState('');
  const [xemTatCa, setXemTatCa] = useState(false);
  const [dangTao, setDangTao] = useState(false);

  const ds = useTruyVan(async () => {
    const [bg, kh] = await Promise.all([api.baoGia.ds(), api.khachHang.ds()]);
    const ten = new Map(kh.map((k) => [k.id, k.tenCongTy]));
    return bg
      .filter((b) => b.trangThai !== 'huy')
      .map((b) => ({ ...b, tenKhach: (b.khachHangId && ten.get(b.khachHangId)) || '(Chưa chọn khách)' }));
  }, []);

  const loc = (ds ?? []).filter(
    (b) => (xemTatCa || b.trangThai === 'daChot') && khop(`${b.so} ${b.tenKhach} ${b.tieuDe}`, cauTim),
  );

  const tao = async (lam: () => Promise<string>, thongDiep?: string) => {
    if (dangTao) return;
    setDangTao(true);
    try {
      const id = await lam();
      if (thongDiep) thongBao(thongDiep);
      dieuHuong(`/nghiem-thu/${id}`, { replace: true });
    } catch (e) {
      thongBao((e as Error).message, 'loi');
      setDangTao(false);
    }
  };

  return (
    <TrangSoan tieuDe="Tạo biên bản nghiệm thu" quayVe={-1} hep>
      <The tieuDe="Chọn báo giá làm gốc" bieuTuong="vanBan">
        <p className="goi-y-nho">Bấm vào một báo giá — khách hàng và các hạng mục sẽ được sao chép sang biên bản mới.</p>
        <OTim value={cauTim} onChange={setCauTim} placeholder="Tìm theo tên khách hoặc số báo giá" />
        <label className={`o-tich ${xemTatCa ? 'dang-chon' : ''}`}>
          <input type="checkbox" checked={xemTatCa} onChange={(e) => setXemTatCa(e.target.checked)} />
          Hiện cả báo giá chưa chốt
        </label>
        {ds && loc.length === 0 && (
          <Trong bieuTuong="tim">{xemTatCa ? 'Không có báo giá phù hợp.' : 'Chưa có báo giá nào "Đã chốt".'}</Trong>
        )}
        <ul className="ds-don">
          {loc.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                className="dong-don"
                disabled={dangTao}
                onClick={() => tao(() => taoNghiemThuTuBaoGia(b.id), 'Đã sao chép hạng mục từ báo giá')}
              >
                <span className="dong-don-ten">
                  <span className="dong-don-so">
                    {b.so} <NhanTrangThai loai={b.trangThai} nhan={NHAN_TRANG_THAI_BAO_GIA[b.trangThai]} />
                  </span>
                  <strong>{b.tenKhach}</strong>
                  <small>
                    {[b.tieuDe, dinhDangNgay(b.ngay), `${b.soHangMuc} hạng mục`].filter(Boolean).join(' · ')}
                  </small>
                </span>
                <BieuTuong ten="muiTenPhai" co={22} />
              </button>
            </li>
          ))}
        </ul>
      </The>
      <button type="button" className="nut nut-vien nut-rong" disabled={dangTao} onClick={() => tao(taoNghiemThuTrong)}>
        <BieuTuong ten="them" /> Lập biên bản trống (không theo báo giá)
      </button>
    </TrangSoan>
  );
}
