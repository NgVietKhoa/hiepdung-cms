import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BieuTuong } from '../../components/BieuTuong';
import { BangCuon, OSoLieu } from '../../components/ChungCms';
import { HopThoai } from '../../components/HopThoai';
import { OTim, TrangChinh, Trong } from '../../components/KhungTrang';
import { useTruyVan } from '../../db/hooks';
import { usePhien } from '../../db/phien';
import { dinhDangNgay, dinhDangTien } from '../../lib/dinhDang';
import { khop } from '../../lib/timKiem';
import { apiCms } from '../api';
import { NhanThanhToan } from '../hoaDon/HoaDonTrang';
import { conNoHoaDon } from '../hoaDon/kieu';
import type { CongNo, LoaiCongNo } from './kieu';

export function CongNoTrang() {
  const [loai, setLoai] = useState<LoaiCongNo>('phaiThu');
  const [cauTim, setCauTim] = useState('');
  const [xem, setXem] = useState<CongNo | null>(null);
  const ds = useTruyVan(() => apiCms.thuChi.congNo(loai), [loai]);
  const loc = (ds ?? []).filter((c) => khop(`${c.tenDoiTac} ${c.soDienThoai}`, cauTim));
  const tongNo = (ds ?? []).reduce((s, c) => s + Math.max(0, c.conNo), 0);
  const tongQuaHan = (ds ?? []).reduce((s, c) => s + c.quaHan, 0);
  const traTruoc = (ds ?? []).reduce((s, c) => s + Math.max(0, -c.conNo), 0);
  const laThu = loai === 'phaiThu';

  return (
    <TrangChinh tieuDe="Công nợ" phuDe="Tính theo hoá đơn và các phiếu thu / chi của từng đối tác">
      <div className="tab-loai" role="tablist">
        {(
          [
            ['phaiThu', 'Khách nợ mình (phải thu)'],
            ['phaiTra', 'Mình nợ NCC (phải trả)'],
          ] as const
        ).map(([gt, nhan]) => (
          <button key={gt} type="button" role="tab" aria-selected={loai === gt} className={loai === gt ? 'dang-chon' : ''} onClick={() => setLoai(gt)}>
            {nhan}
          </button>
        ))}
      </div>
      <div className="luoi-so-lieu">
        <OSoLieu nhan={laThu ? 'Tổng phải thu' : 'Tổng phải trả'} giaTri={dinhDangTien(tongNo)} bieuTuong="tien" />
        <OSoLieu nhan="Trong đó quá hạn" giaTri={dinhDangTien(tongQuaHan)} bieuTuong="canhBao" loai={tongQuaHan > 0 ? 'xau' : undefined} />
        <OSoLieu nhan={laThu ? 'Khách trả trước' : 'Mình trả trước'} giaTri={dinhDangTien(traTruoc)} bieuTuong="xong" phu="Đã thanh toán nhiều hơn hoá đơn" />
      </div>
      <OTim value={cauTim} onChange={setCauTim} placeholder={laThu ? 'Tìm khách hàng' : 'Tìm nhà cung cấp'} />
      {!ds && <p className="dang-tai">Đang tải…</p>}
      {ds && loc.length === 0 && <Trong bieuTuong="xong">{cauTim ? 'Không tìm thấy.' : 'Không có công nợ nào.'}</Trong>}
      {loc.length > 0 && (
        <BangCuon>
          <thead>
            <tr>
              <th>{laThu ? 'Khách hàng' : 'Nhà cung cấp'}</th>
              <th className="so">Số HĐ</th>
              <th className="so">Tổng hoá đơn</th>
              <th className="so">{laThu ? 'Đã thu' : 'Đã trả'}</th>
              <th className="so">Còn nợ</th>
              <th className="so">Quá hạn</th>
            </tr>
          </thead>
          <tbody>
            {loc.map((c) => (
              <tr key={c.doiTacId} className="dong-bam" onClick={() => setXem(c)}>
                <td>
                  <strong>{c.tenDoiTac}</strong>
                  {c.soDienThoai && <small className="khoi">{c.soDienThoai}</small>}
                </td>
                <td className="so">{c.soHoaDon}</td>
                <td className="so">{dinhDangTien(c.tongHoaDon, false)}</td>
                <td className="so">{dinhDangTien(c.daThanhToan, false)}</td>
                <td className={`so dam ${c.conNo < 0 ? 'chu-tot' : ''}`}>{dinhDangTien(c.conNo, false)}</td>
                <td className={`so ${c.quaHan ? 'chu-loi' : ''}`}>{c.quaHan ? dinhDangTien(c.quaHan, false) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </BangCuon>
      )}
      <p className="goi-y-nho cach-tren">
        Còn nợ = tổng hoá đơn (hiệu lực) − tổng phiếu {laThu ? 'thu của khách' : 'chi cho nhà cung cấp'} đó. Hoá đơn không chọn đối tác trong danh bạ gộp vào dòng “Không có trong danh bạ”, tính theo phiếu gắn với từng hoá đơn.
      </p>
      {xem && <HopThoaiChiTietNo cn={xem} laThu={laThu} onDong={() => setXem(null)} />}
    </TrangChinh>
  );
}

/** Các hoá đơn của một đối tác và tình trạng thanh toán */
function HopThoaiChiTietNo({ cn, laThu, onDong }: { cn: CongNo; laThu: boolean; onDong: () => void }) {
  const { coQuyen } = usePhien();
  const ds = useTruyVan(
    async () =>
      (await apiCms.hoaDon.ds({ loai: laThu ? 'banRa' : 'muaVao', tatCa: true })).filter(
        (h) => ((laThu ? h.khachHangId : h.nhaCungCapId) ?? '') === cn.doiTacId && h.trangThai === 'hieuLuc',
      ),
    [cn.doiTacId],
  );
  return (
    <HopThoai tieuDe={cn.tenDoiTac} onDong={onDong}>
      <p>
        Còn nợ: <strong>{dinhDangTien(cn.conNo)}</strong>
      </p>
      {!coQuyen('hoaDon') ? (
        <p className="goi-y-nho">Cần quyền Hoá đơn để xem chi tiết từng hoá đơn.</p>
      ) : !ds ? (
        <p className="dang-tai">Đang tải…</p>
      ) : (
        <ul className="ds-don">
          {ds.map((h) => (
            <li key={h.id}>
              <Link to={`/hoa-don/${h.id}`} className="dong-don">
                <span className="dong-don-ten">
                  <strong>{[h.kyHieu, h.soHoaDon && `Số ${h.soHoaDon}`].filter(Boolean).join(' · ') || 'Hoá đơn'}</strong>
                  <small>
                    {dinhDangNgay(h.ngayHoaDon)} · {dinhDangTien(h.tong)}
                    {h.hanThanhToan && ` · hạn ${dinhDangNgay(h.hanThanhToan)}`}
                  </small>
                </span>
                {conNoHoaDon(h) !== 0 ? <NhanThanhToan h={h} /> : <BieuTuong ten="xong" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </HopThoai>
  );
}
