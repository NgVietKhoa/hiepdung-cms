import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BieuTuong } from '../../components/BieuTuong';
import { BangCuon, OSoLieu } from '../../components/ChungCms';
import { HopThoai, useGiaoTiep } from '../../components/HopThoai';
import { NhanTrangThai, OTim, TrangChinh, Trong } from '../../components/KhungTrang';
import { ChonMot, OChu, OSo, TruongNhap } from '../../components/ONhap';
import { useCaiDat, useTruyVan } from '../../db/hooks';
import { dinhDangNgay, dinhDangSoLuong, dinhDangTien } from '../../lib/dinhDang';
import { taoId } from '../../lib/id';
import { khop } from '../../lib/timKiem';
import { apiCms } from '../api';
import type { VatTu, VatTuTon } from './kieu';

export const vatTuTrong = (donViTinh = ''): VatTu => ({
  id: taoId(),
  maVatTu: '',
  ten: '',
  donViTinh,
  nhom: '',
  quyCach: '',
  tonToiThieu: 0,
  ghiChu: '',
  ngungDung: false,
});

const sapHet = (v: VatTuTon) => !v.ngungDung && v.tonToiThieu > 0 && v.tonKho < v.tonToiThieu;

export function KhoTrang() {
  const cd = useCaiDat();
  const ds = useTruyVan(() => apiCms.kho.dsVatTu(), []);
  const [cauTim, setCauTim] = useState('');
  const [nhom, setNhom] = useState('tatCa');
  const [dangSua, setDangSua] = useState<{ vt: VatTu; moi: boolean } | null>(null);
  const [theKho, setTheKho] = useState<VatTuTon | null>(null);

  const cacNhom = [...new Set([...cd.nhomVatTu, ...(ds ?? []).map((v) => v.nhom).filter(Boolean)])];
  const loc = (ds ?? []).filter(
    (v) =>
      (nhom === 'tatCa' ? !v.ngungDung : nhom === 'sapHet' ? sapHet(v) : nhom === 'ngungDung' ? v.ngungDung : v.nhom === nhom && !v.ngungDung) &&
      khop(`${v.maVatTu} ${v.ten} ${v.quyCach} ${v.nhom}`, cauTim),
  );
  const giaTriTon = (ds ?? []).reduce((s, v) => s + Math.max(0, v.tonKho) * v.giaNhapGanNhat, 0);
  const soSapHet = (ds ?? []).filter(sapHet).length;

  return (
    <TrangChinh tieuDe="Vật tư & tồn kho" phuDe={ds ? `${ds.filter((v) => !v.ngungDung).length} vật tư đang dùng` : undefined}>
      <div className="luoi-so-lieu">
        <OSoLieu nhan="Giá trị tồn (ước tính)" giaTri={dinhDangTien(giaTriTon)} bieuTuong="kho" phu="Theo giá nhập gần nhất" />
        <OSoLieu nhan="Sắp hết" giaTri={soSapHet} bieuTuong="canhBao" loai={soSapHet ? 'xau' : undefined} onClick={() => setNhom('sapHet')} />
        <OSoLieu nhan="Phiếu nhập / xuất" giaTri="Xem phiếu" bieuTuong="nhap" den="/phieu-kho" phu="Lịch sử nhập, xuất theo tháng" />
      </div>
      <div className="thanh-cong-cu">
        <OTim value={cauTim} onChange={setCauTim} placeholder="Tìm mã, tên, quy cách vật tư" />
        <div className="hang-nut">
          <Link to="/phieu-kho/moi?loai=nhap" className="nut nut-vien">
            <BieuTuong ten="nhap" /> Nhập kho
          </Link>
          <Link to="/phieu-kho/moi?loai=xuat" className="nut nut-vien">
            <BieuTuong ten="xuat" /> Xuất kho
          </Link>
          <button type="button" className="nut nut-chinh" onClick={() => setDangSua({ vt: vatTuTrong(cd.danhSachDonViTinh[0]), moi: true })}>
            <BieuTuong ten="them" /> Vật tư
          </button>
        </div>
      </div>
      <div className="loc-chip" role="radiogroup" aria-label="Lọc theo nhóm">
        {[
          ['tatCa', 'Tất cả'],
          ['sapHet', 'Sắp hết'],
          ...cacNhom.map((n) => [n, n]),
          ['ngungDung', 'Ngừng dùng'],
        ].map(([gt, nhan]) => (
          <button key={gt} type="button" role="radio" aria-checked={nhom === gt} className={`chip ${nhom === gt ? 'dang-chon' : ''}`} onClick={() => setNhom(gt)}>
            {nhan}
          </button>
        ))}
      </div>
      {!ds && <p className="dang-tai">Đang tải…</p>}
      {ds && loc.length === 0 && <Trong bieuTuong="kho">{cauTim ? 'Không tìm thấy vật tư.' : 'Chưa có vật tư nào.'}</Trong>}
      {loc.length > 0 && (
        <BangCuon>
          <thead>
            <tr>
              <th>Vật tư</th>
              <th>Nhóm</th>
              <th className="so">Tồn kho</th>
              <th className="so">Giá nhập gần nhất</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loc.map((v) => (
              <tr key={v.id} className="dong-bam" onClick={() => setTheKho(v)}>
                <td>
                  <strong>{v.ten}</strong>
                  <small className="khoi">{[v.maVatTu, v.quyCach].filter(Boolean).join(' · ')}</small>
                </td>
                <td>{v.nhom}</td>
                <td className={`so dam ${sapHet(v) ? 'chu-loi' : ''}`}>
                  {dinhDangSoLuong(v.tonKho)} {v.donViTinh}
                  {sapHet(v) && <small className="khoi">tối thiểu {dinhDangSoLuong(v.tonToiThieu)}</small>}
                </td>
                <td className="so">{v.giaNhapGanNhat ? dinhDangTien(v.giaNhapGanNhat) : '—'}</td>
                <td>
                  <button
                    type="button"
                    className="nut-bieu-tuong"
                    aria-label={`Sửa ${v.ten}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDangSua({ vt: v, moi: false });
                    }}
                  >
                    <BieuTuong ten="sua" co={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </BangCuon>
      )}
      <p className="goi-y-nho cach-tren">Bấm vào một vật tư để xem thẻ kho (lịch sử nhập, xuất).</p>
      {dangSua && <HopThoaiVatTu banDau={dangSua.vt} moi={dangSua.moi} cacNhom={cacNhom} onDong={() => setDangSua(null)} />}
      {theKho && <HopThoaiTheKho vt={theKho} onDong={() => setTheKho(null)} />}
    </TrangChinh>
  );
}

export function HopThoaiVatTu({
  banDau,
  moi,
  cacNhom,
  onDong,
  onDaLuu,
}: {
  banDau: VatTu;
  moi: boolean;
  cacNhom: string[];
  onDong: () => void;
  onDaLuu?: (v: VatTu) => void;
}) {
  const cd = useCaiDat();
  const { xacNhan, thongBao } = useGiaoTiep();
  const [vt, setVt] = useState(banDau);
  const doi = (thayDoi: Partial<VatTu>) => setVt((v) => ({ ...v, ...thayDoi }));

  const luu = async () => {
    if (!vt.ten.trim()) return thongBao('Nhập tên vật tư', 'loi');
    try {
      const kq = await apiCms.kho.luuVatTu(vt);
      thongBao(moi ? 'Đã thêm vật tư' : 'Đã lưu thay đổi');
      onDaLuu?.(kq);
      onDong();
    } catch (e) {
      thongBao((e as Error).message, 'loi');
    }
  };
  const xoa = async () => {
    if (!(await xacNhan(`Xoá vật tư "${vt.ten}"?`, { nutDongY: 'Xoá' }))) return;
    try {
      await apiCms.kho.xoaVatTu(vt.id);
      thongBao('Đã xoá vật tư');
      onDong();
    } catch (e) {
      thongBao((e as Error).message, 'loi');
    }
  };

  return (
    <HopThoai
      tieuDe={moi ? 'Thêm vật tư' : 'Sửa vật tư'}
      onDong={onDong}
      chanTrang={
        <div className="hang-nut">
          {!moi && (
            <button type="button" className="nut nut-vien-do" onClick={xoa}>
              Xoá
            </button>
          )}
          <button type="button" className="nut nut-chinh" onClick={luu}>
            <BieuTuong ten="luu" /> Lưu
          </button>
        </div>
      }
    >
      <OChu nhan="Tên vật tư *" value={vt.ten} onChange={(ten) => doi({ ten })} autoFocus={moi} placeholder="vd: Thép tấm SS400 5ly" />
      <div className="luoi-2">
        <OChu nhan="Mã vật tư" value={vt.maVatTu} onChange={(maVatTu) => doi({ maVatTu })} />
        <TruongNhap nhan="Đơn vị tính" id={`dvt-${vt.id}`}>
          <input id={`dvt-${vt.id}`} className="o-nhap" list="ds-dvt-vat-tu" value={vt.donViTinh} onChange={(e) => doi({ donViTinh: e.target.value })} />
          <datalist id="ds-dvt-vat-tu">
            {cd.danhSachDonViTinh.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </TruongNhap>
      </div>
      {cacNhom.length > 0 && <ChonMot nhan="Nhóm" value={vt.nhom} onChange={(nhom) => doi({ nhom })} luaChon={cacNhom.map((n) => ({ giaTri: n, nhan: n }))} />}
      <OChu nhan="Quy cách" value={vt.quyCach} onChange={(quyCach) => doi({ quyCach })} placeholder="Kích thước, mác thép…" />
      <OSo nhan="Tồn tối thiểu (cảnh báo khi dưới mức này, 0 = không cảnh báo)" value={vt.tonToiThieu} onChange={(tonToiThieu) => doi({ tonToiThieu })} />
      <OChu nhan="Ghi chú" value={vt.ghiChu} onChange={(ghiChu) => doi({ ghiChu })} nhieuDong />
      <label className={`o-tich ${vt.ngungDung ? 'dang-chon' : ''}`}>
        <input type="checkbox" checked={vt.ngungDung} onChange={(e) => doi({ ngungDung: e.target.checked })} />
        Ngừng dùng (ẩn khỏi danh sách chọn)
      </label>
    </HopThoai>
  );
}

function HopThoaiTheKho({ vt, onDong }: { vt: VatTuTon; onDong: () => void }) {
  const the = useTruyVan(() => apiCms.kho.theKho(vt.id), [vt.id]);
  return (
    <HopThoai tieuDe={`Thẻ kho: ${vt.ten}`} onDong={onDong}>
      <p>
        Tồn hiện tại:{' '}
        <strong>
          {dinhDangSoLuong(vt.tonKho)} {vt.donViTinh}
        </strong>
      </p>
      {!the && <p className="dang-tai">Đang tải…</p>}
      {the && the.length === 0 && <p className="goi-y-nho">Chưa có phiếu nhập / xuất nào.</p>}
      {!!the?.length && (
        <ul className="ds-don">
          {the.map((d) => (
            <li key={d.phieuKhoId}>
              <Link to={`/phieu-kho/${d.phieuKhoId}`} className="dong-don">
                <span className={`dau-phieu ${d.loai === 'nhap' ? 'thu' : 'chi'}`} aria-hidden="true">
                  <BieuTuong ten={d.loai === 'nhap' ? 'nhap' : 'xuat'} co={18} />
                </span>
                <span className="dong-don-ten">
                  <strong>
                    {d.loai === 'nhap' ? '+' : '−'}
                    {dinhDangSoLuong(d.soLuong)} {vt.donViTinh}
                  </strong>
                  <small>
                    {d.soPhieu} · {dinhDangNgay(d.ngay)} {d.dienGiai && `· ${d.dienGiai}`}
                  </small>
                </span>
                <NhanTrangThai loai="nhap" nhan={`Tồn ${dinhDangSoLuong(d.tonSau)}`} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </HopThoai>
  );
}
