/**
 * Bảng chấm công tháng: nhân viên × ngày. Chọn "bút" (một ký hiệu công) rồi bấm vào ô để chấm;
 * bấm lại cùng ký hiệu là bỏ. Bút "Chi tiết" mở hộp thoại ghi giờ tăng ca, ghi chú.
 * Mỗi lần bấm lưu ngay (gom trong 0,4 giây rồi gửi một lượt).
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { BieuTuong } from '../../components/BieuTuong';
import { ChonThang } from '../../components/ChungCms';
import { HopThoai, useGiaoTiep } from '../../components/HopThoai';
import { TrangChinh, Trong } from '../../components/KhungTrang';
import { ChonMot, OChu, OSo } from '../../components/ONhap';
import { useCaiDat } from '../../db/hooks';
import { dinhDangNgay, dinhDangSoLuong, homNayISO } from '../../lib/dinhDang';
import { taoId } from '../../lib/id';
import { cacNgayTrongThang, TEN_THU, TEN_THU_NGAN, tenThang, thangHienTai, thuCuaNgay } from '../../lib/thang';
import { apiCms } from '../api';
import type { BangCong, LoaiCong, OCong } from './kieu';
import { tinhLuong } from './tinhLuong';
import { xuatBangCongExcel } from './xuatExcel';

type But = { kieu: 'loai'; id: string } | { kieu: 'xoa' } | { kieu: 'chiTiet' };
const khoaO = (nhanVienId: string, ngay: string) => `${nhanVienId}|${ngay}`;
const laORong = (o: OCong) => !o.loaiCongId && !o.gioTangCa && !o.ghiChu;

const boNhoDemBangCong = new Map<string, BangCong>();

export function BangCongTrang() {
  const cd = useCaiDat();
  const { thongBao } = useGiaoTiep();
  const [thang, setThang] = useState(thangHienTai);
  const [bang, setBang] = useState<BangCong | undefined>(() => boNhoDemBangCong.get(thangHienTai()));
  const [o, setO] = useState<Map<string, OCong>>(() => {
    const dem = boNhoDemBangCong.get(thangHienTai());
    return dem ? new Map(dem.o.map((x) => [khoaO(x.nhanVienId, x.ngay), x])) : new Map();
  });
  const [but, setBut] = useState<But | null>(null);
  const [chiTiet, setChiTiet] = useState<OCong | null>(null);
  const [suaLoai, setSuaLoai] = useState(false);
  const choGui = useRef(new Map<string, OCong>());
  const hen = useRef<number>();
  // Hàm gửi chạy trễ (hẹn giờ) nên đọc tháng đang xem qua ref, không qua biến của lần vẽ cũ
  const thangDangXem = useRef(thang);
  thangDangXem.current = thang;

  const tai = async (t = thangDangXem.current) => {
    try {
      const b = await apiCms.chamCong.bangCong(t);
      if (t !== thangDangXem.current) return; // đã chuyển sang tháng khác trong lúc chờ
      boNhoDemBangCong.set(t, b);
      setBang(b);
      setO(new Map(b.o.map((x) => [khoaO(x.nhanVienId, x.ngay), x])));
      setBut((cu) => cu ?? (b.loaiCong[0] ? { kieu: 'loai', id: b.loaiCong[0].id } : { kieu: 'chiTiet' }));
    } catch (e) {
      thongBao((e as Error).message, 'loi');
    }
  };
  useEffect(() => {
    const dem = boNhoDemBangCong.get(thang);
    if (dem) {
      setBang(dem);
      setO(new Map(dem.o.map((x) => [khoaO(x.nhanVienId, x.ngay), x])));
    } else {
      setBang(undefined);
    }
    void tai(thang);
  }, [thang]);

  /** Gửi các ô đã đổi (gom lại) — lỗi thì tải lại bảng cho khớp máy chủ */
  const gui = async () => {
    const ds = [...choGui.current.values()];
    choGui.current.clear();
    boNhoDemBangCong.delete(thangDangXem.current);
    if (!ds.length) return;
    try {
      await apiCms.chamCong.ghiO(ds);
    } catch (e) {
      thongBao(`Chưa lưu được: ${(e as Error).message}`, 'loi');
      void tai();
    }
  };
  useEffect(() => () => void gui(), []);

  const ghi = (ds: OCong[]) => {
    setO((cu) => {
      const moi = new Map(cu);
      for (const x of ds) {
        const k = khoaO(x.nhanVienId, x.ngay);
        if (laORong(x)) moi.delete(k);
        else moi.set(k, x);
        choGui.current.set(k, x);
      }
      return moi;
    });
    window.clearTimeout(hen.current);
    hen.current = window.setTimeout(gui, 400);
  };

  const oCua = (nhanVienId: string, ngay: string): OCong =>
    o.get(khoaO(nhanVienId, ngay)) ?? { nhanVienId, ngay, loaiCongId: null, gioTangCa: 0, ghiChu: '' };

  const bamO = (nhanVienId: string, ngay: string) => {
    const hienTai = oCua(nhanVienId, ngay);
    if (!but || but.kieu === 'chiTiet') return setChiTiet(hienTai);
    if (but.kieu === 'xoa') return ghi([{ ...hienTai, loaiCongId: null, gioTangCa: 0, ghiChu: '' }]);
    ghi([{ ...hienTai, loaiCongId: hienTai.loaiCongId === but.id ? null : but.id }]);
  };

  /** Bấm đầu cột ngày: chấm ký hiệu đang chọn cho mọi người chưa chấm ngày đó */
  const chamCaNgay = (ngay: string) => {
    if (!bang || but?.kieu !== 'loai') return thongBao('Chọn một ký hiệu công trước rồi bấm vào ngày', 'loi');
    const ds = bang.nhanVien.filter((n) => n.dangLam && !oCua(n.id, ngay).loaiCongId).map((n) => ({ ...oCua(n.id, ngay), loaiCongId: but.id }));
    if (!ds.length) return thongBao('Mọi người đã được chấm ngày này');
    ghi(ds);
    thongBao(`Đã chấm cho ${ds.length} người ngày ${dinhDangNgay(ngay)}`);
  };

  const ngay = useMemo(() => cacNgayTrongThang(thang), [thang]);
  const loaiTheoId = useMemo(() => new Map((bang?.loaiCong ?? []).map((l) => [l.id, l])), [bang]);
  const homNay = homNayISO();
  const tongHop = useMemo(() => {
    const dsO = [...o.values()];
    return new Map(
      (bang?.nhanVien ?? []).map((n) => [n.id, tinhLuong(n, dsO.filter((x) => x.nhanVienId === n.id), bang?.loaiCong ?? [])]),
    );
  }, [o, bang]);

  return (
    <TrangChinh
      tieuDe="Chấm công"
      phuDe={tenThang(thang)}
      phai={<ChonThang value={thang} onChange={setThang} />}
    >
      <div className="hang-cong-cu">
        <div className="but-cham" role="radiogroup" aria-label="Chọn ký hiệu để chấm">
          {(bang?.loaiCong ?? []).map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={but?.kieu === 'loai' && but.id === l.id}
              className={but?.kieu === 'loai' && but.id === l.id ? 'dang-chon' : ''}
              onClick={() => setBut({ kieu: 'loai', id: l.id })}
              title={`${l.ten} (${dinhDangSoLuong(l.heSo)} công)`}
            >
              <span className="ky-hieu" style={{ background: l.mau || undefined }}>
                {l.kyHieu}
              </span>
              <span className="ten-but">{l.ten}</span>
            </button>
          ))}
          <button type="button" role="radio" aria-checked={but?.kieu === 'chiTiet'} className={but?.kieu === 'chiTiet' ? 'dang-chon' : ''} onClick={() => setBut({ kieu: 'chiTiet' })}>
            <BieuTuong ten="sua" co={18} /> <span className="ten-but">Tăng ca / ghi chú</span>
          </button>
          <button type="button" role="radio" aria-checked={but?.kieu === 'xoa'} className={but?.kieu === 'xoa' ? 'dang-chon' : ''} onClick={() => setBut({ kieu: 'xoa' })}>
            <BieuTuong ten="xoa" co={18} /> <span className="ten-but">Xoá ô</span>
          </button>
        </div>
        <div className="hang-nut-nho">
          <button type="button" className="nut-nho" onClick={() => setSuaLoai(true)}>
            <BieuTuong ten="caiDat" co={18} /> Ký hiệu
          </button>
          <button
            type="button"
            className="nut-nho"
            disabled={!bang}
            onClick={() => bang && xuatBangCongExcel({ ...bang, o: [...o.values()] }, cd).catch((e) => thongBao((e as Error).message, 'loi'))}
          >
            <BieuTuong ten="tai" co={18} /> Excel
          </button>
          <Link to={`/bang-luong?thang=${thang}`} className="nut-nho">
            <BieuTuong ten="tien" co={18} /> Bảng lương
          </Link>
        </div>
      </div>
      <p className="goi-y-nho">
        Chọn ký hiệu rồi bấm vào ô để chấm (bấm lại để bỏ). Bấm vào <strong>số ngày</strong> ở đầu cột để chấm cho mọi người chưa chấm ngày đó.
      </p>

      {!bang && <p className="dang-tai">Đang tải…</p>}
      {bang && bang.nhanVien.length === 0 && (
        <Trong
          bieuTuong="nguoi"
          hanhDong={
            <Link to="/nhan-vien" className="nut nut-chinh">
              <BieuTuong ten="them" /> Thêm nhân viên
            </Link>
          }
        >
          Chưa có nhân viên nào.
        </Trong>
      )}
      {bang && bang.nhanVien.length > 0 && (
        <div className="bang-cuon bang-cong-khung">
          <table className="bang-cong">
            <thead>
              <tr>
                <th className="cot-ten">Nhân viên</th>
                {ngay.map((d) => {
                  const thu = thuCuaNgay(d);
                  return (
                    <th
                      key={d}
                      className={`${cd.ngayNghiTuan.includes(thu) ? 'ngay-nghi' : ''} ${d === homNay ? 'hom-nay' : ''}`}
                    >
                      <button type="button" onClick={() => chamCaNgay(d)} title={`${TEN_THU[thu]} ${dinhDangNgay(d)} — chấm cả ngày`}>
                        <span>{Number(d.slice(8))}</span>
                        <small>{TEN_THU_NGAN[thu]}</small>
                      </button>
                    </th>
                  );
                })}
                <th className="cot-tong">Công</th>
                <th className="cot-tong">TC (giờ)</th>
              </tr>
            </thead>
            <tbody>
              {bang.nhanVien.map((n) => {
                const th = tongHop.get(n.id);
                return (
                  <tr key={n.id} className={n.dangLam ? '' : 'da-nghi'}>
                    <th className="cot-ten" scope="row">
                      <span>{n.hoTen}</span>
                      {n.chucVu && <small>{n.chucVu}</small>}
                    </th>
                    {ngay.map((d) => {
                      const x = o.get(khoaO(n.id, d));
                      const l = x?.loaiCongId ? loaiTheoId.get(x.loaiCongId) : undefined;
                      const thu = thuCuaNgay(d);
                      return (
                        <td
                          key={d}
                          className={`${cd.ngayNghiTuan.includes(thu) ? 'ngay-nghi' : ''} ${d === homNay ? 'hom-nay' : ''}`}
                        >
                          <button
                            type="button"
                            className="o-cong"
                            style={l?.mau ? ({ '--mau-o': l.mau } as CSSProperties) : undefined}
                            onClick={() => bamO(n.id, d)}
                            aria-label={`${n.hoTen} ngày ${dinhDangNgay(d)}: ${l ? l.ten : 'chưa chấm'}${x?.gioTangCa ? `, tăng ca ${x.gioTangCa} giờ` : ''}`}
                            title={x?.ghiChu || undefined}
                          >
                            {l?.kyHieu ?? ''}
                            {!!x?.gioTangCa && <sup>+{dinhDangSoLuong(x.gioTangCa)}</sup>}
                            {x?.ghiChu && <i className="cham-ghi-chu" />}
                          </button>
                        </td>
                      );
                    })}
                    <td className="cot-tong">{dinhDangSoLuong(th?.soCong ?? 0)}</td>
                    <td className="cot-tong">{dinhDangSoLuong(th?.gioTangCa ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {chiTiet && bang && (
        <HopThoaiO
          o={chiTiet}
          tenNhanVien={bang.nhanVien.find((n) => n.id === chiTiet.nhanVienId)?.hoTen ?? ''}
          loaiCong={bang.loaiCong}
          onDong={() => setChiTiet(null)}
          onLuu={(x) => {
            ghi([x]);
            setChiTiet(null);
          }}
        />
      )}
      {suaLoai && bang && (
        <HopThoaiLoaiCong
          banDau={bang.loaiCong}
          onDong={() => setSuaLoai(false)}
          onDaLuu={() => {
            setSuaLoai(false);
            void tai();
          }}
        />
      )}
    </TrangChinh>
  );
}

function HopThoaiO({
  o,
  tenNhanVien,
  loaiCong,
  onDong,
  onLuu,
}: {
  o: OCong;
  tenNhanVien: string;
  loaiCong: LoaiCong[];
  onDong: () => void;
  onLuu: (o: OCong) => void;
}) {
  const [x, setX] = useState(o);
  return (
    <HopThoai
      tieuDe={`${tenNhanVien} — ${TEN_THU[thuCuaNgay(o.ngay)]} ${dinhDangNgay(o.ngay)}`}
      onDong={onDong}
      chanTrang={
        <div className="hang-nut">
          <button type="button" className="nut nut-phu" onClick={() => onLuu({ ...x, loaiCongId: null, gioTangCa: 0, ghiChu: '' })}>
            Xoá ô
          </button>
          <button type="button" className="nut nut-chinh" onClick={() => onLuu(x)}>
            <BieuTuong ten="luu" /> Lưu
          </button>
        </div>
      }
    >
      <ChonMot
        nhan="Công"
        value={x.loaiCongId ?? ''}
        onChange={(v) => setX((c) => ({ ...c, loaiCongId: v || null }))}
        luaChon={[{ giaTri: '', nhan: 'Không' }, ...loaiCong.map((l) => ({ giaTri: l.id, nhan: `${l.kyHieu} · ${l.ten}` }))]}
      />
      <OSo nhan="Giờ tăng ca" value={x.gioTangCa} onChange={(gioTangCa) => setX((c) => ({ ...c, gioTangCa: Math.min(24, gioTangCa) }))} />
      <OChu nhan="Ghi chú" value={x.ghiChu} onChange={(ghiChu) => setX((c) => ({ ...c, ghiChu }))} placeholder="vd: đi công trình ở Bắc Ninh" />
    </HopThoai>
  );
}

/** Sửa danh sách ký hiệu công: ký hiệu, tên, số công tính lương, màu ô */
function HopThoaiLoaiCong({ banDau, onDong, onDaLuu }: { banDau: LoaiCong[]; onDong: () => void; onDaLuu: () => void }) {
  const { thongBao } = useGiaoTiep();
  const [ds, setDs] = useState(banDau);
  const sua = (i: number, thayDoi: Partial<LoaiCong>) => setDs((d) => d.map((l, j) => (j === i ? { ...l, ...thayDoi } : l)));

  const luu = async () => {
    try {
      await apiCms.chamCong.luuLoaiCong(ds);
      thongBao('Đã lưu ký hiệu công');
      onDaLuu();
    } catch (e) {
      thongBao((e as Error).message, 'loi');
    }
  };

  return (
    <HopThoai
      tieuDe="Ký hiệu công"
      onDong={onDong}
      chanTrang={
        <div className="hang-nut">
          <button
            type="button"
            className="nut nut-vien"
            onClick={() => setDs((d) => [...d, { id: taoId(), kyHieu: '', ten: '', heSo: 1, mau: '', thuTu: d.length }])}
          >
            <BieuTuong ten="them" /> Thêm
          </button>
          <button type="button" className="nut nut-chinh" onClick={luu}>
            <BieuTuong ten="luu" /> Lưu
          </button>
        </div>
      }
    >
      <p className="goi-y-nho">“Số công” là số công tính lương của một ô: đủ công = 1, nửa công = 0,5, nghỉ không lương = 0.</p>
      <div className="ds-loai-cong">
        {ds.map((l, i) => (
          <div key={l.id} className="dong-loai-cong">
            <input className="o-nhap" aria-label="Ký hiệu" value={l.kyHieu} maxLength={6} onChange={(e) => sua(i, { kyHieu: e.target.value })} placeholder="X" />
            <input className="o-nhap" aria-label="Tên" value={l.ten} onChange={(e) => sua(i, { ten: e.target.value })} placeholder="Đủ công" />
            <OSo value={l.heSo} onChange={(heSo) => sua(i, { heSo })} aria-label="Số công" />
            <input type="color" aria-label="Màu ô" value={l.mau || '#ffffff'} onChange={(e) => sua(i, { mau: e.target.value })} />
            <button type="button" className="nut-bieu-tuong do" aria-label={`Xoá ký hiệu ${l.kyHieu}`} onClick={() => setDs((d) => d.filter((_, j) => j !== i))}>
              <BieuTuong ten="xoa" co={20} />
            </button>
          </div>
        ))}
      </div>
    </HopThoai>
  );
}
