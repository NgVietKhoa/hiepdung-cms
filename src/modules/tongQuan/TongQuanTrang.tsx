import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BieuTuong } from '../../components/BieuTuong';
import { BangCuon, ChonThang, OSoLieu } from '../../components/ChungCms';
import { TrangChinh } from '../../components/KhungTrang';
import { useCaiDat, useTruyVan } from '../../db/hooks';
import { usePhien } from '../../db/phien';
import { dinhDangSoLuong, dinhDangTien } from '../../lib/dinhDang';
import { tenThang, thangHienTai } from '../../lib/thang';
import { apiCms } from '../api';
import type { CotThang } from './kieu';

/** Rút gọn tiền cho trục / nhãn: 12,5 tr — 1,2 tỷ */
function tienGon(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `${dinhDangSoLuong(Math.round(n / 1e8) / 10)} tỷ`;
  if (a >= 1e6) return `${dinhDangSoLuong(Math.round(n / 1e5) / 10)} tr`;
  if (a >= 1e3) return `${dinhDangSoLuong(Math.round(n / 1e3))} k`;
  return dinhDangSoLuong(n);
}

/** Mốc trục tròn: 0, bước đẹp (1, 2, 5 × 10^n) */
function cacMoc(lonNhat: number): number[] {
  if (lonNhat <= 0) return [0];
  const tho = lonNhat / 4;
  const mu = 10 ** Math.floor(Math.log10(tho));
  const buoc = [1, 2, 5, 10].map((h) => h * mu).find((b) => b >= tho)!;
  return Array.from({ length: Math.ceil(lonNhat / buoc) + 1 }, (_, i) => i * buoc);
}

const SERIES = [
  { khoa: 'thu', nhan: 'Thu', lop: 'cot-thu' },
  { khoa: 'chi', nhan: 'Chi', lop: 'cot-chi' },
] as const;

/** Thu – chi 6 tháng: cột nhóm, một trục, rê chuột để xem số */
function BieuDoThuChi({ du }: { du: CotThang[] }) {
  const [xemBang, setXemBang] = useState(false);
  const [dangXem, setDangXem] = useState<{ i: number; khoa: 'thu' | 'chi' } | null>(null);
  // Vẽ theo đúng bề ngang khung (không co giãn SVG) để chữ trục luôn đủ to trên điện thoại
  const khung = useRef<HTMLDivElement>(null);
  const [rong, setRong] = useState(640);
  useEffect(() => {
    const el = khung.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setRong(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [xemBang]);
  const moc = cacMoc(Math.max(...du.flatMap((c) => [c.thu, c.chi])));
  const tran = moc[moc.length - 1] || 1;
  const R = Math.max(300, rong);
  const C = 220;
  const TRAI = 52;
  const DUOI = 26;
  const TREN = 8;
  const caoVe = C - DUOI - TREN;
  const rongNhom = (R - TRAI) / du.length;
  const rongCot = Math.min(24, (rongNhom - 16) / 2);
  const y = (v: number) => TREN + caoVe - (v / tran) * caoVe;

  return (
    <section className="the">
      <div className="the-dau">
        <div className="the-ten">
          <h2>Thu – chi 6 tháng</h2>
        </div>
        <div className="chu-giai" aria-hidden={xemBang}>
          {SERIES.map((s) => (
            <span key={s.khoa}>
              <i className={`o-mau ${s.lop}`} /> {s.nhan}
            </span>
          ))}
        </div>
        <button type="button" className="nut-nho" onClick={() => setXemBang((v) => !v)}>
          {xemBang ? 'Xem biểu đồ' : 'Xem bảng'}
        </button>
      </div>
      {xemBang ? (
        <BangCuon>
          <thead>
            <tr>
              <th>Tháng</th>
              <th className="so">Doanh thu (HĐ)</th>
              <th className="so">Thu</th>
              <th className="so">Chi</th>
              <th className="so">Chênh lệch</th>
            </tr>
          </thead>
          <tbody>
            {du.map((c) => (
              <tr key={c.thang}>
                <td>{tenThang(c.thang)}</td>
                <td className="so">{dinhDangTien(c.doanhThu)}</td>
                <td className="so">{dinhDangTien(c.thu)}</td>
                <td className="so">{dinhDangTien(c.chi)}</td>
                <td className="so">{dinhDangTien(c.thu - c.chi)}</td>
              </tr>
            ))}
          </tbody>
        </BangCuon>
      ) : (
        <div className="khung-bieu-do" ref={khung}>
          <svg viewBox={`0 0 ${R} ${C}`} role="img" aria-label="Biểu đồ cột thu và chi 6 tháng gần nhất" onMouseLeave={() => setDangXem(null)}>
            {moc.map((m) => (
              <g key={m}>
                <line x1={TRAI} x2={R} y1={y(m)} y2={y(m)} className={m === 0 ? 'truc-goc' : 'luoi'} />
                <text x={TRAI - 8} y={y(m)} className="nhan-truc" textAnchor="end" dominantBaseline="middle">
                  {tienGon(m)}
                </text>
              </g>
            ))}
            {du.map((c, i) => {
              const giua = TRAI + rongNhom * i + rongNhom / 2;
              return (
                <g key={c.thang}>
                  {SERIES.map((s, j) => {
                    const v = c[s.khoa];
                    const x = giua - rongCot - 1 + j * (rongCot + 2);
                    const cao = Math.max(0, y(0) - y(v));
                    const bo = Math.min(4, cao);
                    // Đầu cột bo 4px, chân cột vuông trên trục gốc
                    const d = `M${x},${y(0)} V${y(v) + bo} Q${x},${y(v)} ${x + bo},${y(v)} H${x + rongCot - bo} Q${x + rongCot},${y(v)} ${x + rongCot},${y(v) + bo} V${y(0)} Z`;
                    const chon = dangXem?.i === i && dangXem.khoa === s.khoa;
                    return (
                      <g key={s.khoa}>
                        {cao > 0 && <path d={d} className={`${s.lop} ${dangXem && !chon ? 'mo' : ''}`} />}
                        {/* Vùng bắt chuột rộng hơn cột */}
                        <rect
                          x={x - 1}
                          y={TREN}
                          width={rongCot + 2}
                          height={caoVe}
                          fill="transparent"
                          onMouseEnter={() => setDangXem({ i, khoa: s.khoa })}
                          onClick={() => setDangXem({ i, khoa: s.khoa })}
                        />
                      </g>
                    );
                  })}
                  <text x={giua} y={C - 6} className="nhan-truc" textAnchor="middle">
                    {c.thang.slice(5)}/{c.thang.slice(2, 4)}
                  </text>
                </g>
              );
            })}
          </svg>
          {dangXem && (
            <div
              className="chu-thich-noi"
              style={{ left: `${((TRAI + rongNhom * dangXem.i + rongNhom / 2) / R) * 100}%` }}
              role="status"
            >
              <strong>{tenThang(du[dangXem.i].thang)}</strong>
              {SERIES.map((s) => (
                <span key={s.khoa} className={s.khoa === dangXem.khoa ? 'dam' : ''}>
                  <i className={`o-mau ${s.lop}`} /> {s.nhan}: {dinhDangTien(du[dangXem.i][s.khoa])}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function TongQuanTrang() {
  const cd = useCaiDat();
  const { coQuyen } = usePhien();
  const [thang, setThang] = useState(thangHienTai);
  const tq = useTruyVan(() => apiCms.tongQuan(thang), [thang]);

  return (
    <TrangChinh tieuDe="Tổng quan" phuDe={cd.tenDonVi || undefined} phai={<ChonThang value={thang} onChange={setThang} />}>
      {!tq && <p className="dang-tai">Đang tải…</p>}
      {tq && (
        <>
          <div className="luoi-so-lieu">
            <OSoLieu nhan="Doanh thu (HĐ bán ra)" bieuTuong="hoaDon" giaTri={dinhDangTien(tq.doanhThu)} phu={`Mua vào: ${dinhDangTien(tq.muaVao)}`} den={coQuyen('hoaDon') ? '/hoa-don' : undefined} />
            <OSoLieu
              nhan={`Thu – chi ${tenThang(thang).toLowerCase()}`}
              bieuTuong="tien"
              giaTri={dinhDangTien(tq.thuThang - tq.chiThang)}
              phu={`Thu ${dinhDangTien(tq.thuThang)} · Chi ${dinhDangTien(tq.chiThang)}`}
              loai={tq.thuThang - tq.chiThang < 0 ? 'xau' : undefined}
              den={coQuyen('thuChi') ? '/thu-chi' : undefined}
            />
            <OSoLieu nhan="Tồn quỹ hiện tại" bieuTuong="tien" giaTri={dinhDangTien(tq.tonQuy)} loai={tq.tonQuy < 0 ? 'xau' : undefined} phu="Tiền mặt + tài khoản" />
            <OSoLieu nhan="Khách còn nợ" bieuTuong="nguoi" giaTri={dinhDangTien(tq.phaiThu)} phu={`Mình còn nợ NCC: ${dinhDangTien(tq.phaiTra)}`} den={coQuyen('thuChi') ? '/cong-no' : undefined} />
            <OSoLieu
              nhan="Báo giá chờ chốt"
              bieuTuong="vanBan"
              giaTri={tq.baoGiaCho.so}
              phu={`${dinhDangTien(tq.baoGiaCho.tong)} · đã chốt trong tháng: ${tq.baoGiaChotThang.so}`}
              den={coQuyen('baoGia') ? '/bao-gia' : undefined}
            />
            <OSoLieu
              nhan="Chấm công hôm nay"
              bieuTuong="lich"
              giaTri={`${tq.chamCongHomNay.daCham}/${tq.chamCongHomNay.tongNhanVien}`}
              phu={tq.chamCongHomNay.daCham < tq.chamCongHomNay.tongNhanVien ? 'Còn người chưa chấm' : 'Đã chấm đủ'}
              den={coQuyen('chamCong') ? '/cham-cong' : undefined}
            />
          </div>

          <BieuDoThuChi du={tq.bieuDo} />

          <div className="luoi-2-cot">
            <section className="the">
              <div className="the-dau">
                <span className="the-bieu-tuong">
                  <BieuTuong ten="kho" co={20} />
                </span>
                <div className="the-ten">
                  <h2>Vật tư sắp hết</h2>
                </div>
                {coQuyen('kho') && (
                  <Link to="/kho" className="nut-nho">
                    Xem kho
                  </Link>
                )}
              </div>
              {tq.vatTuSapHet.length === 0 ? (
                <p className="goi-y-nho">Không có vật tư nào dưới mức tồn tối thiểu.</p>
              ) : (
                <ul className="ds-gon">
                  {tq.vatTuSapHet.map((v) => (
                    <li key={v.id}>
                      <span>{v.ten}</span>
                      <span className="chu-loi">
                        còn {dinhDangSoLuong(v.tonKho)} / {dinhDangSoLuong(v.tonToiThieu)} {v.donViTinh}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </TrangChinh>
  );
}
