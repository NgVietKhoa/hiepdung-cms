import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BieuTuong } from '../../components/BieuTuong';
import { ChonThang, OSoLieu } from '../../components/ChungCms';
import { HopThoai } from '../../components/HopThoai';
import { NhanTrangThai, OTim, TrangChinh, Trong } from '../../components/KhungTrang';
import { api } from '../../db/api';
import { useTruyVan } from '../../db/hooks';
import { NHAN_TRANG_THAI_BAO_GIA } from '../../db/kieu';
import { dinhDangNgay, dinhDangTien, homNayISO } from '../../lib/dinhDang';
import { taoId } from '../../lib/id';
import { laThang, thangHienTai } from '../../lib/thang';
import { khop } from '../../lib/timKiem';
import { apiCms } from '../api';
import { conNoHoaDon, NHAN_LOAI_HOA_DON, type LoaiHoaDon, type TomTatHoaDon } from './kieu';

/** Nhãn thanh toán của một hoá đơn */
export function NhanThanhToan({ h }: { h: Pick<TomTatHoaDon, 'tong' | 'daThanhToan' | 'trangThai' | 'hanThanhToan' | 'loai'> }) {
  if (h.trangThai === 'huy') return <NhanTrangThai loai="huy" nhan="Đã huỷ" />;
  const con = conNoHoaDon(h);
  if (con <= 0) return <NhanTrangThai loai="daChot" nhan={h.loai === 'banRa' ? 'Đã thu đủ' : 'Đã trả đủ'} />;
  const quaHan = h.hanThanhToan && h.hanThanhToan < homNayISO();
  return <NhanTrangThai loai={quaHan ? 'quaHan' : h.daThanhToan ? 'daGui' : 'nhap'} nhan={`${quaHan ? 'Quá hạn · ' : ''}Còn ${dinhDangTien(con)}`} />;
}

export function HoaDonTrang() {
  const dieuHuong = useNavigate();
  const [thamSo, setThamSo] = useSearchParams();
  const loai: LoaiHoaDon = thamSo.get('loai') === 'muaVao' ? 'muaVao' : 'banRa';
  const thang = laThang(thamSo.get('thang')) ? thamSo.get('thang')! : thangHienTai();
  const dat = (thayDoi: Record<string, string>) => setThamSo({ loai, thang, ...thayDoi }, { replace: true });
  const [cauTim, setCauTim] = useState('');
  const [chonBaoGia, setChonBaoGia] = useState(false);

  const ds = useTruyVan(() => apiCms.hoaDon.ds({ thang }), [thang]);
  const thue = useTruyVan(() => apiCms.hoaDon.thueGTGT(thang), [thang]);
  const theoLoai = useMemo(() => (ds ?? []).filter((h) => h.loai === loai), [ds, loai]);
  const loc = theoLoai.filter((h) => khop(`${h.kyHieu} ${h.soHoaDon} ${h.tenDoiTac}`, cauTim));
  const hieuLuc = theoLoai.filter((h) => h.trangThai === 'hieuLuc');
  const cong = (f: (h: TomTatHoaDon) => number) => hieuLuc.reduce((s, h) => s + f(h), 0);

  const taoMoi = (l: LoaiHoaDon) => dieuHuong(`/hoa-don/${taoId()}?moi=${l}`);

  return (
    <TrangChinh tieuDe="Hoá đơn" phuDe="Sổ theo dõi hoá đơn mua vào / bán ra" phai={<ChonThang value={thang} onChange={(t) => dat({ thang: t })} />}>
      <div className="tab-loai" role="tablist">
        {(['banRa', 'muaVao'] as const).map((l) => (
          <button key={l} type="button" role="tab" aria-selected={loai === l} className={loai === l ? 'dang-chon' : ''} onClick={() => dat({ loai: l })}>
            {NHAN_LOAI_HOA_DON[l]}
            <span className="dem">{(ds ?? []).filter((h) => h.loai === l).length}</span>
          </button>
        ))}
      </div>

      <div className="luoi-so-lieu">
        <OSoLieu nhan="Tiền hàng (trước thuế)" giaTri={dinhDangTien(cong((h) => h.tienTruocThue))} bieuTuong="hoaDon" phu={`${hieuLuc.length} hoá đơn`} />
        <OSoLieu nhan="Thuế GTGT" giaTri={dinhDangTien(cong((h) => h.tienThue))} bieuTuong="vanBan" />
        <OSoLieu
          nhan={loai === 'banRa' ? 'Khách còn nợ' : 'Mình còn nợ'}
          giaTri={dinhDangTien(cong((h) => Math.max(0, conNoHoaDon(h))))}
          bieuTuong="tien"
          phu={`Tổng thanh toán ${dinhDangTien(cong((h) => h.tong))}`}
        />
        {thue && (
          <OSoLieu
            nhan="Thuế GTGT phải nộp (tạm tính)"
            giaTri={dinhDangTien(thue.phaiNop)}
            bieuTuong="bieuDo"
            phu={`Đầu ra ${dinhDangTien(thue.dauRa.tienThue)} − đầu vào ${dinhDangTien(thue.dauVao.tienThue)}`}
            loai={thue.phaiNop < 0 ? 'tot' : undefined}
          />
        )}
      </div>

      <div className="thanh-cong-cu">
        <OTim value={cauTim} onChange={setCauTim} placeholder="Tìm số hoá đơn, ký hiệu, đối tác" />
        <div className="hang-nut">
          {loai === 'banRa' && (
            <button type="button" className="nut nut-vien" onClick={() => setChonBaoGia(true)}>
              <BieuTuong ten="vanBan" /> Từ báo giá
            </button>
          )}
          <button type="button" className="nut nut-chinh" onClick={() => taoMoi(loai)}>
            <BieuTuong ten="them" /> {loai === 'banRa' ? 'HĐ bán ra' : 'HĐ mua vào'}
          </button>
        </div>
      </div>

      {!ds && <p className="dang-tai">Đang tải…</p>}
      {ds && loc.length === 0 && (
        <Trong bieuTuong="hoaDon">{cauTim ? 'Không tìm thấy hoá đơn.' : `Tháng này chưa có hoá đơn ${NHAN_LOAI_HOA_DON[loai].toLowerCase()}.`}</Trong>
      )}
      {loc.length > 0 && (
        <ul className="ds-don">
          {loc.map((h) => (
            <li key={h.id}>
              <Link to={`/hoa-don/${h.id}`} className="dong-don">
                <span className="dong-don-ten">
                  <strong>{h.tenDoiTac || '(Chưa có đối tác)'}</strong>
                  <small>
                    {[h.kyHieu, h.soHoaDon ? `Số ${h.soHoaDon}` : 'Chưa có số'].filter(Boolean).join(' · ')} · {dinhDangNgay(h.ngayHoaDon)}
                    {h.soTep > 0 && (
                      <>
                        {' '}
                        · <BieuTuong ten="tep" co={14} /> {h.soTep}
                      </>
                    )}
                  </small>
                </span>
                <span className="cot-phai">
                  <span className="dong-don-gia">{dinhDangTien(h.tong)}</span>
                  <NhanThanhToan h={h} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {chonBaoGia && <HopThoaiChonBaoGia onDong={() => setChonBaoGia(false)} onChon={(id) => dieuHuong(`/hoa-don/${taoId()}?tuBaoGia=${id}`)} />}
    </TrangChinh>
  );
}

/** Chọn báo giá (ưu tiên đã chốt) để lập hoá đơn bán ra */
function HopThoaiChonBaoGia({ onDong, onChon }: { onDong: () => void; onChon: (baoGiaId: string) => void }) {
  const [cauTim, setCauTim] = useState('');
  const duLieu = useTruyVan(async () => {
    const [bg, khach] = await Promise.all([api.baoGia.ds(), api.khachHang.ds()]);
    const ten = new Map(khach.map((k) => [k.id, k.tenCongTy]));
    return bg
      .filter((b) => b.trangThai !== 'huy')
      .map((b) => ({ ...b, tenKhach: (b.khachHangId && ten.get(b.khachHangId)) || '(Chưa chọn khách)' }))
      .sort((a, b) => Number(b.trangThai === 'daChot') - Number(a.trangThai === 'daChot'));
  }, []);
  const loc = (duLieu ?? []).filter((b) => khop(`${b.so} ${b.tenKhach} ${b.tieuDe}`, cauTim)).slice(0, 50);
  return (
    <HopThoai tieuDe="Lập hoá đơn từ báo giá" onDong={onDong}>
      <OTim value={cauTim} onChange={setCauTim} placeholder="Tìm số báo giá, tên khách" />
      {!duLieu && <p className="dang-tai">Đang tải…</p>}
      <ul className="ds-don">
        {loc.map((b) => (
          <li key={b.id}>
            <button type="button" className="dong-don" onClick={() => onChon(b.id)}>
              <span className="dong-don-ten">
                <strong>{b.tenKhach}</strong>
                <small>
                  {b.so} · {dinhDangNgay(b.ngay)} {b.tieuDe && `· ${b.tieuDe}`}
                </small>
              </span>
              <span className="cot-phai">
                <span className="dong-don-gia">{dinhDangTien(b.tong)}</span>
                <NhanTrangThai loai={b.trangThai} nhan={NHAN_TRANG_THAI_BAO_GIA[b.trangThai]} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </HopThoai>
  );
}
