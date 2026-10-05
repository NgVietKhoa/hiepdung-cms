import { useState } from 'react';
import { BieuTuong } from '../components/BieuTuong';
import { HopThoaiKhachHang } from '../components/KhachHangForm';
import { OTim, TrangChinh, Trong } from '../components/KhungTrang';
import { api } from '../db/api';
import { useTruyVan } from '../db/hooks';
import type { KhachHang } from '../db/kieu';
import { khop } from '../lib/timKiem';

/** Hai chữ cái đầu của hai từ cuối tên (vd. "Cơ khí Minh Phát" → "MP") */
const chuDaiDien = (ten: string) =>
  ten
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((t) => t[0] ?? '')
    .join('')
    .toUpperCase() || '?';

export function KhachHangTrang() {
  const ds = useTruyVan(() => api.khachHang.ds(), []);
  const [cauTim, setCauTim] = useState('');
  const [dangSua, setDangSua] = useState<KhachHang | 'moi' | null>(null);

  const loc = (ds ?? []).filter((k) =>
    khop(`${k.tenCongTy} ${k.nguoiLienHe} ${k.soDienThoai} ${k.diaChi} ${k.maSoThue}`, cauTim),
  );

  return (
    <TrangChinh tieuDe="Khách hàng" phuDe={ds ? `${ds.length} khách hàng` : undefined}>
      <div className="thanh-cong-cu">
        <OTim value={cauTim} onChange={setCauTim} placeholder="Tìm tên, người liên hệ, số điện thoại" />
        <button type="button" className="nut nut-chinh" onClick={() => setDangSua('moi')}>
          <BieuTuong ten="them" /> Thêm khách hàng
        </button>
      </div>

      {!ds && <p className="dang-tai">Đang tải…</p>}
      {ds && loc.length === 0 && (
        <Trong bieuTuong={cauTim ? 'tim' : 'nguoi'}>{cauTim ? 'Không tìm thấy khách hàng.' : 'Chưa có khách hàng nào.'}</Trong>
      )}

      <ul className="luoi-the">
        {loc.map((k) => (
          <li key={k.id}>
            <button type="button" className="the-muc" onClick={() => setDangSua(k)}>
              <span className="chu-dai-dien" aria-hidden="true">
                {chuDaiDien(k.tenCongTy)}
              </span>
              <span className="the-muc-than">
                <strong>{k.tenCongTy}</strong>
                {(k.nguoiLienHe || k.chucVu) && <small>{[k.nguoiLienHe, k.chucVu].filter(Boolean).join(' · ')}</small>}
                {k.soDienThoai && (
                  <small className="co-bieu-tuong">
                    <BieuTuong ten="dienThoai" co={16} /> {k.soDienThoai}
                  </small>
                )}
                {k.diaChi && <small className="nhat">{k.diaChi}</small>}
              </span>
              <BieuTuong ten="muiTenPhai" co={22} />
            </button>
          </li>
        ))}
      </ul>
      {dangSua && (
        <HopThoaiKhachHang
          khachHang={dangSua === 'moi' ? undefined : dangSua}
          coNutXoa
          onDong={() => setDangSua(null)}
        />
      )}
    </TrangChinh>
  );
}
