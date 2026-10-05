import { useId, useState } from 'react';
import { BieuTuong } from '../components/BieuTuong';
import { HopThoai, useGiaoTiep } from '../components/HopThoai';
import { OTim, TrangChinh, Trong } from '../components/KhungTrang';
import { ChonMot, OChu, OTien, TruongNhap } from '../components/ONhap';
import { api } from '../db/api';
import { useCaiDat, useTruyVan } from '../db/hooks';
import type { CaiDat, HangMuc } from '../db/kieu';
import { dinhDangTien } from '../lib/dinhDang';
import { taoId } from '../lib/id';
import { donViTinhMacDinh } from '../lib/nghiepVu';
import { khop } from '../lib/timKiem';

/** Hạng mục mới: đơn vị đầu tiên trong Cài đặt, chưa chọn nhóm (máy chủ xếp vào nhóm mặc định nếu để trống) */
const hangMucTrong = (cd: CaiDat): HangMuc => ({
  id: taoId(),
  ten: '',
  donViTinh: donViTinhMacDinh(cd),
  donGiaMacDinh: 0,
  nhom: '',
  moTa: '',
});

export function HangMucTrang() {
  const cd = useCaiDat();
  const ds = useTruyVan(() => api.hangMuc.ds(), []);
  const [cauTim, setCauTim] = useState('');
  const [nhom, setNhom] = useState('tatCa');
  const [dangSua, setDangSua] = useState<{ hm: HangMuc; moi: boolean } | null>(null);

  const cacNhom = Array.from(new Set([...cd.nhomHangMuc, ...(ds ?? []).map((h) => h.nhom)]));
  const loc = (ds ?? []).filter(
    (h) => (nhom === 'tatCa' || h.nhom === nhom) && khop(`${h.ten} ${h.moTa} ${h.nhom}`, cauTim),
  );
  const theoNhom = cacNhom
    .map((n) => ({ nhom: n, ds: loc.filter((h) => h.nhom === n) }))
    .filter((g) => g.ds.length);

  return (
    <TrangChinh tieuDe="Danh mục hạng mục" phuDe={ds ? `${ds.length} hạng mục — gõ tên trong báo giá là chọn được ngay` : undefined}>
      <div className="thanh-cong-cu">
        <OTim value={cauTim} onChange={setCauTim} placeholder="Tìm hạng mục" />
        <button type="button" className="nut nut-chinh" onClick={() => setDangSua({ hm: hangMucTrong(cd), moi: true })}>
          <BieuTuong ten="them" /> Thêm hạng mục
        </button>
      </div>
      <div className="loc-chip" role="radiogroup" aria-label="Lọc theo nhóm">
        {['tatCa', ...cacNhom].map((n) => {
          const so = n === 'tatCa' ? (ds ?? []).length : (ds ?? []).filter((h) => h.nhom === n).length;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={nhom === n}
              className={`chip ${nhom === n ? 'dang-chon' : ''}`}
              onClick={() => setNhom(n)}
            >
              {n === 'tatCa' ? 'Tất cả' : n}
              <span className="dem">{so}</span>
            </button>
          );
        })}
      </div>
      {!ds && <p className="dang-tai">Đang tải…</p>}
      {ds && loc.length === 0 && <Trong bieuTuong={cauTim ? 'tim' : 'danhSach'}>Không có hạng mục nào.</Trong>}
      {theoNhom.map((g) => (
        <section key={g.nhom} className="nhom-hang-muc">
          <h2>
            {g.nhom} <span className="dem">{g.ds.length}</span>
          </h2>
          <ul className="ds-don">
            {g.ds.map((h) => (
              <li key={h.id}>
                <button type="button" className="dong-don" onClick={() => setDangSua({ hm: h, moi: false })}>
                  <span className="dong-don-ten">
                    <strong>{h.ten}</strong>
                    {h.moTa && <small>{h.moTa}</small>}
                  </span>
                  <span className="dong-don-gia">
                    {dinhDangTien(h.donGiaMacDinh)}
                    <small>/{h.donViTinh}</small>
                  </span>
                  <BieuTuong ten="muiTenPhai" co={20} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {dangSua && (
        <HopThoaiHangMuc
          banDau={dangSua.hm}
          moi={dangSua.moi}
          cacNhom={cacNhom}
          dsDonViTinh={cd.danhSachDonViTinh}
          onDong={() => setDangSua(null)}
        />
      )}
    </TrangChinh>
  );
}

function HopThoaiHangMuc({
  banDau,
  moi,
  cacNhom,
  dsDonViTinh,
  onDong,
}: {
  banDau: HangMuc;
  moi: boolean;
  cacNhom: string[];
  dsDonViTinh: string[];
  onDong: () => void;
}) {
  const { xacNhan, thongBao } = useGiaoTiep();
  const [hm, setHm] = useState(banDau);
  const idDvt = useId();
  const doi = (thayDoi: Partial<HangMuc>) => setHm((h) => ({ ...h, ...thayDoi }));

  const luu = async () => {
    if (!hm.ten.trim()) {
      thongBao('Vui lòng nhập tên hạng mục', 'loi');
      return;
    }
    try {
      await api.hangMuc.luu({ ...hm, ten: hm.ten.trim() });
    } catch (e) {
      thongBao((e as Error).message, 'loi');
      return;
    }
    thongBao(moi ? 'Đã thêm hạng mục' : 'Đã lưu thay đổi');
    onDong();
  };

  const xoa = async () => {
    if (!(await xacNhan(`Xoá hạng mục "${hm.ten}" khỏi danh mục?\nCác báo giá đã lập không bị ảnh hưởng.`, { nutDongY: 'Xoá' })))
      return;
    await api.hangMuc.xoa(hm.id);
    thongBao('Đã xoá hạng mục');
    onDong();
  };

  return (
    <HopThoai
      tieuDe={moi ? 'Thêm hạng mục' : 'Sửa hạng mục'}
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
      <OChu nhan="Tên hạng mục *" value={hm.ten} onChange={(ten) => doi({ ten })} autoFocus={moi} />
      <ChonMot nhan="Nhóm" value={hm.nhom} onChange={(nhom) => doi({ nhom })} luaChon={cacNhom.map((n) => ({ giaTri: n, nhan: n }))} />
      <div className="luoi-2">
        <TruongNhap nhan="Đơn vị tính" id={idDvt}>
          <input
            id={idDvt}
            className="o-nhap"
            list="ds-dvt-danh-muc"
            value={hm.donViTinh}
            onChange={(e) => doi({ donViTinh: e.target.value })}
          />
          <datalist id="ds-dvt-danh-muc">
            {dsDonViTinh.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </TruongNhap>
        <OTien nhan="Đơn giá mặc định" value={hm.donGiaMacDinh} onChange={(donGiaMacDinh) => doi({ donGiaMacDinh })} />
      </div>
      <OChu
        nhan="Mô tả / quy cách mặc định"
        value={hm.moTa}
        onChange={(moTa) => doi({ moTa })}
        placeholder="Tự điền vào cột Quy cách khi chọn"
      />
    </HopThoai>
  );
}
