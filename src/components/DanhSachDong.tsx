import { useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { api } from '../db/api';
import { useCotHangMuc, useTruyVan } from '../db/hooks';
import type { DongHangMuc, HangMuc } from '../db/kieu';
import { luuDongVaoDanhMuc } from '../db/thaoTac';
import { dongTuHangMuc } from '../lib/nghiepVu';
import { dinhDangTien } from '../lib/dinhDang';
import { taoId } from '../lib/id';
import { boDau, khop } from '../lib/timKiem';
import { boCucBang, cotDangHien, type CotHienThi } from '../lib/cotHangMuc';
import { chuyenViTri, useKeoTha } from '../lib/useKeoTha';
import { danhSo, laDongPhan, laDongTrong } from '../lib/phanMuc';
import { BieuTuong } from './BieuTuong';
import { HopThoai, useGiaoTiep } from './HopThoai';
import { OChu, OSo, OTien, TruongNhap } from './ONhap';
import { OGoiY } from './OGoiY';

const locHangMuc = (h: HangMuc, cauTim: string) => khop(`${h.ten} ${h.nhom} ${h.moTa}`, cauTim);

/**
 * Danh sách dòng hạng mục: dạng thẻ trên điện thoại, mỗi hạng mục một dòng như bảng tính trên máy tính.
 * Đổi thứ tự bằng cách kéo tay nắm ⠿ (chuột hoặc ngón tay) hoặc phím mũi tên lên/xuống trên tay nắm.
 * Các cột (tiêu đề, chữ gợi ý, thứ tự, ẩn/hiện, bề rộng) là dữ liệu trong DB — bảng cot_hang_muc, chỉnh trong Cài đặt;
 * cột ẩn thì các cột còn lại tự giãn ra.
 * Chỉ xếp thành bảng khi đủ chỗ cho mọi cột đang hiện, không thì giữ dạng thẻ.
 * Bảng chia được thành các phần I, II…: dòng phần chỉ có tên và cộng tiền phần, các hạng mục bên dưới thuộc phần đó
 * và được đánh số lại từ 1. Mỗi hạng mục có thể thêm các dòng chi tiết (in thành gạch đầu dòng dưới tên).
 * `phanThem` cho phép màn hình nghiệm thu chèn thêm ô "SL thực tế", "Đạt/Không đạt".
 */
export function DanhSachDong<D extends DongHangMuc>({
  dong,
  onDoi,
  taoDongMoi,
  tinhThanhTien,
  dsDonViTinh,
  nhanSoLuong,
  phanThem,
}: {
  dong: D[];
  onDoi: (dongMoi: D[]) => void;
  taoDongMoi: () => D;
  tinhThanhTien: (d: D) => number;
  /** Gợi ý ô "Đơn vị" (danh sách trong Cài đặt) */
  dsDonViTinh: string[];
  /** Ghi đè tiêu đề cột số lượng (vd. nghiệm thu: "SL theo báo giá") */
  nhanSoLuong?: string;
  phanThem?: (d: D, sua: (thayDoi: Partial<D>) => void) => ReactNode;
}) {
  const { xacNhan, thongBao } = useGiaoTiep();
  const danhMuc = useTruyVan(() => api.hangMuc.ds(), []) ?? [];
  const dsCot = useCotHangMuc();
  const cotHien = useMemo(() => cotDangHien(dsCot ?? []), [dsCot]);
  const { bien: boCuc, rongToiThieu } = useMemo(() => boCucBang(dsCot ?? []), [dsCot]);
  const khung = useRef<HTMLDivElement>(null);
  const [laBang, setLaBang] = useState(false);
  // Đo trước khi vẽ để không bị nháy từ dạng thẻ sang dạng bảng
  useLayoutEffect(() => {
    const el = khung.current;
    if (!el) return;
    const do_ = () => setLaBang(el.clientWidth >= rongToiThieu);
    do_();
    const theoDoi = new ResizeObserver(do_);
    theoDoi.observe(el);
    return () => theoDoi.disconnect();
  }, [rongToiThieu]);
  const tieuDeCot = (c: CotHienThi) => (c.truong === 'soLuong' && nhanSoLuong) || c.tieuDe;
  const [moGhiChu, setMoGhiChu] = useState<Record<string, boolean>>({});
  /** Dòng vừa bấm "Thêm dòng": đặt sẵn con trỏ vào ô tên để gõ luôn */
  const [vuaThem, setVuaThem] = useState<string | null>(null);
  const themDong = () => {
    const moi = taoDongMoi();
    setVuaThem(moi.id);
    onDoi([...dong, moi]);
  };
  /** Chưa có phần nào: phần I chèn lên đầu để gom các dòng đã có; có rồi thì thêm phần mới cuối bảng kèm một dòng trống */
  const themPhan = () => {
    const phan = { ...taoDongMoi(), loai: 'phan', quyCach: '', donViTinh: '', soLuong: 0, donGia: 0, chiTiet: [] } as D;
    setVuaThem(phan.id);
    if (!dong.some(laDongPhan)) onDoi([phan, ...(dong.length ? dong : [taoDongMoi()])]);
    else onDoi([...dong, phan, taoDongMoi()]);
  };
  /** Thêm hạng mục vào cuối phần ở vị trí i */
  const themVaoPhan = (i: number) => {
    let j = i + 1;
    while (j < dong.length && !laDongPhan(dong[j])) j++;
    const moi = taoDongMoi();
    setVuaThem(moi.id);
    onDoi([...dong.slice(0, j), moi, ...dong.slice(j)]);
  };
  /** Số thứ tự (I, II… cho phần; 1, 2… trong mỗi phần) và cộng tiền từng phần */
  const so = danhSo(dong, tinhThanhTien);
  /** Tên gọi dòng thứ i trong thông báo / nhãn: "Phần II", "Dòng II.3", "Dòng 3" */
  const tenDong = (i: number) => {
    if (so[i].laPhan) return `Phần ${so[i].stt}`;
    let phan = '';
    for (let j = i - 1; j >= 0 && !phan; j--) if (so[j].laPhan) phan = so[j].stt;
    return `Dòng ${phan ? `${phan}.` : ''}${so[i].stt}`;
  };
  /** Ô chi tiết vừa mở từ menu: đặt sẵn con trỏ vào */
  const [vuaMoChiTiet, setVuaMoChiTiet] = useState<string | null>(null);
  const [menuDong, setMenuDong] = useState<string | null>(null);
  const { dangKeo, laMucDangKeo, tayNam, kieuMuc } = useKeoTha({
    soMuc: dong.length,
    chonMuc: '.the-dong',
    onDiChuyen: (tu, den) => onDoi(chuyenViTri(dong, tu, den)),
  });
  const hienThiHangMuc = useCallback(
    (h: HangMuc) => ({
      khoa: h.id,
      chinh: h.ten,
      phu: `${h.nhom} · ${dinhDangTien(h.donGiaMacDinh)}/${h.donViTinh}${h.moTa ? ` · ${h.moTa}` : ''}`,
    }),
    [],
  );

  const sua = (i: number, thayDoi: Partial<D>) => onDoi(dong.map((d, j) => (j === i ? { ...d, ...thayDoi } : d)));

  const nhanBan = (i: number) => {
    const moi = [...dong];
    moi.splice(i + 1, 0, { ...structuredClone(dong[i]), id: taoId() });
    onDoi(moi);
  };

  const xoa = async (i: number) => {
    const d = dong[i];
    const ten = d.tenHangMuc.trim() ? ` "${d.tenHangMuc}"` : '';
    if (laDongPhan(d)) {
      if (ten && !(await xacNhan(`Xoá ${tenDong(i)}${ten}? Các hạng mục bên dưới vẫn giữ nguyên.`, { nutDongY: 'Xoá phần' }))) return;
    } else {
      if (!laDongTrong(d) && !(await xacNhan(`Xoá ${tenDong(i).toLowerCase()}${ten}?`, { nutDongY: 'Xoá dòng' }))) return;
    }
    onDoi(dong.filter((_, j) => j !== i));
  };

  const coChiTiet = (d: D) => (d.chiTiet?.length ?? 0) > 0;

  const moChiTiet = (i: number) => {
    setVuaMoChiTiet(dong[i].id);
    sua(i, { chiTiet: [''] } as Partial<D>);
  };

  const boChiTiet = async (i: number) => {
    const d = dong[i];
    if (
      d.chiTiet?.some((x) => x.trim()) &&
      !(await xacNhan(`Xoá các dòng chi tiết của ${tenDong(i).toLowerCase()}?`, { nutDongY: 'Xoá chi tiết' }))
    )
      return;
    sua(i, { chiTiet: [] as string[] } as Partial<D>);
  };

  const coGhiChu = (d: D) => Boolean(moGhiChu[d.id] || d.ghiChu);

  const boGhiChu = async (i: number) => {
    const d = dong[i];
    if (d.ghiChu.trim() && !(await xacNhan(`Xoá ghi chú của ${tenDong(i).toLowerCase()}?`, { nutDongY: 'Xoá ghi chú' }))) return;
    setMoGhiChu((m) => ({ ...m, [d.id]: false }));
    if (d.ghiChu) sua(i, { ghiChu: '' } as Partial<D>);
  };

  /** Tên (bỏ dấu) đã có trong danh mục — dựng một lần khi danh mục đổi, không bỏ dấu lại cả danh mục mỗi lần gõ phím */
  const tenTrongDanhMuc = useMemo(() => new Set(danhMuc.map((h) => boDau(h.ten))), [danhMuc]);
  const coTrongDanhMuc = (ten: string) => tenTrongDanhMuc.has(boDau(ten));

  /** Ô của một cột trong dòng thứ i: cột gắn trường có sẵn thì nhập trường đó, cột tự thêm thì nhập vào `cotThem` */
  const oCot = (c: CotHienThi, d: D, i: number): ReactNode => {
    const vo = (lop: string, noiDung: ReactNode) => (
      <div key={c.id} className={`o-cot ${lop}`} style={{ gridArea: c.vung }}>
        {noiDung}
      </div>
    );
    switch (c.truong) {
      case null:
        return vo(
          `cot-tu-them ${c.kieu === 'so' ? 'kieu-so' : ''}`,
          <OChu
            nhan={c.tieuDe}
            value={d.cotThem?.[c.id] ?? ''}
            onChange={(v) => sua(i, { cotThem: { ...d.cotThem, [c.id]: v } } as Partial<D>)}
            placeholder={c.goiY}
            inputMode={c.kieu === 'so' ? 'decimal' : undefined}
            autoComplete="off"
          />,
        );
      case 'tenHangMuc':
        return vo(
          'cot-ten',
          <OGoiY
            nhan={c.tieuDe}
            value={d.tenHangMuc}
            onChange={(v) => sua(i, { tenHangMuc: v } as Partial<D>)}
            goiY={danhMuc}
            locGoiY={locHangMuc}
            hienThi={hienThiHangMuc}
            onChon={(h) => {
              const tuDanhMuc = dongTuHangMuc(h);
              sua(i, { ...tuDanhMuc, quyCach: d.quyCach || tuDanhMuc.quyCach } as Partial<D>);
            }}
            placeholder={c.goiY}
            autoFocus={d.id === vuaThem}
          />,
        );
      case 'quyCach':
        return vo(
          'cot-quy-cach',
          <OChu nhan={c.tieuDe} value={d.quyCach} onChange={(v) => sua(i, { quyCach: v } as Partial<D>)} placeholder={c.goiY} />,
        );
      case 'donViTinh':
        return vo(
          'cot-don-vi',
          <TruongNhap nhan={c.tieuDe}>
            <input
              className="o-nhap"
              list="ds-don-vi-tinh"
              aria-label={c.tieuDe}
              value={d.donViTinh}
              placeholder={c.goiY}
              onChange={(e) => sua(i, { donViTinh: e.target.value } as Partial<D>)}
            />
          </TruongNhap>,
        );
      case 'soLuong':
        return vo(
          'cot-so-luong',
          <OSo nhan={tieuDeCot(c)} value={d.soLuong} onChange={(v) => sua(i, { soLuong: v } as Partial<D>)} placeholder={c.goiY} />,
        );
      case 'donGia':
        return vo(
          'cot-don-gia',
          <OTien nhan={c.tieuDe} value={d.donGia} onChange={(v) => sua(i, { donGia: v } as Partial<D>)} placeholder={c.goiY} />,
        );
      case 'thanhTien':
        return vo(
          'thanh-tien-dong',
          <>
            <span className="chu-phu-bang">{c.tieuDe}: </span>
            <strong>{dinhDangTien(tinhThanhTien(d))}</strong>
          </>,
        );
    }
  };

  /* ---------- Menu thao tác ---------- */

  const iMenu = menuDong ? dong.findIndex((d) => d.id === menuDong) : -1;
  const dMenu = iMenu >= 0 ? dong[iMenu] : null;
  const dongMenu = () => setMenuDong(null);

  return (
    <div
      ref={khung}
      className={['danh-sach-dong', laBang && 'dang-bang', dangKeo && 'co-keo'].filter(Boolean).join(' ')}
      style={boCuc as CSSProperties}
    >
      {dsCot && cotHien.length === 0 && (
        <p className="canh-bao-loi">
          Bảng hạng mục chưa có cột nào. Vào Cài đặt → Bảng hạng mục để bật cột, hoặc nạp dữ liệu ban đầu (npm run db:seed).
        </p>
      )}

      {/* Hàng tiêu đề cột — chỉ hiện trên máy tính, khi các dòng xếp thành bảng */}
      <div className="dau-bang-dong" aria-hidden="true">
        <span>#</span>
        {cotHien.map((c) => (
          <span key={c.id} className={c.kieu === 'so' ? 'so' : undefined}>
            {tieuDeCot(c)}
          </span>
        ))}
        <span />
      </div>

      {dong.map((d, i) => {
        const lop = ['the-dong', laMucDangKeo(i) && 'dang-keo', so[i].laPhan && 'the-phan'].filter(Boolean).join(' ');
        const dauDong = (
          <div className="dau-dong">
            <button
              type="button"
              className="tay-nam"
              aria-label={`${tenDong(i)}: kéo để đổi vị trí, hoặc bấm phím mũi tên lên/xuống`}
              title="Kéo để đổi vị trí"
              {...tayNam(i, d.id)}
            >
              <BieuTuong ten="keoTha" co={22} />
            </button>
            <span className={so[i].laPhan ? 'stt stt-phan' : 'stt'}>{so[i].stt}</span>
          </div>
        );
        const nutMenu = (
          <div className="thao-tac-dong">
            <button
              type="button"
              className="nut-nho nut-them-thao-tac"
              onClick={() => setMenuDong(d.id)}
              aria-label={`Thao tác ${tenDong(i).toLowerCase()}`}
              title="Thao tác khác"
            >
              <BieuTuong ten="baCham" co={22} />
            </button>
          </div>
        );

        if (so[i].laPhan)
          return (
            <div className={lop} key={d.id} style={kieuMuc(i)}>
              {dauDong}
              <div className="cot-ten-phan">
                <OChu
                  nhan={`Tên phần ${so[i].stt}`}
                  value={d.tenHangMuc}
                  onChange={(v) => sua(i, { tenHangMuc: v } as Partial<D>)}
                  placeholder="VD: Phần khung thép, Phần lắp đặt…"
                  autoComplete="off"
                  autoFocus={d.id === vuaThem}
                />
              </div>
              <div className="tong-phan">
                <span className="chu-phu-bang">Cộng phần {so[i].stt}: </span>
                <strong>{dinhDangTien(so[i].tien)}</strong>
              </div>
              {nutMenu}
            </div>
          );

        return (
        <div className={lop} key={d.id} style={kieuMuc(i)}>
          {dauDong}
          {cotHien.map((c) => oCot(c, d, i))}

          {coChiTiet(d) && (
            <div className="cot-chi-tiet">
              <TruongNhap nhan="Chi tiết — mỗi dòng in thành một gạch đầu dòng">
                <textarea
                  className="o-nhap"
                  aria-label={`Chi tiết ${tenDong(i).toLowerCase()}`}
                  rows={Math.max(2, d.chiTiet?.length ?? 0)}
                  value={(d.chiTiet ?? []).join('\n')}
                  onChange={(e) => sua(i, { chiTiet: e.target.value.split('\n') } as Partial<D>)}
                  placeholder={'VD:\nTôn lạnh 0,45mm\nTôn màu 0,4mm\nTôn cách nhiệt PU'}
                  autoFocus={d.id === vuaMoChiTiet}
                />
              </TruongNhap>
              <button
                type="button"
                className="nut-bieu-tuong bo-ghi-chu"
                onClick={() => boChiTiet(i)}
                aria-label={`Bỏ chi tiết ${tenDong(i).toLowerCase()}`}
                title="Bỏ chi tiết"
              >
                <BieuTuong ten="dong" />
              </button>
            </div>
          )}

          {phanThem && <div className="cot-them">{phanThem(d, (thayDoi) => sua(i, thayDoi))}</div>}

          {coGhiChu(d) ? (
            <div className="cot-ghi-chu">
              <OChu
                nhan="Ghi chú dòng"
                value={d.ghiChu}
                onChange={(v) => sua(i, { ghiChu: v } as Partial<D>)}
                placeholder="Ghi chú cho dòng này"
                // Chỉ tự đặt con trỏ khi vừa bấm "Thêm ghi chú", không phải lúc mở trang
                autoFocus={moGhiChu[d.id] && !d.ghiChu}
              />
              <button
                type="button"
                className="nut-bieu-tuong bo-ghi-chu"
                onClick={() => boGhiChu(i)}
                aria-label={`Bỏ ghi chú ${tenDong(i).toLowerCase()}`}
                title="Bỏ ghi chú"
              >
                <BieuTuong ten="dong" />
              </button>
            </div>
          ) : null}

          {nutMenu}

          {d.tenHangMuc.trim() && !coTrongDanhMuc(d.tenHangMuc) && (
            <button
              type="button"
              className="luu-danh-muc"
              title="Lần sau gõ vài chữ là chọn được ngay"
              onClick={async () => {
                await luuDongVaoDanhMuc(d);
                thongBao(`Đã lưu "${d.tenHangMuc}" vào danh mục`);
              }}
            >
              <BieuTuong ten="luu" co={18} /> Lưu vào danh mục
            </button>
          )}
        </div>
        );
      })}

      {dong.length === 0 && (
        <p className="dong-trong">
          Chưa có hạng mục nào — bấm “Thêm dòng” rồi gõ tên để chọn nhanh từ danh mục. Cần chia I, II… thì bấm “Thêm phần”.
        </p>
      )}

      <datalist id="ds-don-vi-tinh">
        {dsDonViTinh.map((dv) => (
          <option key={dv} value={dv} />
        ))}
      </datalist>

      <div className="hang-nut-them-dong">
        <button type="button" className="nut nut-them-dong" onClick={themDong}>
          <BieuTuong ten="them" /> Thêm dòng
        </button>
        <button type="button" className="nut nut-them-dong nut-them-phan" onClick={themPhan} title="Chia bảng thành các phần I, II, III…">
          <BieuTuong ten="them" /> Thêm phần
        </button>
      </div>

      {dMenu && laDongPhan(dMenu) && (
        <HopThoai tieuDe={`${tenDong(iMenu)}${dMenu.tenHangMuc.trim() ? `: ${dMenu.tenHangMuc}` : ''}`} onDong={dongMenu}>
          <div className="hang-nut doc menu-dong">
            <button
              type="button"
              className="nut nut-phu"
              onClick={() => {
                dongMenu();
                themVaoPhan(iMenu);
              }}
            >
              <BieuTuong ten="them" /> Thêm hạng mục vào phần này
            </button>
            <button
              type="button"
              className="nut nut-vien-do"
              onClick={() => {
                dongMenu();
                xoa(iMenu);
              }}
            >
              <BieuTuong ten="xoa" /> Xoá phần (giữ các hạng mục)
            </button>
          </div>
        </HopThoai>
      )}

      {dMenu && !laDongPhan(dMenu) && (
        <HopThoai tieuDe={`${tenDong(iMenu)}${dMenu.tenHangMuc.trim() ? `: ${dMenu.tenHangMuc}` : ''}`} onDong={dongMenu}>
          <div className="hang-nut doc menu-dong">
            <button
              type="button"
              className="nut nut-phu"
              onClick={() => {
                nhanBan(iMenu);
                dongMenu();
                thongBao(`Đã nhân bản ${tenDong(iMenu).toLowerCase()}`);
              }}
            >
              <BieuTuong ten="nhanBan" /> Nhân bản dòng
            </button>
            {coChiTiet(dMenu) ? (
              <button
                type="button"
                className="nut nut-phu"
                onClick={() => {
                  dongMenu();
                  boChiTiet(iMenu);
                }}
              >
                <BieuTuong ten="dong" /> Bỏ chi tiết
              </button>
            ) : (
              <button
                type="button"
                className="nut nut-phu"
                onClick={() => {
                  moChiTiet(iMenu);
                  dongMenu();
                }}
              >
                <BieuTuong ten="danhSach" /> Thêm chi tiết (gạch đầu dòng)
              </button>
            )}
            {coGhiChu(dMenu) ? (
              <button
                type="button"
                className="nut nut-phu"
                onClick={() => {
                  dongMenu();
                  boGhiChu(iMenu);
                }}
              >
                <BieuTuong ten="dong" /> Bỏ ghi chú
              </button>
            ) : (
              <button
                type="button"
                className="nut nut-phu"
                onClick={() => {
                  setMoGhiChu((m) => ({ ...m, [dMenu.id]: true }));
                  dongMenu();
                }}
              >
                <BieuTuong ten="sua" /> Thêm ghi chú
              </button>
            )}
            <button
              type="button"
              className="nut nut-vien-do"
              onClick={() => {
                dongMenu();
                xoa(iMenu);
              }}
            >
              <BieuTuong ten="xoa" /> Xoá dòng
            </button>
          </div>
        </HopThoai>
      )}
    </div>
  );
}
