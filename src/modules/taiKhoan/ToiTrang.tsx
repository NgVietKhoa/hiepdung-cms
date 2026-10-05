import { useState } from 'react';
import { BieuTuong } from '../../components/BieuTuong';
import { useGiaoTiep } from '../../components/HopThoai';
import { The, TrangChinh } from '../../components/KhungTrang';
import { OChu } from '../../components/ONhap';
import { api } from '../../db/api';
import { usePhien } from '../../db/phien';
import { DS_QUYEN } from '../../db/quyen';

/** Tài khoản của tôi: thông tin, đổi mật khẩu, đăng xuất */
export function ToiTrang() {
  const { nguoiDung } = usePhien();
  const { thongBao } = useGiaoTiep();
  const [cu, setCu] = useState('');
  const [moi, setMoi] = useState('');
  const [lai, setLai] = useState('');
  const [dangGui, setDangGui] = useState(false);

  const doiMatKhau = async () => {
    if (moi !== lai) return thongBao('Hai lần nhập mật khẩu mới không giống nhau', 'loi');
    setDangGui(true);
    try {
      await api.phien.doiMatKhau(cu, moi);
      setCu('');
      setMoi('');
      setLai('');
      thongBao('Đã đổi mật khẩu. Các máy khác sẽ phải đăng nhập lại.');
    } catch (e) {
      thongBao((e as Error).message, 'loi');
    } finally {
      setDangGui(false);
    }
  };

  return (
    <TrangChinh tieuDe="Tài khoản của tôi">
      <div className="khung-hep giua">
        <The tieuDe={nguoiDung.hoTen} bieuTuong="nguoi">
          <p>
            Tên đăng nhập: <strong>{nguoiDung.tenDangNhap}</strong> · Vai trò: <strong>{nguoiDung.vaiTro}</strong>
          </p>
          <p className="goi-y-nho">
            Được dùng:{' '}
            {nguoiDung.quyen.length ? nguoiDung.quyen.map((q) => DS_QUYEN.find((d) => d.ma === q)?.ten).join(', ') : 'xem công, lương của mình'}
          </p>
        </The>
        <The tieuDe="Đổi mật khẩu" bieuTuong="khoa">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void doiMatKhau();
            }}
          >
            <OChu nhan="Mật khẩu hiện tại" type="password" autoComplete="current-password" value={cu} onChange={setCu} />
            <OChu nhan="Mật khẩu mới (ít nhất 6 ký tự)" type="password" autoComplete="new-password" value={moi} onChange={setMoi} />
            <OChu nhan="Nhập lại mật khẩu mới" type="password" autoComplete="new-password" value={lai} onChange={setLai} />
            <button type="submit" className="nut nut-chinh nut-rong" disabled={dangGui || !cu || moi.length < 6}>
              <BieuTuong ten="luu" /> Đổi mật khẩu
            </button>
          </form>
        </The>
        <button type="button" className="nut nut-vien nut-rong" onClick={() => api.phien.dangXuat()}>
          <BieuTuong ten="dangXuat" /> Đăng xuất khỏi máy này
        </button>
      </div>
    </TrangChinh>
  );
}
