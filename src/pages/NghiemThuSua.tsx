import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BangTong, nhanVAT } from '../components/BangTong';
import { BieuTuong } from '../components/BieuTuong';
import { DanhSachDong } from '../components/DanhSachDong';
import { useGiaoTiep } from '../components/HopThoai';
import { ChonKhachHang } from '../components/KhachHangForm';
import { The, TrangSoan } from '../components/KhungTrang';
import { ChonMot, OChu, ONgay, OSo } from '../components/ONhap';
import { api } from '../db/api';
import { khoaNhapTam } from '../db/nhapTam';
import { useCaiDat, useTruyVan } from '../db/hooks';
import {
  NHAN_TRANG_THAI_NGHIEM_THU,
  type AnhDinhKem,
  type BienBanNghiemThu,
  type DongNghiemThu,
  type NguoiDaiDien,
  type TrangThaiNghiemThu,
} from '../db/kieu';
import { xoaNghiemThu } from '../db/thaoTac';
import { donViTinhMacDinh, dongNghiemThuTrong, laNghiemThuRong } from '../lib/nghiepVu';
import { nenAnhChup } from '../lib/anh';
import { dinhDangNgay, dinhDangSoLuong, dinhDangTien } from '../lib/dinhDang';
import { demHangMuc, laDongPhan } from '../lib/phanMuc';
import { thanhTienNghiemThu, tongNghiemThu } from '../lib/tinhTien';
import { useTuLuu } from '../lib/useTuLuu';

export function NghiemThuSua() {
  const { id = '' } = useParams();
  const dieuHuong = useNavigate();
  const { xacNhan, thongBao } = useGiaoTiep();
  const cd = useCaiDat();
  const [nt, setNt] = useState<BienBanNghiemThu>();
  const [loiTai, setLoiTai] = useState('');
  const banMoiNhat = useRef<BienBanNghiemThu>();
  banMoiNhat.current = nt;
  const daXoa = useRef(false);
  /** Đang sang màn hình dùng tới chứng từ này (xem in, tạo nghiệm thu) → không xoá dù còn trống */
  const giuLai = useRef(false);

  useEffect(() => {
    let huy = false;
    api.nghiemThu
      .lay(id)
      .then((n) => {
        if (huy) return;
        if (n) setNt(n);
        else setLoiTai('Không tìm thấy biên bản này (có thể đã bị xoá).');
      })
      .catch((e) => !huy && setLoiTai((e as Error).message));
    return () => {
      huy = true;
    };
  }, [id]);

  const { trangThai, thongDiepLoi, luuNgay } = useTuLuu(nt, (n) =>
    daXoa.current ? Promise.resolve() : api.nghiemThu.luu(n, { baoThayDoi: false }),
    khoaNhapTam('nghiemThu', id),
  );

  useEffect(
    () => () => {
      const n = banMoiNhat.current;
      if (n && !daXoa.current && !giuLai.current && laNghiemThuRong(n)) void xoaNghiemThu(n.id).catch(() => {});
    },
    [],
  );

  const baoGia = useTruyVan(async () => (nt?.baoGiaId ? api.baoGia.lay(nt.baoGiaId) : null), [nt?.baoGiaId]);
  const dsKhach = useTruyVan(() => api.khachHang.ds(), []);

  if (loiTai) {
    return (
      <TrangSoan tieuDe="Nghiệm thu">
        <p className="trong">{loiTai}</p>
      </TrangSoan>
    );
  }
  if (!nt) {
    return (
      <TrangSoan tieuDe="Nghiệm thu">
        <p className="dang-tai">Đang tải…</p>
      </TrangSoan>
    );
  }

  const doi = (thayDoi: Partial<BienBanNghiemThu>) => setNt((n) => (n ? { ...n, ...thayDoi } : n));
  const tong = tongNghiemThu(nt);
  const tenKhach = dsKhach?.find((k) => k.id === nt.khachHangId)?.tenCongTy;
  const soChenhLech = nt.danhSachDong.filter((d) => !laDongPhan(d) && d.soLuongThucTe !== d.soLuong).length;

  const xoa = async () => {
    if (!(await xacNhan(`Xoá biên bản ${nt.soBienBan} và toàn bộ ảnh đính kèm? Không thể khôi phục.`, { nutDongY: 'Xoá biên bản' })))
      return;
    daXoa.current = true;
    try {
      await xoaNghiemThu(nt.id);
    } catch (e) {
      daXoa.current = false;
      thongBao((e as Error).message, 'loi');
      return;
    }
    thongBao('Đã xoá biên bản');
    dieuHuong('/', { replace: true });
  };

  return (
    <TrangSoan
      tieuDe={nt.soBienBan ? `Nghiệm thu ${nt.soBienBan}` : 'Biên bản mới'}
      phuDe={tenKhach}
      loiLuu={thongDiepLoi}
      trangThaiLuu={trangThai}
      thanhDuoi={
        <>
          <div className="tong-thanh-duoi">
            <span>Giá trị nghiệm thu</span>
            <strong>{dinhDangTien(tong.tongThanhToan)}</strong>
          </div>
          <button
            type="button"
            className="nut nut-chinh nut-xem-in"
            onClick={async () => {
              await luuNgay();
              giuLai.current = true;
              dieuHuong(`/in/nghiem-thu/${nt.id}`);
            }}
          >
            <BieuTuong ten="in" /> Xem & In
          </button>
        </>
      }
    >
      {baoGia && (
        <Link to={`/bao-gia/${baoGia.id}`} className="lien-ket-bao-gia">
          <BieuTuong ten="vanBan" />
          <span>
            Lập từ báo giá <strong>{baoGia.soBaoGia}</strong> ngày {dinhDangNgay(baoGia.ngayLap)}
          </span>
          <BieuTuong ten="muiTenPhai" />
        </Link>
      )}

      <div className="bo-cuc-soan">
        <The
          tieuDe="Bên A (Bên giao việc)"
          bieuTuong="nguoi"
          thuGon
          khoa="nt-ben-a"
          tomTat={[tenKhach ?? 'Chưa chọn khách', tenNguoi(nt.thanhPhanBenA)].filter(Boolean).join(' · ')}
        >
          <ChonKhachHang
            nhan="Khách hàng"
            khachHangId={nt.khachHangId}
            onChon={(k) => {
              const benA = nt.thanhPhanBenA;
              const chuaCoNguoi = !benA.some((n) => n.hoTen.trim());
              doi({
                khachHangId: k?.id ?? null,
                thanhPhanBenA: k && chuaCoNguoi ? [{ hoTen: k.nguoiLienHe, chucVu: k.chucVu }] : benA,
              });
            }}
          />
          <DanhSachNguoi nhan="Đại diện Bên A" ds={nt.thanhPhanBenA} onDoi={(thanhPhanBenA) => doi({ thanhPhanBenA })} />
        </The>

        <The
          tieuDe="Bên B (Xưởng)"
          bieuTuong="nha"
          thuGon
          moSan={false}
          khoa="nt-ben-b"
          tomTat={[cd.tenDonVi, tenNguoi(nt.thanhPhanBenB)].filter(Boolean).join(' · ')}
        >
          <p className="ten-don-vi">{cd.tenDonVi}</p>
          <DanhSachNguoi nhan="Đại diện Bên B" ds={nt.thanhPhanBenB} onDoi={(thanhPhanBenB) => doi({ thanhPhanBenB })} />
        </The>

        <The
          tieuDe="Khối lượng nghiệm thu"
          bieuTuong="danhSach"
          thuGon
          khoa="nt-hang-muc"
          tomTat={[
            `${demHangMuc(nt.danhSachDong)} hạng mục`,
            soChenhLech > 0 && `${soChenhLech} dòng chênh lệch`,
          ]
            .filter(Boolean)
            .join(' · ')}
        >
          <p className="goi-y-nho">Chỉ cần sửa “SL thực tế” ở dòng có chênh lệch. Giá trị tính theo số lượng thực tế.</p>
          <DanhSachDong<DongNghiemThu>
            dong={nt.danhSachDong}
            onDoi={(danhSachDong) => doi({ danhSachDong })}
            taoDongMoi={() => dongNghiemThuTrong(donViTinhMacDinh(cd))}
            tinhThanhTien={thanhTienNghiemThu}
            dsDonViTinh={cd.danhSachDonViTinh}
            nhanSoLuong="SL theo báo giá"
            phanThem={(d, sua) => (
              <div className="phan-nghiem-thu">
                <div className={d.soLuongThucTe !== d.soLuong ? 'chenh-lech' : ''}>
                  <OSo nhan="SL thực tế" value={d.soLuongThucTe} onChange={(soLuongThucTe) => sua({ soLuongThucTe })} />
                  {d.soLuongThucTe !== d.soLuong && (
                    <div className="goi-y-nho">
                      Chênh lệch: {d.soLuongThucTe > d.soLuong ? '+' : ''}
                      {dinhDangSoLuong(d.soLuongThucTe - d.soLuong)}
                    </div>
                  )}
                </div>
              </div>
            )}
          />
        </The>

        <The
          tieuDe="Tổng giá trị nghiệm thu"
          bieuTuong="vanBan"
          thuGon
          khoa="nt-tong"
          tomTat={`${dinhDangTien(tong.tongThanhToan)} · ${nt.tyLeVAT ? `VAT ${nhanVAT(nt.tyLeVAT)}` : 'Không VAT'}`}
        >
          <BangTong
            tong={tong}
            chietKhau={nt.chietKhau}
            tyLeVAT={nt.tyLeVAT}
            luaChonVAT={cd.luaChonVAT}
            onDoiChietKhau={(chietKhau) => doi({ chietKhau })}
            onDoiVAT={(tyLeVAT) => doi({ tyLeVAT })}
            nhanTong="TỔNG GIÁ TRỊ"
            docSoTu={cd.docSoTu}
          />
        </The>

        <The
          tieuDe="Thông tin biên bản"
          bieuTuong="sua"
          thuGon
          moSan={false}
          khoa="nt-thong-tin"
          tomTat={[NHAN_TRANG_THAI_NGHIEM_THU[nt.trangThai], nt.soBienBan, dinhDangNgay(nt.ngayNghiemThu), nt.diaDiem]
            .filter(Boolean)
            .join(' · ')}
        >
          <ChonMot<TrangThaiNghiemThu>
            nhan="Trạng thái"
            value={nt.trangThai}
            onChange={(trangThai) => doi({ trangThai })}
            luaChon={Object.entries(NHAN_TRANG_THAI_NGHIEM_THU).map(([giaTri, nhan]) => ({
              giaTri: giaTri as TrangThaiNghiemThu,
              nhan,
            }))}
          />
          <div className="luoi-2">
            <OChu nhan="Số biên bản" value={nt.soBienBan} onChange={(soBienBan) => doi({ soBienBan })} />
            <ONgay nhan="Ngày nghiệm thu" value={nt.ngayNghiemThu} onChange={(ngayNghiemThu) => doi({ ngayNghiemThu })} />
          </div>
          <OChu nhan="Địa điểm nghiệm thu" value={nt.diaDiem} onChange={(diaDiem) => doi({ diaDiem })} placeholder="vd: Xưởng của Bên B" />
          <OChu nhan="Về việc (tiêu đề)" value={nt.tieuDe} onChange={(tieuDe) => doi({ tieuDe })} />
          <div className="luoi-2">
            <OChu
              nhan="Căn cứ HĐ / đơn hàng số"
              value={nt.canCuHopDong}
              onChange={(canCuHopDong) => doi({ canCuHopDong })}
              placeholder="Để trống nếu không có"
            />
            <ONgay nhan="Ngày hợp đồng / đơn hàng" value={nt.ngayCanCu} onChange={(ngayCanCu) => doi({ ngayCanCu })} />
          </div>
        </The>

        <The
          tieuDe="Kết luận"
          bieuTuong="xong"
          thuGon
          moSan={false}
          khoa="nt-ket-luan"
          tomTat={nt.ketLuan || 'Chưa có kết luận'}
          phai={
            nt.ketLuan !== cd.ketLuanMacDinh && (
              <button type="button" className="nut-nho" onClick={() => doi({ ketLuan: cd.ketLuanMacDinh })}>
                Dùng câu mặc định
              </button>
            )
          }
        >
          <OChu nhan="Nội dung kết luận" nhieuDong value={nt.ketLuan} onChange={(ketLuan) => doi({ ketLuan })} />
        </The>

        <AnhNghiemThu nghiemThuId={nt.id} onDoiSoAnh={(soAnh) => doi({ soAnh })} />

        <The tieuDe="Thao tác khác" bieuTuong="xoa" thuGon moSan={false} khoa="nt-thao-tac" tomTat="Xoá biên bản">
          <button type="button" className="nut nut-vien-do nut-rong" onClick={xoa}>
            <BieuTuong ten="xoa" /> Xoá biên bản này
          </button>
        </The>
      </div>
    </TrangSoan>
  );
}

/** Tên các đại diện đã nhập, nối bằng dấu phẩy */
const tenNguoi = (ds: NguoiDaiDien[]) =>
  ds
    .map((n) => n.hoTen.trim())
    .filter(Boolean)
    .join(', ');

function DanhSachNguoi({ nhan, ds, onDoi }: { nhan: string; ds: NguoiDaiDien[]; onDoi: (ds: NguoiDaiDien[]) => void }) {
  const sua = (i: number, thayDoi: Partial<NguoiDaiDien>) => onDoi(ds.map((n, j) => (j === i ? { ...n, ...thayDoi } : n)));
  return (
    <div className="danh-sach-nguoi">
      <div className="nhan">{nhan}</div>
      {ds.map((n, i) => (
        <div className="dong-nguoi" key={i}>
          <input
            className="o-nhap"
            placeholder="Họ tên"
            aria-label={`Họ tên người ${i + 1}`}
            value={n.hoTen}
            onChange={(e) => sua(i, { hoTen: e.target.value })}
          />
          <input
            className="o-nhap"
            placeholder="Chức vụ"
            aria-label={`Chức vụ người ${i + 1}`}
            value={n.chucVu}
            onChange={(e) => sua(i, { chucVu: e.target.value })}
          />
          {ds.length > 1 && (
            <button type="button" className="nut-bieu-tuong do" aria-label="Bỏ người này" onClick={() => onDoi(ds.filter((_, j) => j !== i))}>
              <BieuTuong ten="xoa" />
            </button>
          )}
        </div>
      ))}
      <button type="button" className="nut-nho" onClick={() => onDoi([...ds, { hoTen: '', chucVu: '' }])}>
        <BieuTuong ten="them" co={20} /> Thêm người
      </button>
    </div>
  );
}

function AnhNghiemThu({ nghiemThuId, onDoiSoAnh }: { nghiemThuId: string; onDoiSoAnh: (n: number) => void }) {
  const { xacNhan, thongBao } = useGiaoTiep();
  const [dangXuLy, setDangXuLy] = useState(false);
  const dsAnh = useTruyVan(() => api.anh.ds(nghiemThuId), [nghiemThuId]);
  const oChon = useRef<HTMLInputElement>(null);

  const themAnh = async (files: FileList | null) => {
    if (!files?.length) return;
    setDangXuLy(true);
    try {
      // Nén trên máy (ảnh ~100–300 KB) rồi mới gửi lên máy chủ
      for (const f of Array.from(files)) {
        await api.anh.them(nghiemThuId, await nenAnhChup(f));
      }
      onDoiSoAnh((dsAnh?.length ?? 0) + files.length);
      thongBao(`Đã thêm ${files.length} ảnh`);
    } catch (e) {
      thongBao((e as Error).message || 'Không thêm được ảnh', 'loi');
    } finally {
      setDangXuLy(false);
      if (oChon.current) oChon.current.value = '';
    }
  };

  const xoaAnh = async (a: AnhDinhKem, i: number) => {
    if (!(await xacNhan(`Xoá hình ${i + 1}?`, { nutDongY: 'Xoá ảnh' }))) return;
    try {
      await api.anh.xoa(a.id);
      onDoiSoAnh(Math.max(0, (dsAnh?.length ?? 1) - 1));
    } catch (e) {
      thongBao((e as Error).message, 'loi');
    }
  };

  return (
    <The tieuDe={`Ảnh nghiệm thu${dsAnh?.length ? ` (${dsAnh.length})` : ''}`} bieuTuong="mayAnh" thuGon khoa="nt-anh" tomTat={dsAnh?.length ? `${dsAnh.length} ảnh đính kèm` : 'Chưa có ảnh'}>
      <p className="goi-y-nho">Ảnh được nén nhỏ và in ở trang phụ lục cuối biên bản.</p>
      {dsAnh && dsAnh.length > 0 && (
        <div className="luoi-anh">
          {dsAnh.map((a, i) => (
            <figure key={a.id} className="o-anh">
              <div className="khung-anh">
                <img src={a.duLieu} alt={`Hình ${i + 1}`} />
                <span className="so-anh">{i + 1}</span>
                <button type="button" className="xoa-anh" onClick={() => xoaAnh(a, i)} aria-label={`Xoá hình ${i + 1}`} title="Xoá ảnh">
                  <BieuTuong ten="xoa" co={20} />
                </button>
              </div>
              <OGhiChuAnh anh={a} />
            </figure>
          ))}
        </div>
      )}
      <input ref={oChon} type="file" accept="image/*" multiple hidden onChange={(e) => themAnh(e.target.files)} />
      <div className="hang-nut">
        <button type="button" className="nut nut-chinh" disabled={dangXuLy} onClick={() => oChon.current?.click()}>
          <BieuTuong ten="anh" /> {dangXuLy ? 'Đang xử lý…' : 'Thêm ảnh'}
        </button>
      </div>
    </The>
  );
}

function OGhiChuAnh({ anh }: { anh: AnhDinhKem }) {
  const [chu, setChu] = useState(anh.ghiChu);
  const hen = useRef<number>();
  return (
    <input
      className="o-nhap"
      placeholder="Ghi chú ảnh (tuỳ chọn)"
      aria-label="Ghi chú ảnh"
      value={chu}
      onChange={(e) => {
        setChu(e.target.value);
        const giaTri = e.target.value;
        window.clearTimeout(hen.current);
        hen.current = window.setTimeout(() => void api.anh.suaGhiChu(anh.id, giaTri).catch(console.error), 500);
      }}
    />
  );
}
