import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BieuTuong } from '../../components/BieuTuong';
import { BangCuon, ChonThang, OSoLieu } from '../../components/ChungCms';
import { useGiaoTiep } from '../../components/HopThoai';
import { TrangChinh, Trong } from '../../components/KhungTrang';
import { useCaiDat, useTruyVan } from '../../db/hooks';
import { dinhDangSoLuong, dinhDangTien, homNayISO } from '../../lib/dinhDang';
import { laThang, soNgayTrongThang, tenThang, thangHienTai } from '../../lib/thang';
import { apiCms } from '../api';
import { HopThoaiPhieu, phieuMoi } from '../thuChi/HopThoaiPhieu';
import type { PhieuThuChi } from '../thuChi/kieu';
import { xuatBangLuongExcel } from './xuatExcel';

export function BangLuongTrang() {
  const cd = useCaiDat();
  const { thongBao } = useGiaoTiep();
  const [thamSo, setThamSo] = useSearchParams();
  const thang = laThang(thamSo.get('thang')) ? thamSo.get('thang')! : thangHienTai();
  const setThang = (t: string) => setThamSo({ thang: t }, { replace: true });
  const ds = useTruyVan(() => apiCms.chamCong.bangLuong(thang), [thang]);
  const [phieu, setPhieu] = useState<{ p: PhieuThuChi; moi: boolean } | null>(null);
  const tamUng = useTruyVan(() => apiCms.chamCong.tamUng(thang), [thang]);

  const tong = (ds ?? []).reduce(
    (t, l) => ({ cong: t.cong + l.soCong, tien: t.tien + l.tienCong + l.tienTangCa + l.phuCap, tamUng: t.tamUng + l.tamUng, thucLinh: t.thucLinh + l.thucLinh }),
    { cong: 0, tien: 0, tamUng: 0, thucLinh: 0 },
  );

  /** Ngày mặc định của phiếu tạm ứng: hôm nay nếu đang xem tháng này, không thì ngày cuối tháng đang xem */
  const ngayPhieu = () => (homNayISO().startsWith(thang) ? homNayISO() : `${thang}-${soNgayTrongThang(thang)}`);

  return (
    <TrangChinh tieuDe="Bảng lương" phuDe={`${tenThang(thang)} · lương công nhật`} phai={<ChonThang value={thang} onChange={setThang} />}>
      <div className="luoi-so-lieu">
        <OSoLieu nhan="Tổng số công" giaTri={dinhDangSoLuong(tong.cong)} bieuTuong="lich" />
        <OSoLieu nhan="Lương + tăng ca + phụ cấp" giaTri={dinhDangTien(tong.tien)} bieuTuong="tien" />
        <OSoLieu nhan="Đã tạm ứng" giaTri={dinhDangTien(tong.tamUng)} bieuTuong="xuat" />
        <OSoLieu nhan="Còn phải trả" giaTri={dinhDangTien(tong.thucLinh)} bieuTuong="tien" />
      </div>
      <div className="hang-nut-nho cach-duoi">
        <Link to="/cham-cong" className="nut-nho">
          <BieuTuong ten="lich" co={18} /> Bảng chấm công
        </Link>
        <button
          type="button"
          className="nut-nho"
          onClick={() => setPhieu({ moi: true, p: phieuMoi('chi', { ngay: ngayPhieu(), truVaoLuong: true, danhMuc: 'Tạm ứng lương' }) })}
        >
          <BieuTuong ten="them" co={18} /> Tạm ứng
        </button>
        <button
          type="button"
          className="nut-nho"
          disabled={!ds?.length}
          onClick={() => ds && xuatBangLuongExcel(thang, ds, cd).catch((e) => thongBao((e as Error).message, 'loi'))}
        >
          <BieuTuong ten="tai" co={18} /> Excel
        </button>
      </div>

      {!ds && <p className="dang-tai">Đang tải…</p>}
      {ds && ds.length === 0 && <Trong bieuTuong="nguoi">Tháng này chưa có nhân viên nào.</Trong>}
      {ds && ds.length > 0 && (
        <BangCuon>
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th className="so">Công</th>
              <th className="so">Tiền công</th>
              <th className="so">TC (giờ)</th>
              <th className="so">Tiền TC</th>
              <th className="so">Phụ cấp</th>
              <th className="so">Tạm ứng</th>
              <th className="so">Thực lĩnh</th>
            </tr>
          </thead>
          <tbody>
            {ds.map((l) => (
              <tr key={l.nhanVienId}>
                <td>
                  <strong>{l.hoTen}</strong>
                  <small className="khoi">
                    {dinhDangTien(l.luongNgay)}/công{l.luongGioTangCa ? ` · ${dinhDangTien(l.luongGioTangCa)}/giờ TC` : ''}
                  </small>
                </td>
                <td className="so">{dinhDangSoLuong(l.soCong)}</td>
                <td className="so">{dinhDangTien(l.tienCong, false)}</td>
                <td className="so">{dinhDangSoLuong(l.gioTangCa)}</td>
                <td className="so">{dinhDangTien(l.tienTangCa, false)}</td>
                <td className="so">{dinhDangTien(l.phuCap, false)}</td>
                <td className="so">
                  <button
                    type="button"
                    className="lien-ket-so"
                    title="Thêm phiếu tạm ứng"
                    onClick={() => setPhieu({ moi: true, p: phieuMoi('chi', { ngay: ngayPhieu(), nhanVienId: l.nhanVienId, truVaoLuong: true, danhMuc: 'Tạm ứng lương', nguoiNopNhan: l.hoTen }) })}
                  >
                    {l.tamUng ? dinhDangTien(l.tamUng, false) : '+'}
                  </button>
                </td>
                <td className="so dam">{dinhDangTien(l.thucLinh, false)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th>Tổng</th>
              <th className="so">{dinhDangSoLuong(tong.cong)}</th>
              <th className="so">{dinhDangTien(ds.reduce((s, l) => s + l.tienCong, 0), false)}</th>
              <th className="so">{dinhDangSoLuong(ds.reduce((s, l) => s + l.gioTangCa, 0))}</th>
              <th className="so">{dinhDangTien(ds.reduce((s, l) => s + l.tienTangCa, 0), false)}</th>
              <th className="so">{dinhDangTien(ds.reduce((s, l) => s + l.phuCap, 0), false)}</th>
              <th className="so">{dinhDangTien(tong.tamUng, false)}</th>
              <th className="so">{dinhDangTien(tong.thucLinh, false)}</th>
            </tr>
          </tfoot>
        </BangCuon>
      )}

      {!!tamUng?.length && (
        <section className="the cach-tren">
          <div className="the-dau">
            <div className="the-ten">
              <h2>Phiếu tạm ứng trong tháng</h2>
            </div>
          </div>
          <ul className="ds-don">
            {tamUng.map((p) => (
              <li key={p.id}>
                <button type="button" className="dong-don" onClick={() => setPhieu({ p, moi: false })}>
                  <span className="dong-don-ten">
                    <strong>{(ds ?? []).find((l) => l.nhanVienId === p.nhanVienId)?.hoTen ?? p.nguoiNopNhan}</strong>
                    <small>
                      {p.soPhieu} · {p.ngay.split('-').reverse().join('/')} {p.noiDung && `· ${p.noiDung}`}
                    </small>
                  </span>
                  <span className="dong-don-gia">{dinhDangTien(p.soTien)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="goi-y-nho cach-tren">
        Thực lĩnh = số công × lương một công + giờ tăng ca × tiền một giờ + phụ cấp tháng − tạm ứng. Tạm ứng là phiếu chi có đánh dấu “trừ vào lương”.
      </p>
      {phieu && <HopThoaiPhieu banDau={phieu.p} moi={phieu.moi} coDinhLoai onDong={() => setPhieu(null)} />}
    </TrangChinh>
  );
}
