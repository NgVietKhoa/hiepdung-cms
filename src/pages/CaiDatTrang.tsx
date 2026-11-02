import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BieuTuong, type TenBieuTuong } from '../components/BieuTuong';
import { CaiDatCotHangMuc } from '../components/CaiDatCotHangMuc';
import { useGiaoTiep } from '../components/HopThoai';
import { NhanLuu, The, TrangChinh } from '../components/KhungTrang';
import { ChonMot, OChu, ODanhSach, OSo } from '../components/ONhap';
import { api } from '../db/api';
import { layCaiDatHienTai, napCaiDatCache } from '../db/hooks';
import type { CaiDat, TruongXuong } from '../db/kieu';
import { khoaNhapTam } from '../db/nhapTam';
import { nenLogo } from '../lib/anh';
import { MUC_TUY_CHON, dangHien } from '../lib/hienThiXuong';
import { useTuLuu } from '../lib/useTuLuu';
import { dinhDangSoLuong, docChuoiSoLuong } from '../lib/dinhDang';
import { taoLuaChonVAT } from '../components/BangTong';
import { TEN_THU } from '../lib/thang';

type MucCaiDat =
  | 'xuong'
  | 'logo'
  | 'ngan-hang'
  | 'mac-dinh'
  | 'danh-muc'
  | 'bang-hang-muc'
  | 'danh-so'
  | 'sao-luu'
  | 'du-lieu-mau'
  | 'thu-chi-cham-cong';

/** Các mục Cài đặt, mỗi lần chỉ hiện một mục (chọn ở thanh bên / lưới nút) cho đỡ rối */
const DS_MUC: { id: MucCaiDat; ten: string; bieuTuong: TenBieuTuong }[] = [
  { id: 'xuong', ten: 'Thông tin xưởng', bieuTuong: 'nha' },
  { id: 'logo', ten: 'Logo', bieuTuong: 'anh' },
  { id: 'ngan-hang', ten: 'Tài khoản ngân hàng', bieuTuong: 'vanBan' },
  { id: 'mac-dinh', ten: 'Giá trị mặc định', bieuTuong: 'sua' },
  { id: 'danh-muc', ten: 'Đơn vị, nhóm, VAT', bieuTuong: 'danhSach' },
  { id: 'bang-hang-muc', ten: 'Bảng hạng mục', bieuTuong: 'danhSach' },
  { id: 'danh-so', ten: 'Đánh số chứng từ', bieuTuong: 'in' },
  { id: 'thu-chi-cham-cong', ten: 'Thu chi, chấm công', bieuTuong: 'tien' },
  { id: 'sao-luu', ten: 'Sao lưu dữ liệu', bieuTuong: 'luu' },
  { id: 'du-lieu-mau', ten: 'Dữ liệu mẫu', bieuTuong: 'tai' },
];

export function CaiDatTrang() {
  const { xacNhan, thongBao } = useGiaoTiep();
  const viTri = useLocation();
  const dieuHuong = useNavigate();
  const [cd, setCd] = useState<CaiDat | undefined>(() => layCaiDatHienTai());
  const oLogo = useRef<HTMLInputElement>(null);

  const napLai = () =>
    api.caiDat.lay().then((data) => {
      setCd(data);
      napCaiDatCache(data);
    });
  useEffect(() => {
    void napLai();
  }, []);

  const { trangThai, thongDiepLoi } = useTuLuu(
    cd,
    // Tự lưu khi đang gõ: không bắt mọi danh sách tải lại, chỉ cập nhật bản Cài đặt dùng chung
    (c) => api.caiDat.luu(c, { baoThayDoi: false }).then(napCaiDatCache),
    khoaNhapTam('caiDat', 'caiDat'),
  );

  if (!cd) {
    return (
      <TrangChinh tieuDe="Cài đặt">
        <p className="dang-tai">Đang tải…</p>
      </TrangChinh>
    );
  }
  const doi = (truong: keyof CaiDat) => (v: string | number | boolean | string[] | number[]) =>
    setCd((c) => (c ? { ...c, [truong]: v } : c));
  const hien = (k: TruongXuong) => dangHien(cd, k);
  // Mục đang mở nằm trên địa chỉ (#sao-luu…) để mở thẳng được từ trang khác
  const dsMuc = DS_MUC.filter((m) => (m.id !== 'logo' || hien('logo')) && (m.id !== 'ngan-hang' || hien('taiKhoan')));
  const muc: MucCaiDat = dsMuc.find((m) => m.id === viTri.hash.slice(1))?.id ?? 'xuong';
  const chonMuc = (id: MucCaiDat) => {
    dieuHuong({ hash: id }, { replace: true });
    window.scrollTo({ top: 0 });
  };
  const batTat = (k: TruongXuong) =>
    setCd((c) =>
      c ? { ...c, truongAn: c.truongAn.includes(k) ? c.truongAn.filter((x) => x !== k) : [...c.truongAn, k] } : c,
    );

  return (
    <TrangChinh tieuDe="Cài đặt" phuDe="Mọi thay đổi được tự động lưu" phai={<NhanLuu trangThai={trangThai} />}>
      {trangThai === 'loi' && (
        <div className="canh-bao-loi" role="alert">
          <BieuTuong ten="canhBao" /> Chưa lưu được: {thongDiepLoi}
        </div>
      )}

      <div className="khung-cai-dat">
        <nav className="thanh-ben-cai-dat" aria-label="Các mục cài đặt">
          {dsMuc.map((m) => (
            <button
              key={m.id}
              type="button"
              className={m.id === muc ? 'dang-chon' : ''}
              aria-current={m.id === muc ? 'page' : undefined}
              onClick={() => chonMuc(m.id)}
            >
              <BieuTuong ten={m.bieuTuong} co={22} />
              {m.ten}
            </button>
          ))}
        </nav>

        <div className="noi-dung-cai-dat">
          {muc === 'xuong' && (
            <The tieuDe="Thông tin xưởng">
              <fieldset className="chon-thong-tin">
                <legend className="nhan">Thông tin xưởng dùng trên văn bản</legend>
                <p className="goi-y-nho">
                  Bỏ tích mục xưởng không dùng: ô nhập được ẩn đi và mục đó không in lên báo giá, biên bản. Giá trị đã nhập vẫn
                  được giữ, tích lại là có ngay.
                </p>
                <div className="luoi-tich">
                  {MUC_TUY_CHON.map((m) => (
                    <label key={m.khoa} className={`o-tich ${hien(m.khoa) ? 'dang-chon' : ''}`}>
                      <input type="checkbox" checked={hien(m.khoa)} onChange={() => batTat(m.khoa)} />
                      {m.nhan}
                    </label>
                  ))}
                </div>
              </fieldset>

              <OChu nhan="Tên đơn vị (luôn hiện)" value={cd.tenDonVi} onChange={doi('tenDonVi')} />
              {hien('diaChi') && <OChu nhan="Địa chỉ" value={cd.diaChi} onChange={doi('diaChi')} nhieuDong />}
              <div className="luoi-2">
                {hien('maSoThue') && (
                  <OChu nhan="Mã số thuế" value={cd.maSoThue} onChange={doi('maSoThue')} inputMode="numeric" />
                )}
                {hien('dienThoai') && (
                  <OChu nhan="Điện thoại" value={cd.dienThoai} onChange={doi('dienThoai')} type="tel" inputMode="tel" />
                )}
              </div>
              {hien('email') && <OChu nhan="Email" value={cd.email} onChange={doi('email')} type="email" inputMode="email" />}
              <div className="luoi-2">
                {hien('nguoiDaiDien') && (
                  <OChu nhan="Người đại diện" value={cd.nguoiDaiDien} onChange={doi('nguoiDaiDien')} />
                )}
                {hien('chucVu') && <OChu nhan="Chức vụ" value={cd.chucVu} onChange={doi('chucVu')} />}
              </div>
            </The>
          )}

          {muc === 'logo' && (
            <The tieuDe="Logo">
              {cd.logo ? (
                <div className="xem-logo">
                  <img src={cd.logo} alt="Logo hiện tại" />
                </div>
              ) : (
                <p className="goi-y-nho">Chưa có logo. Logo sẽ hiện ở góc trái bản báo giá.</p>
              )}
              <input
                ref={oLogo}
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    doi('logo')(await nenLogo(f));
                    thongBao('Đã cập nhật logo');
                  } catch {
                    thongBao('Không đọc được ảnh logo', 'loi');
                  }
                  e.target.value = '';
                }}
              />
              <div className="hang-nut">
                <button type="button" className="nut nut-vien" onClick={() => oLogo.current?.click()}>
                  <BieuTuong ten="anh" /> {cd.logo ? 'Đổi logo' : 'Tải logo lên'}
                </button>
                {cd.logo && (
                  <button
                    type="button"
                    className="nut nut-vien-do"
                    onClick={async () => (await xacNhan('Bỏ logo?', { nutDongY: 'Bỏ logo' })) && doi('logo')('')}
                  >
                    Bỏ logo
                  </button>
                )}
              </div>
            </The>
          )}

          {muc === 'ngan-hang' && (
            <The tieuDe="Tài khoản ngân hàng">
              <OChu nhan="Số tài khoản" value={cd.soTaiKhoan} onChange={doi('soTaiKhoan')} inputMode="numeric" />
              <div className="luoi-2">
                <OChu nhan="Ngân hàng" value={cd.nganHang} onChange={doi('nganHang')} placeholder="vd: Vietcombank" />
                <OChu nhan="Chi nhánh" value={cd.chiNhanh} onChange={doi('chiNhanh')} />
              </div>
              <OChu nhan="Chủ tài khoản" value={cd.chuTaiKhoan} onChange={doi('chuTaiKhoan')} placeholder="Để trống nếu trùng tên đơn vị" />
            </The>
          )}

          {muc === 'mac-dinh' && (
            <The tieuDe="Giá trị mặc định cho chứng từ mới">
              <ChonMot
                nhan="Thuế VAT mặc định"
                value={cd.vatMacDinh}
                onChange={doi('vatMacDinh')}
                luaChon={taoLuaChonVAT(cd.luaChonVAT, cd.vatMacDinh)}
              />
              <OSo nhan="Hiệu lực báo giá (số ngày)" soNguyen value={cd.hieuLucMacDinh} onChange={doi('hieuLucMacDinh')} />
              <OChu nhan="Thời gian giao hàng" value={cd.thoiGianGiaoHangMacDinh} onChange={doi('thoiGianGiaoHangMacDinh')} />
              <OChu
                nhan="Điều kiện thanh toán"
                nhieuDong
                value={cd.dieuKhoanThanhToanMacDinh}
                onChange={doi('dieuKhoanThanhToanMacDinh')}
              />
              <OChu nhan="Kết luận nghiệm thu" nhieuDong value={cd.ketLuanMacDinh} onChange={doi('ketLuanMacDinh')} />
              <OChu
                nhan="Địa điểm nghiệm thu"
                value={cd.diaDiemNghiemThuMacDinh}
                onChange={doi('diaDiemNghiemThuMacDinh')}
                placeholder="Để trống thì dùng địa chỉ xưởng"
              />
            </The>
          )}

          {muc === 'danh-muc' && (
            <The tieuDe="Đơn vị tính, nhóm hạng mục, mức VAT">
              <ODanhSach
                nhan="Đơn vị tính"
                value={cd.danhSachDonViTinh}
                onChange={doi('danhSachDonViTinh')}
                goiY="Mỗi dòng một đơn vị — hiện thành gợi ý ở ô Đơn vị. Đơn vị đầu tiên được điền sẵn cho dòng mới."
                placeholder={'cái\nbộ\nkg'}
              />
              <ODanhSach
                nhan="Nhóm hạng mục"
                value={cd.nhomHangMuc}
                onChange={doi('nhomHangMuc')}
                goiY="Mỗi dòng một nhóm — dùng để phân loại trong Danh mục hạng mục."
                placeholder={'Tiện\nPhay\nHàn'}
              />
              <ODanhSach
                nhan="Các mức thuế VAT (%)"
                value={cd.luaChonVAT.map(dinhDangSoLuong)}
                onChange={(ds) => doi('luaChonVAT')(ds.map(docChuoiSoLuong))}
                goiY="Mỗi dòng một mức, vd 8 hoặc 5,5. Ghi 0 để có nút “Không” tính VAT."
                placeholder={'0\n8\n10'}
              />
            </The>
          )}

          {muc === 'bang-hang-muc' && (
            <The tieuDe="Bảng hạng mục">
              <CaiDatCotHangMuc />
            </The>
          )}

          {muc === 'danh-so' && (
            <The tieuDe="Đánh số chứng từ">
              <div className="luoi-2">
                <OChu nhan="Ký hiệu báo giá" value={cd.tienToBaoGia} onChange={doi('tienToBaoGia')} />
                <OChu nhan="Ký hiệu nghiệm thu" value={cd.tienToNghiemThu} onChange={doi('tienToNghiemThu')} />
              </div>
              <ChonMot
                nhan="Số chữ số thứ tự"
                value={cd.soChuSo}
                onChange={doi('soChuSo')}
                luaChon={[3, 4].map((n) => ({ giaTri: n, nhan: n === 3 ? '001' : '0001' }))}
              />
              <p className="goi-y-nho">
                Ví dụ: {cd.tienToBaoGia}-{new Date().getFullYear()}-{'1'.padStart(cd.soChuSo, '0')}. Số tự tăng và quay về 1 khi sang năm mới.
              </p>
              <ChonMot
                nhan="Cách đọc số 4 trong “Bằng chữ”"
                value={cd.docSoTu ? 'tu' : 'bon'}
                onChange={(v) => doi('docSoTu')(v === 'tu')}
                luaChon={[
                  { giaTri: 'bon', nhan: 'hai mươi bốn' },
                  { giaTri: 'tu', nhan: 'hai mươi tư' },
                ]}
              />
            </The>
          )}

          {muc === 'sao-luu' && (
            <The tieuDe="Sao lưu dữ liệu">
              <p className="goi-y-nho">
                Dùng menu <strong>Dữ liệu → Sao lưu toàn bộ…</strong> trên thanh menu của cửa sổ, lưu ra USB hoặc ổ khác phòng khi
                máy hỏng. Khôi phục: <strong>Dữ liệu → Khôi phục từ bản sao lưu…</strong>
                {cd.lanSaoLuuCuoi && <> Lần sao lưu gần nhất: {new Date(cd.lanSaoLuuCuoi).toLocaleString('vi-VN')}.</>}
              </p>
            </The>
          )}

          {muc === 'du-lieu-mau' && (
            <The tieuDe="Dữ liệu mẫu">
              <p className="goi-y-nho">Khi bắt đầu dùng thật, hãy xoá dữ liệu mẫu. Cài đặt xưởng vẫn được giữ nguyên.</p>
              <div className="hang-nut doc">
                <button
                  type="button"
                  className="nut nut-vien-do nut-rong"
                  onClick={async () => {
                    if (!(await xacNhan('Xoá TOÀN BỘ khách hàng, hạng mục, báo giá và biên bản? Nên sao lưu trước.', { nutDongY: 'Xoá hết' })))
                      return;
                    await api.baoTri.xoaToanBo();
                    thongBao('Đã xoá toàn bộ dữ liệu');
                  }}
                >
                  <BieuTuong ten="xoa" /> Xoá toàn bộ dữ liệu
                </button>
                <button
                  type="button"
                  className="nut nut-vien nut-rong"
                  onClick={async () => {
                    await api.baoTri.napDuLieuMau();
                    thongBao('Đã nạp dữ liệu mẫu');
                  }}
                >
                  Nạp lại dữ liệu mẫu
                </button>
              </div>
            </The>
          )}
          {muc === 'thu-chi-cham-cong' && (
            <The tieuDe="Thu chi, chấm công">
              <ODanhSach
                nhan="Danh mục phiếu thu"
                value={cd.danhMucThu}
                onChange={doi('danhMucThu')}
                goiY="Mỗi dòng một danh mục — gợi ý khi lập phiếu thu."
                placeholder={'Thu tiền khách hàng\nBán phế liệu'}
              />
              <ODanhSach
                nhan="Danh mục phiếu chi"
                value={cd.danhMucChi}
                onChange={doi('danhMucChi')}
                goiY="Mỗi dòng một danh mục — gợi ý khi lập phiếu chi."
                placeholder={'Mua vật tư lẻ\nLương nhân viên'}
              />
              <fieldset className="chon-thong-tin">
                <legend className="nhan">Ngày nghỉ hằng tuần (tô màu trên bảng chấm công)</legend>
                <div className="luoi-tich">
                  {TEN_THU.map((ten, thu) => (
                    <label key={thu} className={`o-tich ${cd.ngayNghiTuan.includes(thu) ? 'dang-chon' : ''}`}>
                      <input
                        type="checkbox"
                        checked={cd.ngayNghiTuan.includes(thu)}
                        onChange={() =>
                          doi('ngayNghiTuan')(cd.ngayNghiTuan.includes(thu) ? cd.ngayNghiTuan.filter((x) => x !== thu) : [...cd.ngayNghiTuan, thu])
                        }
                      />
                      {ten}
                    </label>
                  ))}
                </div>
              </fieldset>
              <span className="nhan">Ký hiệu số phiếu</span>
              <div className="luoi-2">
                <OChu nhan="Phiếu thu" value={cd.tienToPhieuThu} onChange={doi('tienToPhieuThu')} />
                <OChu nhan="Phiếu chi" value={cd.tienToPhieuChi} onChange={doi('tienToPhieuChi')} />
              </div>
              <p className="goi-y-nho">
                Ví dụ: {cd.tienToPhieuThu}-{new Date().getFullYear()}-{'1'.padStart(cd.soChuSo, '0')}. Số chữ số dùng chung với báo giá (mục Đánh số chứng từ).
              </p>
            </The>
          )}
        </div>
      </div>
      <p className="phien-ban">CMS xưởng cơ khí – phiên bản 3.0</p>
    </TrangChinh>
  );
}
