import { useState } from 'react';
import { BieuTuong } from '../../components/BieuTuong';
import { OChon } from '../../components/ChungCms';
import { HopThoai, useGiaoTiep } from '../../components/HopThoai';
import { NhanTrangThai, TrangChinh, Trong } from '../../components/KhungTrang';
import { OChu } from '../../components/ONhap';
import { useTruyVan } from '../../db/hooks';
import { usePhien } from '../../db/phien';
import { DS_QUYEN, type MaQuyen } from '../../db/quyen';
import { taoId } from '../../lib/id';
import { apiCms } from '../api';
import type { NhanVien } from '../chamCong/kieu';
import type { LuuTaiKhoan, TaiKhoan, VaiTro } from './kieu';

export function TaiKhoanTrang() {
  const { nguoiDung } = usePhien();
  const [tab, setTab] = useState<'taiKhoan' | 'vaiTro'>('taiKhoan');
  const duLieu = useTruyVan(async () => {
    const [taiKhoan, vaiTro, nhanVien] = await Promise.all([
      apiCms.taiKhoan.ds(),
      apiCms.taiKhoan.dsVaiTro(),
      apiCms.chamCong.dsNhanVien().catch(() => [] as NhanVien[]),
    ]);
    return { taiKhoan, vaiTro, nhanVien };
  }, []);
  const [suaTk, setSuaTk] = useState<{ tk: LuuTaiKhoan; moi: boolean } | null>(null);
  const [suaVt, setSuaVt] = useState<{ vt: VaiTro; moi: boolean } | null>(null);

  const tenVaiTro = new Map(duLieu?.vaiTro.map((v) => [v.id, v.ten]));
  const tenNhanVien = new Map(duLieu?.nhanVien.map((n) => [n.id, n.hoTen]));

  return (
    <TrangChinh tieuDe="Tài khoản & phân quyền" phuDe="Mỗi người một tài khoản; vai trò quyết định được dùng chức năng nào">
      <div className="tab-loai" role="tablist">
        {(
          [
            ['taiKhoan', 'Tài khoản', duLieu?.taiKhoan.length],
            ['vaiTro', 'Vai trò', duLieu?.vaiTro.length],
          ] as const
        ).map(([gt, nhan, so]) => (
          <button key={gt} type="button" role="tab" aria-selected={tab === gt} className={tab === gt ? 'dang-chon' : ''} onClick={() => setTab(gt)}>
            {nhan}
            <span className="dem">{so ?? 0}</span>
          </button>
        ))}
      </div>

      {!duLieu && <p className="dang-tai">Đang tải…</p>}

      {duLieu && tab === 'taiKhoan' && (
        <>
          <div className="thanh-cong-cu">
            <span className="goi-y-nho nhoi">Gắn tài khoản với hồ sơ nhân viên để người đó xem được công, lương của mình.</span>
            <button
              type="button"
              className="nut nut-chinh"
              onClick={() =>
                setSuaTk({
                  moi: true,
                  tk: { id: taoId(), tenDangNhap: '', hoTen: '', vaiTroId: duLieu.vaiTro.find((v) => !v.heThong)?.id ?? '', nhanVienId: null, khoa: false, matKhau: '' },
                })
              }
            >
              <BieuTuong ten="them" /> Thêm tài khoản
            </button>
          </div>
          <ul className="ds-don">
            {duLieu.taiKhoan.map((t) => (
              <li key={t.id}>
                <button type="button" className="dong-don" onClick={() => setSuaTk({ tk: { ...t, matKhau: '' }, moi: false })}>
                  <span className="dong-don-ten">
                    <strong>
                      {t.hoTen} {t.id === nguoiDung.id && <small>(bạn)</small>}
                    </strong>
                    <small>
                      {t.tenDangNhap} · {tenVaiTro.get(t.vaiTroId)}
                      {t.nhanVienId && ` · NV: ${tenNhanVien.get(t.nhanVienId) ?? '?'}`}
                    </small>
                  </span>
                  {t.khoa && <NhanTrangThai loai="huy" nhan="Đã khoá" />}
                  <BieuTuong ten="muiTenPhai" co={20} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {duLieu && tab === 'vaiTro' && (
        <>
          <div className="thanh-cong-cu">
            <span className="goi-y-nho nhoi">Vai trò Quản trị luôn có đủ mọi quyền.</span>
            <button
              type="button"
              className="nut nut-chinh"
              onClick={() => setSuaVt({ moi: true, vt: { id: taoId(), ten: '', moTa: '', quyen: [], heThong: false, thuTu: 0, soNguoiDung: 0 } })}
            >
              <BieuTuong ten="them" /> Thêm vai trò
            </button>
          </div>
          {duLieu.vaiTro.length === 0 && <Trong>Chưa có vai trò nào.</Trong>}
          <ul className="ds-don">
            {duLieu.vaiTro.map((v) => (
              <li key={v.id}>
                <button type="button" className="dong-don" onClick={() => setSuaVt({ vt: v, moi: false })}>
                  <span className="dong-don-ten">
                    <strong>{v.ten}</strong>
                    <small>
                      {v.heThong ? 'Toàn quyền' : v.quyen.length ? v.quyen.map((q) => DS_QUYEN.find((d) => d.ma === q)?.ten).join(', ') : 'Chỉ xem công của mình'}
                    </small>
                  </span>
                  <span className="dem">{v.soNguoiDung}</span>
                  <BieuTuong ten="muiTenPhai" co={20} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {suaTk && duLieu && (
        <HopThoaiTaiKhoan
          banDau={suaTk.tk}
          moi={suaTk.moi}
          laToi={suaTk.tk.id === nguoiDung.id}
          vaiTro={duLieu.vaiTro}
          nhanVien={duLieu.nhanVien}
          onDong={() => setSuaTk(null)}
        />
      )}
      {suaVt && <HopThoaiVaiTro banDau={suaVt.vt} moi={suaVt.moi} onDong={() => setSuaVt(null)} />}
    </TrangChinh>
  );
}

function HopThoaiTaiKhoan({
  banDau,
  moi,
  laToi,
  vaiTro,
  nhanVien,
  onDong,
}: {
  banDau: LuuTaiKhoan;
  moi: boolean;
  laToi: boolean;
  vaiTro: VaiTro[];
  nhanVien: NhanVien[];
  onDong: () => void;
}) {
  const { xacNhan, thongBao } = useGiaoTiep();
  const [tk, setTk] = useState(banDau);
  const doi = (thayDoi: Partial<LuuTaiKhoan>) => setTk((t) => ({ ...t, ...thayDoi }));

  const luu = async () => {
    try {
      await apiCms.taiKhoan.luu({ ...tk, matKhau: tk.matKhau || undefined } as TaiKhoan & { matKhau?: string });
      thongBao(moi ? 'Đã tạo tài khoản' : tk.matKhau ? 'Đã lưu và đặt lại mật khẩu' : 'Đã lưu thay đổi');
      onDong();
    } catch (e) {
      thongBao((e as Error).message, 'loi');
    }
  };
  const xoa = async () => {
    if (!(await xacNhan(`Xoá tài khoản "${tk.tenDangNhap}"? Người này sẽ không đăng nhập được nữa.`, { nutDongY: 'Xoá' }))) return;
    try {
      await apiCms.taiKhoan.xoa(tk.id!);
      thongBao('Đã xoá tài khoản');
      onDong();
    } catch (e) {
      thongBao((e as Error).message, 'loi');
    }
  };

  return (
    <HopThoai
      tieuDe={moi ? 'Thêm tài khoản' : 'Sửa tài khoản'}
      onDong={onDong}
      chanTrang={
        <div className="hang-nut">
          {!moi && !laToi && (
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
      <OChu nhan="Họ tên *" value={tk.hoTen ?? ''} onChange={(hoTen) => doi({ hoTen })} autoFocus={moi} />
      <OChu
        nhan="Tên đăng nhập *"
        value={tk.tenDangNhap ?? ''}
        onChange={(v) => doi({ tenDangNhap: v.toLowerCase().replace(/\s/g, '') })}
        autoCapitalize="none"
        placeholder="vd: an.nguyen"
      />
      <OChu
        nhan={moi ? 'Mật khẩu * (ít nhất 6 ký tự)' : 'Đặt lại mật khẩu (để trống = giữ nguyên)'}
        value={tk.matKhau ?? ''}
        onChange={(matKhau) => doi({ matKhau })}
        type="password"
        autoComplete="new-password"
      />
      <OChon nhan="Vai trò" value={tk.vaiTroId ?? ''} onChange={(vaiTroId) => doi({ vaiTroId })} luaChon={vaiTro.map((v) => ({ giaTri: v.id, nhan: v.ten }))} trong="— Chọn vai trò —" />
      <OChon
        nhan="Hồ sơ nhân viên"
        value={tk.nhanVienId ?? ''}
        onChange={(v) => doi({ nhanVienId: v || null })}
        luaChon={nhanVien.map((n) => ({ giaTri: n.id, nhan: n.hoTen + (n.dangLam ? '' : ' (đã nghỉ)') }))}
        trong="— Không gắn —"
        goiY="Gắn để người này xem được bảng công và lương của mình."
      />
      {!laToi && (
        <label className={`o-tich ${tk.khoa ? 'dang-chon' : ''}`}>
          <input type="checkbox" checked={Boolean(tk.khoa)} onChange={(e) => doi({ khoa: e.target.checked })} />
          Khoá tài khoản (không đăng nhập được, đăng xuất khỏi mọi máy)
        </label>
      )}
    </HopThoai>
  );
}

function HopThoaiVaiTro({ banDau, moi, onDong }: { banDau: VaiTro; moi: boolean; onDong: () => void }) {
  const { xacNhan, thongBao } = useGiaoTiep();
  const [vt, setVt] = useState(banDau);
  const batTat = (q: MaQuyen) => setVt((v) => ({ ...v, quyen: v.quyen.includes(q) ? v.quyen.filter((x) => x !== q) : [...v.quyen, q] }));

  const luu = async () => {
    try {
      await apiCms.taiKhoan.luuVaiTro(vt);
      thongBao(moi ? 'Đã thêm vai trò' : 'Đã lưu vai trò');
      onDong();
    } catch (e) {
      thongBao((e as Error).message, 'loi');
    }
  };
  const xoa = async () => {
    if (!(await xacNhan(`Xoá vai trò "${vt.ten}"?`, { nutDongY: 'Xoá' }))) return;
    try {
      await apiCms.taiKhoan.xoaVaiTro(vt.id);
      thongBao('Đã xoá vai trò');
      onDong();
    } catch (e) {
      thongBao((e as Error).message, 'loi');
    }
  };

  return (
    <HopThoai
      tieuDe={moi ? 'Thêm vai trò' : 'Sửa vai trò'}
      onDong={onDong}
      chanTrang={
        <div className="hang-nut">
          {!moi && !vt.heThong && (
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
      <OChu nhan="Tên vai trò *" value={vt.ten} onChange={(ten) => setVt((v) => ({ ...v, ten }))} autoFocus={moi} />
      <OChu nhan="Mô tả" value={vt.moTa} onChange={(moTa) => setVt((v) => ({ ...v, moTa }))} />
      <fieldset className="chon-thong-tin">
        <legend className="nhan">Được dùng các chức năng</legend>
        {vt.heThong ? (
          <p className="goi-y-nho">Vai trò hệ thống: luôn có đủ mọi quyền.</p>
        ) : (
          <div className="ds-quyen">
            {DS_QUYEN.map((q) => (
              <label key={q.ma} className={`o-tich ${vt.quyen.includes(q.ma) ? 'dang-chon' : ''}`}>
                <input type="checkbox" checked={vt.quyen.includes(q.ma)} onChange={() => batTat(q.ma)} />
                <span>
                  {q.ten}
                  <small>{q.moTa}</small>
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
    </HopThoai>
  );
}
