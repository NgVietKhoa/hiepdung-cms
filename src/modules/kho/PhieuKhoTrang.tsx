import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BieuTuong } from '../../components/BieuTuong';
import { ChonThang } from '../../components/ChungCms';
import { TrangChinh, Trong } from '../../components/KhungTrang';
import { useTruyVan } from '../../db/hooks';
import { dinhDangNgay, dinhDangTien } from '../../lib/dinhDang';
import { laThang, tenThang, thangHienTai } from '../../lib/thang';
import { apiCms } from '../api';
import { NHAN_LOAI_PHIEU_KHO } from './kieu';

export function PhieuKhoTrang() {
  const [thamSo, setThamSo] = useSearchParams();
  const thang = laThang(thamSo.get('thang')) ? thamSo.get('thang')! : thangHienTai();
  const [loc, setLoc] = useState<'tatCa' | 'nhap' | 'xuat'>('tatCa');
  const ds = useTruyVan(() => apiCms.kho.dsPhieu({ thang }), [thang]);
  const hienThi = (ds ?? []).filter((p) => loc === 'tatCa' || p.loai === loc);

  return (
    <TrangChinh
      tieuDe="Phiếu nhập / xuất kho"
      phuDe={tenThang(thang)}
      phai={<ChonThang value={thang} onChange={(t) => setThamSo({ thang: t }, { replace: true })} />}
    >
      <div className="thanh-cong-cu">
        <div className="loc-chip" role="radiogroup" aria-label="Lọc loại phiếu">
          {(
            [
              ['tatCa', 'Tất cả'],
              ['nhap', 'Nhập kho'],
              ['xuat', 'Xuất kho'],
            ] as const
          ).map(([gt, nhan]) => (
            <button key={gt} type="button" role="radio" aria-checked={loc === gt} className={`chip ${loc === gt ? 'dang-chon' : ''}`} onClick={() => setLoc(gt)}>
              {nhan}
              <span className="dem">{(ds ?? []).filter((p) => gt === 'tatCa' || p.loai === gt).length}</span>
            </button>
          ))}
        </div>
        <div className="hang-nut">
          <Link to="/phieu-kho/moi?loai=xuat" className="nut nut-vien">
            <BieuTuong ten="xuat" /> Xuất kho
          </Link>
          <Link to="/phieu-kho/moi?loai=nhap" className="nut nut-chinh">
            <BieuTuong ten="nhap" /> Nhập kho
          </Link>
        </div>
      </div>
      {!ds && <p className="dang-tai">Đang tải…</p>}
      {ds && hienThi.length === 0 && <Trong bieuTuong="kho">Tháng này chưa có phiếu nào.</Trong>}
      {hienThi.length > 0 && (
        <ul className="ds-don">
          {hienThi.map((p) => (
            <li key={p.id}>
              <Link to={`/phieu-kho/${p.id}`} className="dong-don">
                <span className={`dau-phieu ${p.loai === 'nhap' ? 'thu' : 'chi'}`} aria-hidden="true">
                  <BieuTuong ten={p.loai === 'nhap' ? 'nhap' : 'xuat'} co={18} />
                </span>
                <span className="dong-don-ten">
                  <strong>
                    {p.soPhieu} · {NHAN_LOAI_PHIEU_KHO[p.loai]}
                  </strong>
                  <small>
                    {dinhDangNgay(p.ngay)} · {p.soDong} vật tư
                    {p.doiTuong && ` · ${p.doiTuong}`}
                    {p.nguoiGiaoNhan && ` · ${p.nguoiGiaoNhan}`}
                  </small>
                </span>
                {p.tongTien > 0 && <span className="dong-don-gia">{dinhDangTien(p.tongTien)}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </TrangChinh>
  );
}
