import { useState } from 'react';
import { BieuTuong } from '../components/BieuTuong';
import { api, LoiApi } from '../db/api';

export function DangNhap({ onXong }: { onXong: () => void }) {
  const [tenDangNhap, setTenDangNhap] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [hienMatKhau, setHienMatKhau] = useState(false);
  const [loi, setLoi] = useState('');
  const [dangGui, setDangGui] = useState(false);

  return (
    <main className="man-don">
      <form
        className="the the-man-don"
        onSubmit={async (e) => {
          e.preventDefault();
          setDangGui(true);
          setLoi('');
          try {
            await api.phien.dangNhap(tenDangNhap.trim().toLowerCase(), matKhau);
            onXong();
          } catch (e) {
            setLoi(e instanceof LoiApi && e.trangThai === 401 ? 'Sai tên đăng nhập hoặc mật khẩu' : (e as Error).message);
          } finally {
            setDangGui(false);
          }
        }}
      >
        <img className="logo-man-don" src={`${import.meta.env.BASE_URL}logo-day-du.png`} alt="Xưởng cơ khí Hiệp Dung" width={180} height={156} />
        <div className="truong">
          <label className="nhan" htmlFor="ten-dang-nhap">
            Tên đăng nhập
          </label>
          <input
            id="ten-dang-nhap"
            className="o-nhap"
            autoComplete="username"
            autoCapitalize="none"
            autoFocus
            value={tenDangNhap}
            onChange={(e) => setTenDangNhap(e.target.value)}
          />
        </div>
        <div className="truong">
          <label className="nhan" htmlFor="mat-khau">
            Mật khẩu
          </label>
          <div className="o-nhap-mat-khau">
            <input
              id="mat-khau"
              className="o-nhap"
              type={hienMatKhau ? 'text' : 'password'}
              autoComplete="current-password"
              value={matKhau}
              onChange={(e) => setMatKhau(e.target.value)}
            />
            <button
              type="button"
              className="nut-hien-mat-khau"
              onClick={() => setHienMatKhau((h) => !h)}
              aria-label={hienMatKhau ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              title={hienMatKhau ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              <BieuTuong ten={hienMatKhau ? 'matAn' : 'mat'} co={20} />
            </button>
          </div>
        </div>
        {loi && (
          <div className="canh-bao-loi" role="alert">
            <BieuTuong ten="canhBao" /> {loi}
          </div>
        )}
        <button type="submit" className="nut nut-chinh nut-rong" disabled={dangGui || !tenDangNhap || !matKhau}>
          {dangGui ? 'Đang kiểm tra…' : 'Đăng nhập'}
        </button>
      </form>
    </main>
  );
}
