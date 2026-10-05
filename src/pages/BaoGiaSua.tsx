import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BangTong, nhanVAT } from '../components/BangTong';
import { BieuTuong } from '../components/BieuTuong';
import { DanhSachDong } from '../components/DanhSachDong';
import { useGiaoTiep } from '../components/HopThoai';
import { ChonKhachHang } from '../components/KhachHangForm';
import { NhanTrangThai, The, TrangSoan } from '../components/KhungTrang';
import { ChonMot, OChu, ONgay, OSo } from '../components/ONhap';
import { api } from '../db/api';
import { khoaNhapTam } from '../db/nhapTam';
import { useCaiDat, useTruyVan } from '../db/hooks';
import { NHAN_TRANG_THAI_BAO_GIA, NHAN_TRANG_THAI_NGHIEM_THU, type BaoGia, type TrangThaiBaoGia } from '../db/kieu';
import { nhanBanBaoGia, taoNghiemThuTuBaoGia, xoaBaoGia } from '../db/thaoTac';
import { donViTinhMacDinh, laBaoGiaRong, taoDongTrong } from '../lib/nghiepVu';
import { congNgay, dinhDangNgay, dinhDangTien } from '../lib/dinhDang';
import { demHangMuc } from '../lib/phanMuc';
import { thanhTienBaoGia, tongBaoGia } from '../lib/tinhTien';
import { useTuLuu } from '../lib/useTuLuu';

export function BaoGiaSua() {
  const { id = '' } = useParams();
  const dieuHuong = useNavigate();
  const { xacNhan, thongBao } = useGiaoTiep();
  const cd = useCaiDat();
  const [bg, setBg] = useState<BaoGia>();
  const [loiTai, setLoiTai] = useState('');
  const banMoiNhat = useRef<BaoGia>();
  banMoiNhat.current = bg;
  const daXoa = useRef(false);
  /** Đang sang màn hình dùng tới chứng từ này (xem in, tạo nghiệm thu) → không xoá dù còn trống */
  const giuLai = useRef(false);

  useEffect(() => {
    let huy = false;
    api.baoGia
      .lay(id)
      .then((b) => {
        if (huy) return;
        if (b) setBg(b);
        else setLoiTai('Không tìm thấy báo giá này (có thể đã bị xoá).');
      })
      .catch((e) => !huy && setLoiTai((e as Error).message));
    return () => {
      huy = true;
    };
  }, [id]);

  const { trangThai, thongDiepLoi, luuNgay } = useTuLuu(bg, (b) =>
    daXoa.current ? Promise.resolve() : api.baoGia.luu(b, { baoThayDoi: false }),
    khoaNhapTam('baoGia', id),
  );

  // Rời màn hình (quay lại, về trang chủ) mà báo giá vẫn trống → xoá cho gọn danh sách
  useEffect(
    () => () => {
      const b = banMoiNhat.current;
      if (b && !daXoa.current && !giuLai.current && laBaoGiaRong(b)) void xoaBaoGia(b.id).catch(() => {});
    },
    [],
  );

  const bienBanLienKet = useTruyVan(() => api.nghiemThu.ds(id), [id]) ?? [];
  const dsKhach = useTruyVan(() => api.khachHang.ds(), []);

  if (loiTai) {
    return (
      <TrangSoan tieuDe="Báo giá">
        <p className="trong">{loiTai}</p>
      </TrangSoan>
    );
  }
  if (!bg) {
    return (
      <TrangSoan tieuDe="Báo giá">
        <p className="dang-tai">Đang tải…</p>
      </TrangSoan>
    );
  }

  const doi = (thayDoi: Partial<BaoGia>) => setBg((b) => (b ? { ...b, ...thayDoi } : b));
  const tong = tongBaoGia(bg);
  const tenKhach = dsKhach?.find((k) => k.id === bg.khachHangId)?.tenCongTy;

  const xemIn = async () => {
    await luuNgay();
    giuLai.current = true;
    dieuHuong(`/in/bao-gia/${bg.id}`);
  };

  const taoNghiemThu = async () => {
    await luuNgay();
    if (bg.trangThai !== 'daChot') {
      if (!(await xacNhan('Báo giá chưa chốt. Đánh dấu "Đã chốt" và tạo biên bản nghiệm thu?', { nguyHiem: false, nutDongY: 'Chốt & tạo' })))
        return;
      doi({ trangThai: 'daChot' });
    }
    try {
      if (bg.trangThai !== 'daChot') await api.baoGia.luu({ ...bg, trangThai: 'daChot' }, { baoThayDoi: false });
      const ntId = await taoNghiemThuTuBaoGia(bg.id);
      thongBao('Đã tạo biên bản nghiệm thu từ báo giá');
      giuLai.current = true;
      dieuHuong(`/nghiem-thu/${ntId}`);
    } catch (e) {
      thongBao((e as Error).message, 'loi');
    }
  };

  const nhanBan = async () => {
    await luuNgay();
    try {
      const moi = await nhanBanBaoGia(bg.id);
      thongBao('Đã nhân bản thành báo giá mới');
      dieuHuong(`/bao-gia/${moi}`);
    } catch (e) {
      thongBao((e as Error).message, 'loi');
    }
  };

  const xoa = async () => {
    if (!(await xacNhan(`Xoá báo giá ${bg.soBaoGia}? Không thể khôi phục.`, { nutDongY: 'Xoá báo giá' }))) return;
    daXoa.current = true;
    try {
      await xoaBaoGia(bg.id);
    } catch (e) {
      daXoa.current = false;
      thongBao((e as Error).message, 'loi');
      return;
    }
    thongBao('Đã xoá báo giá');
    dieuHuong('/', { replace: true });
  };

  const hetHan = bg.hieuLucBaoGia > 0 ? dinhDangNgay(congNgay(bg.ngayLap, bg.hieuLucBaoGia)) : '';

  return (
    <TrangSoan
      tieuDe={bg.soBaoGia ? `Báo giá ${bg.soBaoGia}` : 'Báo giá mới'}
      phuDe={tenKhach}
      trangThaiLuu={trangThai}
      loiLuu={thongDiepLoi}
      thanhDuoi={
        <>
          <div className="tong-thanh-duoi">
            <span>Tổng cộng · {demHangMuc(bg.danhSachDong)} hạng mục</span>
            <strong>{dinhDangTien(tong.tongThanhToan)}</strong>
          </div>
          <button type="button" className="nut nut-chinh nut-xem-in" onClick={xemIn}>
            <BieuTuong ten="in" /> Xem & In
          </button>
        </>
      }
    >
      <div className="bo-cuc-soan">
        <The tieuDe="Khách hàng" bieuTuong="nguoi" thuGon khoa="bg-khach" tomTat={tenKhach ?? 'Chưa chọn khách'}>
          <ChonKhachHang khachHangId={bg.khachHangId} onChon={(k) => doi({ khachHangId: k?.id ?? null })} />
        </The>

        <The
          tieuDe="Hạng mục báo giá"
          bieuTuong="danhSach"
          thuGon
          khoa="bg-hang-muc"
          tomTat={`${demHangMuc(bg.danhSachDong)} hạng mục · Cộng ${dinhDangTien(tong.congTienHang)}`}
        >
          <DanhSachDong
            dong={bg.danhSachDong}
            onDoi={(danhSachDong) => doi({ danhSachDong })}
            taoDongMoi={() => taoDongTrong(donViTinhMacDinh(cd))}
            tinhThanhTien={thanhTienBaoGia}
            dsDonViTinh={cd.danhSachDonViTinh}
          />
        </The>

        <The
          tieuDe="Tổng tiền"
          bieuTuong="vanBan"
          thuGon
          khoa="bg-tong"
          tomTat={`${dinhDangTien(tong.tongThanhToan)} · ${bg.tyLeVAT ? `VAT ${nhanVAT(bg.tyLeVAT)}` : 'Không VAT'}${tong.tienChietKhau ? ' · Có chiết khấu' : ''}`}
        >
          <BangTong
            tong={tong}
            chietKhau={bg.chietKhau}
            tyLeVAT={bg.tyLeVAT}
            luaChonVAT={cd.luaChonVAT}
            onDoiChietKhau={(chietKhau) => doi({ chietKhau })}
            onDoiVAT={(tyLeVAT) => doi({ tyLeVAT })}
            docSoTu={cd.docSoTu}
          />
        </The>

        <The
          tieuDe="Thông tin báo giá"
          bieuTuong="sua"
          thuGon
          moSan={false}
          khoa="bg-thong-tin"
          tomTat={[NHAN_TRANG_THAI_BAO_GIA[bg.trangThai], bg.soBaoGia, dinhDangNgay(bg.ngayLap), bg.tieuDe].filter(Boolean).join(' · ')}
        >
          <ChonMot<TrangThaiBaoGia>
            nhan="Trạng thái"
            value={bg.trangThai}
            onChange={(trangThai) => doi({ trangThai })}
            luaChon={Object.entries(NHAN_TRANG_THAI_BAO_GIA).map(([giaTri, nhan]) => ({
              giaTri: giaTri as TrangThaiBaoGia,
              nhan,
            }))}
          />
          <div className="luoi-2">
            <OChu nhan="Số báo giá" value={bg.soBaoGia} onChange={(soBaoGia) => doi({ soBaoGia })} />
            <ONgay nhan="Ngày lập" value={bg.ngayLap} onChange={(ngayLap) => doi({ ngayLap })} />
          </div>
          <OChu nhan="Về việc (tiêu đề)" value={bg.tieuDe} onChange={(tieuDe) => doi({ tieuDe })} placeholder="vd: Gia công trục máy cán" />
        </The>

        <The
          tieuDe="Điều khoản"
          bieuTuong="vanBan"
          thuGon
          moSan={false}
          khoa="bg-dieu-khoan"
          tomTat={[
            bg.thoiGianGiaoHang && `Giao hàng: ${bg.thoiGianGiaoHang}`,
            hetHan && `Hiệu lực đến ${hetHan}`,
            bg.ghiChu && 'Có ghi chú',
          ]
            .filter(Boolean)
            .join(' · ') || 'Giao hàng, hiệu lực, thanh toán, ghi chú'}
        >
          <OChu
            nhan="Thời gian giao hàng"
            value={bg.thoiGianGiaoHang}
            onChange={(thoiGianGiaoHang) => doi({ thoiGianGiaoHang })}
          />
          <div className="luoi-2">
            <OSo
              nhan="Hiệu lực báo giá (số ngày)"
              soNguyen
              value={bg.hieuLucBaoGia}
              onChange={(hieuLucBaoGia) => doi({ hieuLucBaoGia })}
            />
            <div className="truong">
              <span className="nhan">Hết hiệu lực</span>
              <div className="chi-doc">{hetHan || '—'}</div>
            </div>
          </div>
          <OChu
            nhan="Điều kiện thanh toán"
            nhieuDong
            value={bg.dieuKhoanThanhToan}
            onChange={(dieuKhoanThanhToan) => doi({ dieuKhoanThanhToan })}
          />
          <OChu nhan="Ghi chú thêm" nhieuDong value={bg.ghiChu} onChange={(ghiChu) => doi({ ghiChu })} />
        </The>

        <The
          tieuDe="Nghiệm thu & thao tác"
          bieuTuong="xong"
          thuGon
          moSan={false}
          khoa="bg-thao-tac"
          tomTat={
            bienBanLienKet.length
              ? `Đã có ${bienBanLienKet.length} biên bản nghiệm thu · Nhân bản, xoá`
              : 'Tạo biên bản nghiệm thu, nhân bản, xoá'
          }
        >
          {bienBanLienKet.length > 0 && (
            <ul className="danh-sach-lien-ket">
              {bienBanLienKet.map((nt) => (
                <li key={nt.id}>
                  <Link to={`/nghiem-thu/${nt.id}`}>
                    <BieuTuong ten="vanBan" />
                    <span>
                      Biên bản {nt.so} – {dinhDangNgay(nt.ngay)}
                    </span>
                    <NhanTrangThai loai={nt.trangThai} nhan={NHAN_TRANG_THAI_NGHIEM_THU[nt.trangThai]} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="hang-nut doc">
            <button type="button" className="nut nut-vien nut-rong" onClick={taoNghiemThu}>
              <BieuTuong ten="xong" /> Tạo biên bản nghiệm thu
            </button>
            <div className="hang-nut">
              <button type="button" className="nut nut-vien" onClick={nhanBan}>
                <BieuTuong ten="nhanBan" /> Nhân bản
              </button>
              <button type="button" className="nut nut-vien-do" onClick={xoa}>
                <BieuTuong ten="xoa" /> Xoá
              </button>
            </div>
          </div>
          {bg.trangThai !== 'daChot' && (
            <p className="goi-y-nho">Biên bản nghiệm thu sẽ sao chép khách hàng và toàn bộ hạng mục từ báo giá này.</p>
          )}
        </The>
      </div>
    </TrangSoan>
  );
}
