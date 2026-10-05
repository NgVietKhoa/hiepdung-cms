/**
 * Soạn phiếu nhập / xuất kho. Bấm "Lưu" mới ghi (không tự lưu) vì máy chủ kiểm tra tồn kho:
 * xuất vượt tồn thì báo lỗi và không ghi gì.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BieuTuong } from '../../components/BieuTuong';
import { OChon } from '../../components/ChungCms';
import { useGiaoTiep } from '../../components/HopThoai';
import { The, TrangSoan } from '../../components/KhungTrang';
import { OChu, ONgay, OSo, OTien } from '../../components/ONhap';
import { OGoiY } from '../../components/OGoiY';
import { api } from '../../db/api';
import { useCaiDat, useTruyVan } from '../../db/hooks';
import { dinhDangSoLuong, dinhDangTien, homNayISO } from '../../lib/dinhDang';
import { taoId } from '../../lib/id';
import { khop } from '../../lib/timKiem';
import { thanhTien } from '../../lib/tinhTien';
import { apiCms } from '../api';
import { NHAN_LOAI_PHIEU_KHO, tongPhieuKho, type DongPhieuKho, type LoaiPhieuKho, type PhieuKho, type VatTuTon } from './kieu';
import { HopThoaiVatTu, vatTuTrong } from './KhoTrang';

const phieuTrong = (id: string, loai: LoaiPhieuKho): PhieuKho => ({
  id,
  loai,
  soPhieu: '',
  ngay: homNayISO(),
  nhaCungCapId: null,
  hoaDonId: null,
  baoGiaId: null,
  nguoiGiaoNhan: '',
  ghiChu: '',
  nguoiLap: '',
  danhSachDong: [],
  ngayTao: Date.now(),
  ngaySua: Date.now(),
});

export function PhieuKhoSua() {
  const { id: idTrenDuong = '' } = useParams();
  const [thamSo] = useSearchParams();
  const dieuHuong = useNavigate();
  const { xacNhan, thongBao } = useGiaoTiep();
  const cd = useCaiDat();
  const laMoi = idTrenDuong === 'moi';
  const [p, setP] = useState<PhieuKho>();
  const [thayDoi, setThayDoi] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState('');
  const [timVatTu, setTimVatTu] = useState('');
  const [themVatTu, setThemVatTu] = useState<string | null>(null);

  useEffect(() => {
    if (laMoi) {
      setP(phieuTrong(taoId(), thamSo.get('loai') === 'xuat' ? 'xuat' : 'nhap'));
      return;
    }
    apiCms.kho
      .layPhieu(idTrenDuong)
      .then((x) => (x ? setP(x) : setLoi('Không tìm thấy phiếu này (có thể đã bị xoá).')))
      .catch((e) => setLoi((e as Error).message));
  }, [idTrenDuong]);

  const duLieu = useTruyVan(async () => {
    const [vatTu, ncc, baoGia] = await Promise.all([
      apiCms.kho.dsVatTu(),
      apiCms.hoaDon.dsNhaCungCap(),
      api.baoGia.ds(),
    ]);
    return { vatTu, ncc, baoGia: baoGia.filter((b) => b.trangThai === 'daChot' || b.trangThai === 'daGui') };
  }, []);

  if (!p) {
    return (
      <TrangSoan tieuDe="Phiếu kho" quayVe="/phieu-kho">
        {loi ? <div className="canh-bao-loi">{loi}</div> : <p className="dang-tai">Đang tải…</p>}
      </TrangSoan>
    );
  }

  const doi = (x: Partial<PhieuKho>) => {
    setP((c) => (c ? { ...c, ...x } : c));
    setThayDoi(true);
  };
  const doiDong = (i: number, x: Partial<DongPhieuKho>) => doi({ danhSachDong: p.danhSachDong.map((d, j) => (j === i ? { ...d, ...x } : d)) });
  const vatTuTheoId = new Map((duLieu?.vatTu ?? []).map((v) => [v.id, v]));
  const nhap = p.loai === 'nhap';

  const themDong = (v: VatTuTon | { id: string; giaNhapGanNhat?: number }) => {
    const daCo = p.danhSachDong.findIndex((d) => d.vatTuId === v.id);
    if (daCo >= 0) return thongBao('Vật tư này đã có trong phiếu — sửa số lượng ở dòng đó');
    doi({ danhSachDong: [...p.danhSachDong, { id: taoId(), vatTuId: v.id, soLuong: 1, donGia: nhap ? (v.giaNhapGanNhat ?? 0) : 0, ghiChu: '' }] });
    setTimVatTu('');
  };

  const luu = async () => {
    setDangLuu(true);
    setLoi('');
    try {
      const kq = await apiCms.kho.luuPhieu(p);
      setP(kq);
      setThayDoi(false);
      thongBao(`Đã lưu phiếu ${kq.soPhieu}`);
      if (laMoi) dieuHuong(`/phieu-kho/${kq.id}`, { replace: true });
    } catch (e) {
      setLoi((e as Error).message);
    } finally {
      setDangLuu(false);
    }
  };
  const xoa = async () => {
    if (laMoi) return dieuHuong('/phieu-kho');
    if (!(await xacNhan(`Xoá phiếu ${p.soPhieu}? Tồn kho sẽ được tính lại.`, { nutDongY: 'Xoá' }))) return;
    try {
      await apiCms.kho.xoaPhieu(p.id);
      thongBao('Đã xoá phiếu');
      dieuHuong('/phieu-kho', { replace: true });
    } catch (e) {
      thongBao((e as Error).message, 'loi');
    }
  };

  return (
    <TrangSoan
      tieuDe={laMoi ? `${NHAN_LOAI_PHIEU_KHO[p.loai]} — phiếu mới` : `${NHAN_LOAI_PHIEU_KHO[p.loai]} ${p.soPhieu}`}
      phuDe={thayDoi ? 'Có thay đổi chưa lưu' : p.nguoiLap ? `Người lập: ${p.nguoiLap}` : undefined}
      quayVe={`/phieu-kho?thang=${p.ngay.slice(0, 7)}`}
      thanhDuoi={
        <div className="hang-nut">
          <button type="button" className="nut nut-vien-do" onClick={xoa}>
            <BieuTuong ten="xoa" /> {laMoi ? 'Bỏ' : 'Xoá'}
          </button>
          <button type="button" className="nut nut-chinh" disabled={dangLuu || (!thayDoi && !laMoi)} onClick={luu}>
            <BieuTuong ten="luu" /> {dangLuu ? 'Đang lưu…' : 'Lưu phiếu'}
          </button>
        </div>
      }
    >
      {loi && (
        <div className="canh-bao-loi" role="alert">
          <BieuTuong ten="canhBao" /> {loi}
        </div>
      )}
      <div className="bo-cuc-soan">
        <The tieuDe="Thông tin phiếu" bieuTuong={nhap ? 'nhap' : 'xuat'}>
          <div className="luoi-2">
            <ONgay nhan="Ngày" value={p.ngay} onChange={(ngay) => doi({ ngay })} />
            <OChu nhan="Số phiếu" value={p.soPhieu} onChange={(soPhieu) => doi({ soPhieu })} placeholder="Để trống — tự cấp khi lưu" />
          </div>
          {nhap ? (
            <OChon
              nhan="Nhà cung cấp"
              value={p.nhaCungCapId ?? ''}
              onChange={(v) => doi({ nhaCungCapId: v || null })}
              trong="— Không chọn —"
              luaChon={(duLieu?.ncc ?? []).map((n) => ({ giaTri: n.id, nhan: n.tenCongTy }))}
            />
          ) : (
            <OChon
              nhan="Xuất cho đơn hàng (báo giá đã gửi / đã chốt)"
              value={p.baoGiaId ?? ''}
              onChange={(v) => doi({ baoGiaId: v || null })}
              trong="— Không gắn —"
              luaChon={(duLieu?.baoGia ?? []).map((b) => ({ giaTri: b.id, nhan: `${b.so}${b.tieuDe ? ` — ${b.tieuDe}` : ''}` }))}
            />
          )}
          <OChu nhan={nhap ? 'Người giao hàng' : 'Người nhận hàng'} value={p.nguoiGiaoNhan} onChange={(nguoiGiaoNhan) => doi({ nguoiGiaoNhan })} />
          <OChu nhan="Ghi chú" value={p.ghiChu} onChange={(ghiChu) => doi({ ghiChu })} />
        </The>

        <The tieuDe="Vật tư" bieuTuong="kho">
          {p.danhSachDong.length > 0 && (
            <div className="bang-cuon">
              <table className="bang-nhap">
                <thead>
                  <tr>
                    <th>Vật tư</th>
                    <th className="so">Số lượng</th>
                    <th className="so">{nhap ? 'Đơn giá nhập' : 'Đơn giá'}</th>
                    <th className="so">Thành tiền</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {p.danhSachDong.map((d, i) => {
                    const v = vatTuTheoId.get(d.vatTuId);
                    return (
                      <tr key={d.id}>
                        <td>
                          <strong>{v?.ten ?? '(vật tư đã xoá)'}</strong>
                          <small className="khoi">
                            Tồn: {dinhDangSoLuong(v?.tonKho ?? 0)} {v?.donViTinh}
                          </small>
                        </td>
                        <td className="cot-sl">
                          <div className="o-co-don-vi">
                            <OSo value={d.soLuong} onChange={(soLuong) => doiDong(i, { soLuong })} aria-label="Số lượng" />
                            <span className="don-vi">{v?.donViTinh}</span>
                          </div>
                        </td>
                        <td className="cot-tien">
                          <OTien value={d.donGia} onChange={(donGia) => doiDong(i, { donGia })} aria-label="Đơn giá" />
                        </td>
                        <td className="so cot-tien">{dinhDangTien(thanhTien(d.soLuong, d.donGia), false)}</td>
                        <td>
                          <button type="button" className="nut-bieu-tuong do" aria-label="Xoá dòng" onClick={() => doi({ danhSachDong: p.danhSachDong.filter((_, j) => j !== i) })}>
                            <BieuTuong ten="xoa" co={20} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={3}>Tổng tiền</th>
                    <th className="so">{dinhDangTien(tongPhieuKho(p), false)}</th>
                    <th />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <OGoiY
            nhan="Thêm vật tư vào phiếu"
            value={timVatTu}
            onChange={setTimVatTu}
            goiY={(duLieu?.vatTu ?? []).filter((v) => !v.ngungDung)}
            locGoiY={(v, cauTim) => khop(`${v.maVatTu} ${v.ten} ${v.quyCach}`, cauTim)}
            hienThi={(v) => ({ khoa: v.id, chinh: v.ten, phu: `Tồn ${dinhDangSoLuong(v.tonKho)} ${v.donViTinh}${v.quyCach ? ` · ${v.quyCach}` : ''}` })}
            onChon={themDong}
            placeholder="Gõ tên vật tư để tìm…"
          />
          <button type="button" className="nut nut-vien nut-rong" onClick={() => setThemVatTu(timVatTu)}>
            <BieuTuong ten="them" /> Vật tư mới chưa có trong danh mục
          </button>
        </The>
      </div>
      {themVatTu !== null && (
        <HopThoaiVatTu
          banDau={{ ...vatTuTrong(cd.danhSachDonViTinh[0]), ten: themVatTu }}
          moi
          cacNhom={cd.nhomVatTu}
          onDong={() => setThemVatTu(null)}
          onDaLuu={(v) => themDong({ id: v.id })}
        />
      )}
    </TrangSoan>
  );
}
