/** Người đang đăng nhập và quyền của họ — dùng để ẩn / hiện menu, chặn trang không có quyền. */
import { createContext, useContext, type ReactNode } from 'react';
import type { MaQuyen, NguoiDungPhien } from './quyen';

const NguCanhPhien = createContext<NguoiDungPhien | null>(null);

export function NhaCungCapPhien({ nguoiDung, children }: { nguoiDung: NguoiDungPhien; children: ReactNode }) {
  return <NguCanhPhien.Provider value={nguoiDung}>{children}</NguCanhPhien.Provider>;
}

export function usePhien() {
  const nguoiDung = useContext(NguCanhPhien);
  if (!nguoiDung) throw new Error('Thiếu NhaCungCapPhien');
  /** Có ít nhất một trong các quyền */
  const coQuyen = (...ma: MaQuyen[]) => ma.some((q) => nguoiDung.quyen.includes(q));
  return { nguoiDung, coQuyen };
}
