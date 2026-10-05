import { useState, type CSSProperties } from 'react';
import { ChonThang, OSoLieu } from '../../components/ChungCms';
import { TrangChinh, Trong } from '../../components/KhungTrang';
import { useCaiDat, useTruyVan } from '../../db/hooks';
import { dinhDangSoLuong, dinhDangTien, homNayISO } from '../../lib/dinhDang';
import { cacNgayTrongThang, TEN_THU_NGAN, tenThang, thangHienTai, thuCuaNgay } from '../../lib/thang';
import { apiCms } from '../api';

/** Nhân viên xem công, giờ tăng ca, lương tạm tính của mình theo tháng (lịch tháng) */
export function CongCuaToiTrang() {
  const cd = useCaiDat();
  const [thang, setThang] = useState(thangHienTai);
  const kq = useTruyVan(() => apiCms.chamCong.congCuaToi(thang).then((v) => ({ v })), [thang]);
  const du = kq?.v;
  const ngay = cacNgayTrongThang(thang);
  // Lịch bắt đầu từ thứ Hai: chừa ô trống trước ngày 1
  const oTrongDau = (thuCuaNgay(ngay[0]) + 6) % 7;
  const theoNgay = new Map((du?.o ?? []).map((o) => [o.ngay, o]));
  const loai = new Map((du?.loaiCong ?? []).map((l) => [l.id, l]));
  const homNay = homNayISO();

  return (
    <TrangChinh tieuDe="Công của tôi" phuDe={du?.nhanVien.hoTen} phai={<ChonThang value={thang} onChange={setThang} />}>
      {!kq && <p className="dang-tai">Đang tải…</p>}
      {kq && !du && <Trong bieuTuong="nguoi">Tài khoản chưa gắn với hồ sơ nhân viên — nhờ quản lý gắn giúp.</Trong>}
      {du && (
        <>
          <div className="luoi-so-lieu">
            <OSoLieu nhan="Số công" giaTri={dinhDangSoLuong(du.luong.soCong)} bieuTuong="lich" phu={tenThang(thang)} />
            <OSoLieu nhan="Giờ tăng ca" giaTri={dinhDangSoLuong(du.luong.gioTangCa)} bieuTuong="dongHo" />
            <OSoLieu nhan="Đã tạm ứng" giaTri={dinhDangTien(du.luong.tamUng)} bieuTuong="xuat" />
            <OSoLieu
              nhan="Lương tạm tính"
              giaTri={dinhDangTien(du.luong.thucLinh)}
              bieuTuong="tien"
              phu={`Công ${dinhDangTien(du.luong.tienCong)} + TC ${dinhDangTien(du.luong.tienTangCa)} + PC ${dinhDangTien(du.luong.phuCap)}`}
            />
          </div>
          <section className="the">
            <div className="lich-thang">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((t) => (
                <div key={t} className="lich-thu">
                  {t}
                </div>
              ))}
              {Array.from({ length: oTrongDau }, (_, i) => (
                <div key={`trong-${i}`} />
              ))}
              {ngay.map((d) => {
                const o = theoNgay.get(d);
                const l = o?.loaiCongId ? loai.get(o.loaiCongId) : undefined;
                const thu = thuCuaNgay(d);
                return (
                  <div
                    key={d}
                    className={`lich-ngay ${cd.ngayNghiTuan.includes(thu) ? 'ngay-nghi' : ''} ${d === homNay ? 'hom-nay' : ''}`}
                    style={l?.mau ? ({ '--mau-o': l.mau } as CSSProperties) : undefined}
                    title={[l?.ten, o?.gioTangCa ? `tăng ca ${o.gioTangCa} giờ` : '', o?.ghiChu].filter(Boolean).join(' · ') || undefined}
                  >
                    <span className="lich-so">
                      {Number(d.slice(8))} <small>{TEN_THU_NGAN[thu]}</small>
                    </span>
                    <strong>{l?.kyHieu ?? ''}</strong>
                    {!!o?.gioTangCa && <small>+{dinhDangSoLuong(o.gioTangCa)}h</small>}
                  </div>
                );
              })}
            </div>
            <p className="goi-y-nho cach-tren">
              {du.loaiCong.map((l) => `${l.kyHieu}: ${l.ten}`).join(' · ')}. Lương tạm tính theo số công đã chấm, có thể thay đổi đến cuối tháng.
            </p>
          </section>
        </>
      )}
    </TrangChinh>
  );
}
