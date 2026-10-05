import { useState } from 'react';
import { BieuTuong } from '../../components/BieuTuong';
import { HopThoai, useGiaoTiep } from '../../components/HopThoai';
import { NhanTrangThai, OTim, TrangChinh, Trong } from '../../components/KhungTrang';
import { OChu, ONgay, OTien } from '../../components/ONhap';
import { useTruyVan } from '../../db/hooks';
import { dinhDangTien } from '../../lib/dinhDang';
import { taoId } from '../../lib/id';
import { khop } from '../../lib/timKiem';
import { apiCms } from '../api';
import type { NhanVien } from './kieu';

const nhanVienTrong = (): NhanVien => ({
  id: taoId(),
  maNhanVien: '',
  hoTen: '',
  chucVu: '',
  soDienThoai: '',
  cccd: '',
  diaChi: '',
  ngayVaoLam: '',
  luongNgay: 0,
  luongGioTangCa: 0,
  phuCapThang: 0,
  soTaiKhoan: '',
  nganHang: '',
  dangLam: true,
  ghiChu: '',
  thuTu: 0,
});

export function NhanVienTrang() {
  const ds = useTruyVan(() => apiCms.chamCong.dsNhanVien(), []);
  const [cauTim, setCauTim] = useState('');
  const [hienNghi, setHienNghi] = useState(false);
  const [dangSua, setDangSua] = useState<{ nv: NhanVien; moi: boolean } | null>(null);
  const { thongBao } = useGiaoTiep();

  const loc = (ds ?? []).filter((n) => (hienNghi || n.dangLam) && khop(`${n.hoTen} ${n.maNhanVien} ${n.chucVu} ${n.soDienThoai}`, cauTim));
  const soNghi = (ds ?? []).filter((n) => !n.dangLam).length;

  /** Đổi chỗ với người kề trên / dưới — thứ tự này là thứ tự trên bảng chấm công */
  const doiCho = async (i: number, huong: -1 | 1) => {
    const danhSach = [...(ds ?? [])];
    const a = danhSach.indexOf(loc[i]);
    const b = danhSach.indexOf(loc[i + huong]);
    if (a < 0 || b < 0) return;
    [danhSach[a], danhSach[b]] = [danhSach[b], danhSach[a]];
    try {
      await apiCms.chamCong.thuTuNhanVien(danhSach.map((n) => n.id));
    } catch (e) {
      thongBao((e as Error).message, 'loi');
    }
  };

  return (
    <TrangChinh tieuDe="Nhân viên" phuDe={ds ? `${ds.length - soNghi} người đang làm` : undefined}>
      <div className="thanh-cong-cu">
        <OTim value={cauTim} onChange={setCauTim} placeholder="Tìm tên, mã, chức vụ, số điện thoại" />
        <button type="button" className="nut nut-chinh" onClick={() => setDangSua({ nv: nhanVienTrong(), moi: true })}>
          <BieuTuong ten="them" /> Thêm nhân viên
        </button>
      </div>
      {soNghi > 0 && (
        <label className={`o-tich gon ${hienNghi ? 'dang-chon' : ''}`}>
          <input type="checkbox" checked={hienNghi} onChange={(e) => setHienNghi(e.target.checked)} />
          Hiện cả người đã nghỉ việc ({soNghi})
        </label>
      )}
      {!ds && <p className="dang-tai">Đang tải…</p>}
      {ds && loc.length === 0 && <Trong bieuTuong="nguoi">{cauTim ? 'Không tìm thấy nhân viên.' : 'Chưa có nhân viên nào.'}</Trong>}
      {loc.length > 0 && (
        <ul className="ds-don">
          {loc.map((n, i) => (
            <li key={n.id} className="dong-co-sap-xep">
              <button type="button" className="dong-don" onClick={() => setDangSua({ nv: n, moi: false })}>
                <span className="dong-don-ten">
                  <strong>
                    {n.hoTen} {n.maNhanVien && <small>· {n.maNhanVien}</small>}
                  </strong>
                  <small>{[n.chucVu, n.soDienThoai].filter(Boolean).join(' · ') || '—'}</small>
                </span>
                {!n.dangLam && <NhanTrangThai loai="huy" nhan="Đã nghỉ" />}
                <span className="dong-don-gia">
                  {dinhDangTien(n.luongNgay)}
                  <small>/công</small>
                </span>
              </button>
              {!cauTim && (
                <span className="nut-sap-xep">
                  <button type="button" className="nut-bieu-tuong" disabled={i === 0} onClick={() => doiCho(i, -1)} aria-label={`Đưa ${n.hoTen} lên`}>
                    <BieuTuong ten="len" co={18} />
                  </button>
                  <button type="button" className="nut-bieu-tuong" disabled={i === loc.length - 1} onClick={() => doiCho(i, 1)} aria-label={`Đưa ${n.hoTen} xuống`}>
                    <BieuTuong ten="muiTenXuong" co={18} />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {dangSua && <HopThoaiNhanVien banDau={dangSua.nv} moi={dangSua.moi} onDong={() => setDangSua(null)} />}
    </TrangChinh>
  );
}

function HopThoaiNhanVien({ banDau, moi, onDong }: { banDau: NhanVien; moi: boolean; onDong: () => void }) {
  const { xacNhan, thongBao } = useGiaoTiep();
  const [nv, setNv] = useState(banDau);
  const doi = <K extends keyof NhanVien>(k: K) => (v: NhanVien[K]) => setNv((x) => ({ ...x, [k]: v }));

  const luu = async () => {
    if (!nv.hoTen.trim()) return thongBao('Nhập họ tên nhân viên', 'loi');
    try {
      await apiCms.chamCong.luuNhanVien(nv);
      thongBao(moi ? 'Đã thêm nhân viên' : 'Đã lưu thay đổi');
      onDong();
    } catch (e) {
      thongBao((e as Error).message, 'loi');
    }
  };
  const xoa = async () => {
    if (!(await xacNhan(`Xoá nhân viên "${nv.hoTen}"?`, { nutDongY: 'Xoá' }))) return;
    try {
      await apiCms.chamCong.xoaNhanVien(nv.id);
      thongBao('Đã xoá nhân viên');
      onDong();
    } catch (e) {
      thongBao((e as Error).message, 'loi');
    }
  };

  return (
    <HopThoai
      tieuDe={moi ? 'Thêm nhân viên' : 'Sửa nhân viên'}
      onDong={onDong}
      chanTrang={
        <div className="hang-nut">
          {!moi && (
            <button type="button" className="nut nut-vien-do" onClick={xoa}>
              Xoá
            </button>
          )}
          <button type="button" className="nut nut-chinh" onClick={luu}>
            <BieuTuong ten="luu" /> Lưu
          </button>
        </div>
      }
    >
      <OChu nhan="Họ tên *" value={nv.hoTen} onChange={doi('hoTen')} autoFocus={moi} />
      <div className="luoi-2">
        <OChu nhan="Mã nhân viên" value={nv.maNhanVien} onChange={doi('maNhanVien')} />
        <OChu nhan="Chức vụ / nghề" value={nv.chucVu} onChange={doi('chucVu')} placeholder="vd: Thợ hàn" />
      </div>
      <div className="luoi-2">
        <OChu nhan="Số điện thoại" value={nv.soDienThoai} onChange={doi('soDienThoai')} type="tel" inputMode="tel" />
        <ONgay nhan="Ngày vào làm" value={nv.ngayVaoLam} onChange={doi('ngayVaoLam')} />
      </div>
      <fieldset className="chon-thong-tin">
        <legend className="nhan">Lương công nhật</legend>
        <div className="luoi-2">
          <OTien nhan="Lương một công" value={nv.luongNgay} onChange={doi('luongNgay')} />
          <OTien nhan="Tiền một giờ tăng ca" value={nv.luongGioTangCa} onChange={doi('luongGioTangCa')} />
        </div>
        <OTien nhan="Phụ cấp cố định mỗi tháng" value={nv.phuCapThang} onChange={doi('phuCapThang')} />
      </fieldset>
      <div className="luoi-2">
        <OChu nhan="Số tài khoản" value={nv.soTaiKhoan} onChange={doi('soTaiKhoan')} inputMode="numeric" />
        <OChu nhan="Ngân hàng" value={nv.nganHang} onChange={doi('nganHang')} />
      </div>
      <OChu nhan="CCCD" value={nv.cccd} onChange={doi('cccd')} inputMode="numeric" />
      <OChu nhan="Địa chỉ" value={nv.diaChi} onChange={doi('diaChi')} />
      <OChu nhan="Ghi chú" value={nv.ghiChu} onChange={doi('ghiChu')} nhieuDong />
      <label className={`o-tich ${!nv.dangLam ? 'dang-chon' : ''}`}>
        <input type="checkbox" checked={!nv.dangLam} onChange={(e) => doi('dangLam')(!e.target.checked)} />
        Đã nghỉ việc (không hiện trên bảng công tháng mới)
      </label>
    </HopThoai>
  );
}
