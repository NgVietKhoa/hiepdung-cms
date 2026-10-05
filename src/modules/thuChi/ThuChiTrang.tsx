import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BieuTuong } from '../../components/BieuTuong';
import { ChonThang, OSoLieu } from '../../components/ChungCms';
import { OTim, TrangChinh, Trong } from '../../components/KhungTrang';
import { useTruyVan } from '../../db/hooks';
import { dinhDangNgay, dinhDangTien, homNayISO } from '../../lib/dinhDang';
import { laThang, tenThang, thangHienTai } from '../../lib/thang';
import { khop } from '../../lib/timKiem';
import { apiCms } from '../api';
import { HopThoaiPhieu, phieuMoi } from './HopThoaiPhieu';
import { NHAN_HINH_THUC, type PhieuThuChi } from './kieu';

type Loc = 'tatCa' | 'thu' | 'chi';

export function ThuChiTrang() {
  const [thamSo, setThamSo] = useSearchParams();
  const thang = laThang(thamSo.get('thang')) ? thamSo.get('thang')! : thangHienTai();
  const [loc, setLoc] = useState<Loc>('tatCa');
  const [cauTim, setCauTim] = useState('');
  const [phieu, setPhieu] = useState<{ p: PhieuThuChi; moi: boolean } | null>(null);

  const ds = useTruyVan(() => apiCms.thuChi.ds({ thang }), [thang]);
  const quy = useTruyVan(() => apiCms.thuChi.soQuy(thang), [thang]);
  const hienThi = useMemo(
    () => (ds ?? []).filter((p) => (loc === 'tatCa' || p.loai === loc) && khop(`${p.soPhieu} ${p.danhMuc} ${p.nguoiNopNhan} ${p.noiDung}`, cauTim)),
    [ds, loc, cauTim],
  );

  return (
    <TrangChinh
      tieuDe="Thu chi"
      phuDe={`Sổ quỹ ${tenThang(thang).toLowerCase()}`}
      phai={<ChonThang value={thang} onChange={(t) => setThamSo({ thang: t }, { replace: true })} />}
    >
      {quy && (
        <div className="luoi-so-lieu">
          <OSoLieu nhan="Tồn đầu tháng" giaTri={dinhDangTien(quy.tonDau.tong)} bieuTuong="tien" phu={`TM ${dinhDangTien(quy.tonDau.tienMat)} · CK ${dinhDangTien(quy.tonDau.chuyenKhoan)}`} />
          <OSoLieu nhan="Thu trong tháng" giaTri={dinhDangTien(quy.thu.tong)} bieuTuong="nhap" onClick={() => setLoc('thu')} />
          <OSoLieu nhan="Chi trong tháng" giaTri={dinhDangTien(quy.chi.tong)} bieuTuong="xuat" onClick={() => setLoc('chi')} />
          <OSoLieu
            nhan="Tồn cuối tháng"
            giaTri={dinhDangTien(quy.tonCuoi.tong)}
            bieuTuong="tien"
            loai={quy.tonCuoi.tong < 0 ? 'xau' : undefined}
            phu={`Tiền mặt ${dinhDangTien(quy.tonCuoi.tienMat)} · TK ${dinhDangTien(quy.tonCuoi.chuyenKhoan)}`}
          />
        </div>
      )}

      <div className="thanh-cong-cu">
        <OTim value={cauTim} onChange={setCauTim} placeholder="Tìm số phiếu, danh mục, người nộp / nhận, nội dung" />
        <div className="hang-nut">
          <button type="button" className="nut nut-vien" onClick={() => setPhieu({ moi: true, p: phieuMoi('chi', { ngay: ngayMacDinh(thang) }) })}>
            <BieuTuong ten="xuat" /> Phiếu chi
          </button>
          <button type="button" className="nut nut-chinh" onClick={() => setPhieu({ moi: true, p: phieuMoi('thu', { ngay: ngayMacDinh(thang) }) })}>
            <BieuTuong ten="nhap" /> Phiếu thu
          </button>
        </div>
      </div>
      <div className="loc-chip" role="radiogroup" aria-label="Lọc loại phiếu">
        {(
          [
            ['tatCa', 'Tất cả'],
            ['thu', 'Phiếu thu'],
            ['chi', 'Phiếu chi'],
          ] as const
        ).map(([gt, nhan]) => (
          <button key={gt} type="button" role="radio" aria-checked={loc === gt} className={`chip ${loc === gt ? 'dang-chon' : ''}`} onClick={() => setLoc(gt)}>
            {nhan}
            <span className="dem">{(ds ?? []).filter((p) => gt === 'tatCa' || p.loai === gt).length}</span>
          </button>
        ))}
      </div>

      {!ds && <p className="dang-tai">Đang tải…</p>}
      {ds && hienThi.length === 0 && <Trong bieuTuong="tien">{cauTim ? 'Không tìm thấy phiếu.' : 'Tháng này chưa có phiếu nào.'}</Trong>}
      {hienThi.length > 0 && (
        <ul className="ds-don">
          {hienThi.map((p) => (
            <li key={p.id}>
              <button type="button" className="dong-don" onClick={() => setPhieu({ p, moi: false })}>
                <span className={`dau-phieu ${p.loai}`} aria-hidden="true">
                  <BieuTuong ten={p.loai === 'thu' ? 'nhap' : 'xuat'} co={18} />
                </span>
                <span className="dong-don-ten">
                  <strong>{p.danhMuc || p.noiDung || (p.loai === 'thu' ? 'Thu' : 'Chi')}</strong>
                  <small>
                    {p.soPhieu} · {dinhDangNgay(p.ngay)} · {NHAN_HINH_THUC[p.hinhThuc]}
                    {p.nguoiNopNhan && ` · ${p.nguoiNopNhan}`}
                    {p.truVaoLuong && ' · trừ lương'}
                  </small>
                </span>
                <span className={`dong-don-gia tien-${p.loai}`}>
                  {p.loai === 'thu' ? '+' : '−'}
                  {dinhDangTien(p.soTien)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {phieu && <HopThoaiPhieu banDau={phieu.p} moi={phieu.moi} onDong={() => setPhieu(null)} />}
    </TrangChinh>
  );
}

/** Phiếu mới: ngày hôm nay nếu đang xem tháng này, không thì ngày đầu tháng đang xem */
function ngayMacDinh(thang: string) {
  return thang === thangHienTai() ? homNayISO() : `${thang}-01`;
}
