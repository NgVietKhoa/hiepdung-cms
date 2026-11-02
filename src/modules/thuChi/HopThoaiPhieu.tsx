/** Hộp thoại lập / sửa phiếu thu, phiếu chi — dùng ở Thu chi, Hoá đơn (ghi thanh toán), Bảng lương (tạm ứng). */
import { useId, useState } from 'react';
import { BieuTuong } from '../../components/BieuTuong';
import { OChon } from '../../components/ChungCms';
import { HopThoai, useGiaoTiep } from '../../components/HopThoai';
import { ChonMot, OChu, ONgay, OTien, TruongNhap } from '../../components/ONhap';
import { api } from '../../db/api';
import { useCaiDat, useTruyVan } from '../../db/hooks';
import { homNayISO } from '../../lib/dinhDang';
import { taoId } from '../../lib/id';
import { apiCms } from '../api';
import { NHAN_HINH_THUC, type HinhThucTien, type LoaiPhieuThuChi, type PhieuThuChi } from './kieu';

export function phieuMoi(loai: LoaiPhieuThuChi, them: Partial<PhieuThuChi> = {}): PhieuThuChi {
  return {
    id: taoId(),
    loai,
    soPhieu: '',
    ngay: homNayISO(),
    soTien: 0,
    hinhThuc: 'tienMat',
    danhMuc: '',
    khachHangId: null,
    nhaCungCapId: null,
    nhanVienId: null,
    hoaDonId: null,
    truVaoLuong: false,
    nguoiNopNhan: '',
    noiDung: '',
    nguoiLap: '',
    ngayTao: Date.now(),
    ...them,
  };
}

type DoiTuong = 'khong' | 'khach' | 'ncc' | 'nhanVien';
const doiTuongCua = (p: PhieuThuChi): DoiTuong =>
  p.khachHangId ? 'khach' : p.nhaCungCapId ? 'ncc' : p.nhanVienId ? 'nhanVien' : 'khong';

export function HopThoaiPhieu({
  banDau,
  moi,
  coDinhLoai,
  onDong,
  onDaLuu,
}: {
  banDau: PhieuThuChi;
  moi: boolean;
  /** Không cho đổi thu ↔ chi (thanh toán hoá đơn, tạm ứng) */
  coDinhLoai?: boolean;
  onDong: () => void;
  onDaLuu?: (p: PhieuThuChi) => void;
}) {
  const { xacNhan, thongBao } = useGiaoTiep();
  const cd = useCaiDat();
  const idDanhMuc = useId();
  const [p, setP] = useState(banDau);
  const [doiTuong, setDoiTuong] = useState<DoiTuong>(() => doiTuongCua(banDau));
  const doi = (thayDoi: Partial<PhieuThuChi>) => setP((x) => ({ ...x, ...thayDoi }));

  const ds = useTruyVan(async () => {
    const [khach, ncc, nhanVien] = await Promise.all([
      api.khachHang.ds(),
      apiCms.hoaDon.dsNhaCungCap(),
      apiCms.chamCong.dsNhanVien(),
    ]);
    return { khach, ncc, nhanVien };
  }, []);

  const doiDoiTuong = (d: DoiTuong) => {
    setDoiTuong(d);
    doi({ khachHangId: null, nhaCungCapId: null, nhanVienId: null, truVaoLuong: false });
  };

  const luu = async () => {
    if (!p.soTien) return thongBao('Nhập số tiền', 'loi');
    try {
      const kq = await apiCms.thuChi.luu(p);
      thongBao(moi ? `Đã lập phiếu ${kq.soPhieu}` : 'Đã lưu phiếu');
      onDaLuu?.(kq);
      onDong();
    } catch (e) {
      thongBao((e as Error).message, 'loi');
    }
  };
  const xoa = async () => {
    if (!(await xacNhan(`Xoá phiếu ${p.soPhieu}?`, { nutDongY: 'Xoá' }))) return;
    try {
      await apiCms.thuChi.xoa(p.id);
      thongBao('Đã xoá phiếu');
      onDong();
    } catch (e) {
      thongBao((e as Error).message, 'loi');
    }
  };

  const danhMuc = p.loai === 'thu' ? cd.danhMucThu : cd.danhMucChi;
  const laThu = p.loai === 'thu';

  return (
    <HopThoai
      tieuDe={moi ? (laThu ? 'Lập phiếu thu' : 'Lập phiếu chi') : `Phiếu ${p.soPhieu}`}
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
      {!coDinhLoai && (
        <ChonMot
          nhan="Loại phiếu"
          value={p.loai}
          onChange={(loai) => doi({ loai, danhMuc: '', truVaoLuong: false })}
          luaChon={[
            { giaTri: 'thu', nhan: 'Phiếu thu (tiền vào)' },
            { giaTri: 'chi', nhan: 'Phiếu chi (tiền ra)' },
          ]}
        />
      )}
      <div className="luoi-2">
        <ONgay nhan="Ngày" value={p.ngay} onChange={(ngay) => doi({ ngay })} />
        <OTien nhan="Số tiền *" value={p.soTien} onChange={(soTien) => doi({ soTien })} autoFocus={moi} />
      </div>
      <ChonMot
        nhan="Hình thức"
        value={p.hinhThuc}
        onChange={(hinhThuc) => doi({ hinhThuc })}
        luaChon={(Object.keys(NHAN_HINH_THUC) as HinhThucTien[]).map((h) => ({ giaTri: h, nhan: NHAN_HINH_THUC[h] }))}
      />
      <TruongNhap nhan="Danh mục" id={idDanhMuc}>
        <input id={idDanhMuc} className="o-nhap" list={`${idDanhMuc}-ds`} value={p.danhMuc} onChange={(e) => doi({ danhMuc: e.target.value })} />
        <datalist id={`${idDanhMuc}-ds`}>
          {danhMuc.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      </TruongNhap>

      {p.hoaDonId ? (
        <p className="goi-y-nho">
          <BieuTuong ten="hoaDon" co={16} /> Phiếu thanh toán cho hoá đơn — đối tác lấy theo hoá đơn.
        </p>
      ) : (
        <>
          <ChonMot
            nhan={laThu ? 'Thu của' : 'Chi cho'}
            value={doiTuong}
            onChange={doiDoiTuong}
            luaChon={[
              { giaTri: 'khong' as DoiTuong, nhan: 'Khác' },
              { giaTri: 'khach' as DoiTuong, nhan: 'Khách hàng' },
              { giaTri: 'ncc' as DoiTuong, nhan: 'Nhà cung cấp' },
              { giaTri: 'nhanVien' as DoiTuong, nhan: 'Nhân viên' },
            ]}
          />
          {doiTuong === 'khach' && (
            <OChon nhan="Khách hàng" value={p.khachHangId ?? ''} onChange={(v) => doi({ khachHangId: v || null })} trong="— Chọn —" luaChon={(ds?.khach ?? []).map((k) => ({ giaTri: k.id, nhan: k.tenCongTy }))} />
          )}
          {doiTuong === 'ncc' && (
            <OChon nhan="Nhà cung cấp" value={p.nhaCungCapId ?? ''} onChange={(v) => doi({ nhaCungCapId: v || null })} trong="— Chọn —" luaChon={(ds?.ncc ?? []).map((k) => ({ giaTri: k.id, nhan: k.tenCongTy }))} />
          )}
          {doiTuong === 'nhanVien' && (
            <>
              <OChon nhan="Nhân viên" value={p.nhanVienId ?? ''} onChange={(v) => doi({ nhanVienId: v || null })} trong="— Chọn —" luaChon={(ds?.nhanVien ?? []).map((k) => ({ giaTri: k.id, nhan: k.hoTen }))} />
              {!laThu && (
                <label className={`o-tich ${p.truVaoLuong ? 'dang-chon' : ''}`}>
                  <input type="checkbox" checked={p.truVaoLuong} onChange={(e) => doi({ truVaoLuong: e.target.checked })} />
                  Tạm ứng — trừ vào lương tháng {p.ngay.slice(5, 7)}/{p.ngay.slice(0, 4)}
                </label>
              )}
            </>
          )}
        </>
      )}
      <OChu nhan={laThu ? 'Người nộp tiền' : 'Người nhận tiền'} value={p.nguoiNopNhan} onChange={(nguoiNopNhan) => doi({ nguoiNopNhan })} />
      <OChu nhan="Nội dung" value={p.noiDung} onChange={(noiDung) => doi({ noiDung })} nhieuDong />
      <OChu nhan="Số phiếu" value={p.soPhieu} onChange={(soPhieu) => doi({ soPhieu })} placeholder="Để trống — tự cấp khi lưu" />
      {p.nguoiLap && <p className="goi-y-nho">Người lập: {p.nguoiLap}</p>}
    </HopThoai>
  );
}
