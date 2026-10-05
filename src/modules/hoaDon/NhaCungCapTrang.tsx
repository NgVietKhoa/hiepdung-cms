import { useState } from 'react';
import { BieuTuong } from '../../components/BieuTuong';
import { HopThoai, useGiaoTiep } from '../../components/HopThoai';
import { OTim, TrangChinh, Trong } from '../../components/KhungTrang';
import { OChu } from '../../components/ONhap';
import { useTruyVan } from '../../db/hooks';
import { taoId } from '../../lib/id';
import { khop } from '../../lib/timKiem';
import { apiCms } from '../api';
import type { NhaCungCap } from './kieu';

export const nhaCungCapTrong = (tenCongTy = ''): NhaCungCap => ({
  id: taoId(),
  tenCongTy,
  diaChi: '',
  maSoThue: '',
  nguoiLienHe: '',
  soDienThoai: '',
  email: '',
  soTaiKhoan: '',
  nganHang: '',
  ghiChu: '',
  ngayTao: Date.now(),
});

export function NhaCungCapTrang() {
  const ds = useTruyVan(() => apiCms.hoaDon.dsNhaCungCap(), []);
  const [cauTim, setCauTim] = useState('');
  const [dangSua, setDangSua] = useState<{ ncc: NhaCungCap; moi: boolean } | null>(null);
  const loc = (ds ?? []).filter((n) => khop(`${n.tenCongTy} ${n.nguoiLienHe} ${n.soDienThoai} ${n.maSoThue}`, cauTim));

  return (
    <TrangChinh tieuDe="Nhà cung cấp" phuDe={ds ? `${ds.length} nhà cung cấp` : undefined}>
      <div className="thanh-cong-cu">
        <OTim value={cauTim} onChange={setCauTim} placeholder="Tìm tên, người liên hệ, số điện thoại, MST" />
        <button type="button" className="nut nut-chinh" onClick={() => setDangSua({ ncc: nhaCungCapTrong(), moi: true })}>
          <BieuTuong ten="them" /> Thêm nhà cung cấp
        </button>
      </div>
      {!ds && <p className="dang-tai">Đang tải…</p>}
      {ds && loc.length === 0 && <Trong bieuTuong="nhaMay">{cauTim ? 'Không tìm thấy.' : 'Chưa có nhà cung cấp nào.'}</Trong>}
      <ul className="luoi-the">
        {loc.map((n) => (
          <li key={n.id}>
            <button type="button" className="the-muc" onClick={() => setDangSua({ ncc: n, moi: false })}>
              <span className="chu-dai-dien" aria-hidden="true">
                <BieuTuong ten="nhaMay" co={22} />
              </span>
              <span className="the-muc-than">
                <strong>{n.tenCongTy}</strong>
                {(n.nguoiLienHe || n.soDienThoai) && <small>{[n.nguoiLienHe, n.soDienThoai].filter(Boolean).join(' · ')}</small>}
                {n.maSoThue && <small className="nhat">MST {n.maSoThue}</small>}
              </span>
              <BieuTuong ten="muiTenPhai" co={22} />
            </button>
          </li>
        ))}
      </ul>
      {dangSua && <HopThoaiNhaCungCap banDau={dangSua.ncc} moi={dangSua.moi} coNutXoa onDong={() => setDangSua(null)} />}
    </TrangChinh>
  );
}

export function HopThoaiNhaCungCap({
  banDau,
  moi,
  coNutXoa,
  onDong,
  onDaLuu,
}: {
  banDau: NhaCungCap;
  moi: boolean;
  coNutXoa?: boolean;
  onDong: () => void;
  onDaLuu?: (n: NhaCungCap) => void;
}) {
  const { xacNhan, thongBao } = useGiaoTiep();
  const [n, setN] = useState(banDau);
  const doi = (k: keyof NhaCungCap) => (v: string) => setN((x) => ({ ...x, [k]: v }));

  const luu = async () => {
    if (!n.tenCongTy.trim()) return thongBao('Nhập tên nhà cung cấp', 'loi');
    try {
      const kq = await apiCms.hoaDon.luuNhaCungCap(n);
      thongBao(moi ? 'Đã thêm nhà cung cấp' : 'Đã lưu thay đổi');
      onDaLuu?.(kq);
      onDong();
    } catch (e) {
      thongBao((e as Error).message, 'loi');
    }
  };
  const xoa = async () => {
    if (!(await xacNhan(`Xoá nhà cung cấp "${n.tenCongTy}"?\nHoá đơn, phiếu đã lập vẫn giữ lại.`, { nutDongY: 'Xoá' }))) return;
    await apiCms.hoaDon.xoaNhaCungCap(n.id);
    thongBao('Đã xoá nhà cung cấp');
    onDong();
  };

  return (
    <HopThoai
      tieuDe={moi ? 'Thêm nhà cung cấp' : 'Sửa nhà cung cấp'}
      onDong={onDong}
      chanTrang={
        <div className="hang-nut">
          {coNutXoa && !moi && (
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
      <OChu nhan="Tên nhà cung cấp *" value={n.tenCongTy} onChange={doi('tenCongTy')} autoFocus={moi} />
      <div className="luoi-2">
        <OChu nhan="Người liên hệ" value={n.nguoiLienHe} onChange={doi('nguoiLienHe')} />
        <OChu nhan="Số điện thoại" value={n.soDienThoai} onChange={doi('soDienThoai')} type="tel" inputMode="tel" />
      </div>
      <OChu nhan="Địa chỉ" value={n.diaChi} onChange={doi('diaChi')} nhieuDong />
      <div className="luoi-2">
        <OChu nhan="Mã số thuế" value={n.maSoThue} onChange={doi('maSoThue')} inputMode="numeric" />
        <OChu nhan="Email" value={n.email} onChange={doi('email')} type="email" inputMode="email" />
      </div>
      <div className="luoi-2">
        <OChu nhan="Số tài khoản" value={n.soTaiKhoan} onChange={doi('soTaiKhoan')} inputMode="numeric" />
        <OChu nhan="Ngân hàng" value={n.nganHang} onChange={doi('nganHang')} />
      </div>
      <OChu nhan="Ghi chú" value={n.ghiChu} onChange={doi('ghiChu')} nhieuDong />
    </HopThoai>
  );
}
