import type { MaQuyen } from '../../db/quyen';

export interface VaiTro {
  id: string;
  ten: string;
  moTa: string;
  quyen: MaQuyen[];
  /** Vai trò hệ thống (Quản trị): luôn đủ quyền, không xoá được */
  heThong: boolean;
  thuTu: number;
  soNguoiDung: number;
}

export interface TaiKhoan {
  id: string;
  tenDangNhap: string;
  hoTen: string;
  vaiTroId: string;
  nhanVienId: string | null;
  khoa: boolean;
  lanDangNhapCuoi: number | null;
  ngayTao: number;
}

/** Gửi lên khi tạo / sửa tài khoản: có `matKhau` thì đặt mật khẩu mới */
export type LuuTaiKhoan = Partial<TaiKhoan> & { matKhau?: string };
