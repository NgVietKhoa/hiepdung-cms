import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useCaiDat } from '../db/hooks';
import { taoBaoGiaMoi } from '../db/thaoTac';
import type { TrangThaiLuu } from '../lib/useTuLuu';
import { BieuTuong, type TenBieuTuong } from './BieuTuong';
import { HopThoai, useGiaoTiep } from './HopThoai';
import { menuDuoiCua, NHOM_MENU, type MucMenu } from './menu';

const KHOA_LUU_MENU_DONG = 'hiepDung:menuDong';
const KHOA_LUU_THANH_BEN = 'hiepDung:thanhBenMo';

function docThanhBenMo(): boolean {
  try {
    const raw = localStorage.getItem(KHOA_LUU_THANH_BEN);
    return raw === null ? true : raw === '1';
  } catch {
    return true;
  }
}

function ghiThanhBenMo(mo: boolean) {
  try {
    localStorage.setItem(KHOA_LUU_THANH_BEN, mo ? '1' : '0');
  } catch {
    /* bỏ qua */
  }
}

const cacHamLangNgheThanhBen = new Set<(mo: boolean) => void>();
let thanhBenHienTai = docThanhBenMo();

function datThanhBenMo(mo: boolean) {
  thanhBenHienTai = mo;
  ghiThanhBenMo(mo);
  cacHamLangNgheThanhBen.forEach((fn) => fn(mo));
}

function batTatThanhBen() {
  datThanhBenMo(!thanhBenHienTai);
}

function useThanhBen() {
  const [mo, setMo] = useState(thanhBenHienTai);
  useEffect(() => {
    cacHamLangNgheThanhBen.add(setMo);
    return () => {
      cacHamLangNgheThanhBen.delete(setMo);
    };
  }, []);
  return {
    mo,
    batTat: batTatThanhBen,
  };
}

function docNhomMenuDong(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(KHOA_LUU_MENU_DONG);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function ghiNhomMenuDong(giaTri: Record<string, boolean>) {
  try {
    localStorage.setItem(KHOA_LUU_MENU_DONG, JSON.stringify(giaTri));
  } catch {
    /* bỏ qua */
  }
}

/** Tạo chứng từ mới — dùng chung cho thanh bên, nút "Tạo mới" ở menu đáy và trang báo giá */
export function useTaoMoi() {
  const dieuHuong = useNavigate();
  const { thongBao } = useGiaoTiep();
  return {
    baoGia: async () => {
      try {
        dieuHuong(`/bao-gia/${await taoBaoGiaMoi()}`);
      } catch (e) {
        thongBao((e as Error).message, 'loi');
      }
    },
    nghiemThu: () => dieuHuong('/nghiem-thu/moi'),
  };
}

const LienKetMenu = ({ m, onChon, ngan }: { m: MucMenu; onChon?: () => void; ngan?: boolean }) => (
  <NavLink to={m.den} end={m.den === '/'} className={({ isActive }) => (isActive ? 'dang-mo' : '')} onClick={onChon}>
    <BieuTuong ten={m.bieuTuong} co={22} />
    <span>{ngan ? (m.nhanNgan ?? m.nhan) : m.nhan}</span>
  </NavLink>
);

/** Toàn bộ menu theo nhóm (thanh bên máy tính, hộp "Menu" trên điện thoại) */
function DanhSachMenu({ onChon }: { onChon?: () => void }) {
  const viTri = useLocation();
  const [nhomDong, setNhomDong] = useState<Record<string, boolean>>(() => docNhomMenuDong());

  const batTatNhom = (tenNhom: string) => {
    setNhomDong((cu) => {
      const moi = { ...cu, [tenNhom]: !cu[tenNhom] };
      ghiNhomMenuDong(moi);
      return moi;
    });
  };

  return (
    <nav className="menu-ben" aria-label="Menu chính">
      {NHOM_MENU.map((n) => {
        if (!n.ten) {
          return (
            <div key="dau" className="nhom-menu">
              {n.muc.map((m) => (
                <LienKetMenu key={m.den} m={m} onChon={onChon} />
              ))}
            </div>
          );
        }

        const dong = Boolean(nhomDong[n.ten]);
        const coMucDangMo = n.muc.some((m) => (m.den === '/' ? viTri.pathname === '/' : viTri.pathname.startsWith(m.den)));

        return (
          <div key={n.ten} className={`nhom-menu ${dong ? 'dong' : 'mo'}`}>
            <button
              type="button"
              className="ten-nhom-menu"
              onClick={() => batTatNhom(n.ten)}
              aria-expanded={!dong}
              title={dong ? `Mở nhóm ${n.ten}` : `Đóng nhóm ${n.ten}`}
            >
              <span className="ten-nhom-menu-chu">
                <span>{n.ten}</span>
                {dong && coMucDangMo && <span className="cham-dang-chon" title="Có trang đang mở trong nhóm này" />}
              </span>
              <span className="bieu-tuong-mui-ten" aria-hidden="true">
                <BieuTuong ten="muiTenXuong" co={14} />
              </span>
            </button>
            {!dong && (
              <div className="ds-muc-nhom">
                {n.muc.map((m) => (
                  <LienKetMenu key={m.den} m={m} onChon={onChon} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** Máy tính: thanh bên trái cố định — nút tạo nhanh ở trên, menu theo nhóm. */
function ThanhBen() {
  const tao = useTaoMoi();
  const cd = useCaiDat();
  return (
    <aside className="thanh-ben">
      <div className="thuong-hieu">
        <img src={`${import.meta.env.BASE_URL}icon-64.png`} alt="Hiệp Dung" width={36} height={36} />
        <span className="thuong-hieu-ten">
          Quản lý xưởng
          {cd.tenDonVi && <small>{cd.tenDonVi}</small>}
        </span>
      </div>
      <div className="thanh-ben-tao">
        <button type="button" className="nut nut-chinh nut-rong" onClick={tao.baoGia}>
          <BieuTuong ten="them" /> Báo giá mới
        </button>
        <button type="button" className="nut nut-vien nut-rong" onClick={tao.nghiemThu}>
          <BieuTuong ten="them" /> Nghiệm thu mới
        </button>
      </div>
      <DanhSachMenu />
    </aside>
  );
}

/** Điện thoại: menu dưới đáy (dễ bấm một tay) — vài mục hay dùng, nút "Tạo mới", nút "Menu" mở toàn bộ. */
function MenuDuoi() {
  const [mo, setMo] = useState<'tao' | 'menu' | null>(null);
  const tao = useTaoMoi();
  const muc = menuDuoiCua(3);
  const chon = (lam: () => void) => () => {
    setMo(null);
    lam();
  };
  const nutTao = (
    <button type="button" className="nut-tao-moi" onClick={() => setMo('tao')}>
      <span className="vong-tao">
        <BieuTuong ten="them" co={30} />
      </span>
      <span>Tạo mới</span>
    </button>
  );
  return (
    <>
      <nav className="menu-duoi" aria-label="Menu nhanh" style={{ gridTemplateColumns: `repeat(${muc.length + 2}, 1fr)` }}>
        {muc.slice(0, 2).map((m) => (
          <LienKetMenu key={m.den} m={m} ngan />
        ))}
        {nutTao}
        {muc.slice(2).map((m) => (
          <LienKetMenu key={m.den} m={m} ngan />
        ))}
        <button type="button" className="nut-menu-duoi" onClick={() => setMo('menu')}>
          <BieuTuong ten="menu" co={22} />
          <span>Menu</span>
        </button>
      </nav>
      {mo === 'tao' && (
        <HopThoai tieuDe="Tạo mới" onDong={() => setMo(null)}>
          <div className="ds-lua-chon-tao">
            <button type="button" className="lua-chon-tao" onClick={chon(tao.baoGia)}>
              <span className="o-bieu-tuong">
                <BieuTuong ten="vanBan" co={28} />
              </span>
              <span>
                <strong>Báo giá mới</strong>
                <small>Lập báo giá, in hoặc lưu file gửi khách</small>
              </span>
            </button>
            <button type="button" className="lua-chon-tao" onClick={chon(tao.nghiemThu)}>
              <span className="o-bieu-tuong">
                <BieuTuong ten="xong" co={28} />
              </span>
              <span>
                <strong>Biên bản nghiệm thu</strong>
                <small>Lập từ báo giá đã chốt, hoặc biên bản trống</small>
              </span>
            </button>
          </div>
        </HopThoai>
      )}
      {mo === 'menu' && (
        <HopThoai tieuDe="Menu" onDong={() => setMo(null)}>
          <div className="menu-hop-thoai">
            <DanhSachMenu onChon={() => setMo(null)} />
          </div>
        </HopThoai>
      )}
    </>
  );
}

/** Chờ tải mã của trang (mỗi trang là một file JS riêng, chỉ tải khi mở) */
export function DangTaiTrang() {
  return (
    <p className="dang-tai">
      <span className="vong-quay" /> Đang tải…
    </p>
  );
}

/** Khung bố cục cố định cho các trang có menu: Thanh bên và Menu đáy giữ nguyên vị trí, không bị huỷ / tạo lại khi chuyển trang. */
export function BoKhungMenu() {
  const { mo: thanhBenMo } = useThanhBen();
  const viTri = useLocation();
  return (
    <div className={`khung-co-menu ${thanhBenMo ? '' : 'thanh-ben-dong'}`}>
      <ThanhBen />
      <div className="vung-trang">
        <div key={viTri.pathname} className="vung-chuyen-trang">
          <Suspense fallback={<DangTaiTrang />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
      <MenuDuoi />
    </div>
  );
}

/** Trang có menu (mọi trang danh sách / báo cáo của CMS). */
export function TrangChinh({
  tieuDe,
  phuDe,
  phai,
  children,
}: {
  tieuDe: string;
  phuDe?: ReactNode;
  /** Nút / trạng thái bên phải đầu trang */
  phai?: ReactNode;
  children: ReactNode;
}) {
  const { mo: thanhBenMo, batTat: batTatThanhBen } = useThanhBen();

  return (
    <>
      <header className="dau-trang">
        <button
          type="button"
          className="nut-bat-tat-ben"
          onClick={batTatThanhBen}
          title={thanhBenMo ? 'Thu gọn thanh bên' : 'Mở thanh bên'}
          aria-label={thanhBenMo ? 'Thu gọn thanh bên' : 'Mở thanh bên'}
        >
          <BieuTuong ten="menu" co={22} />
        </button>
        <div className="dau-trang-chu">
          <h1>{tieuDe}</h1>
          {phuDe && <p>{phuDe}</p>}
        </div>
        {phai}
      </header>
      <main className="noi-dung co-menu">{children}</main>
    </>
  );
}

/** Trạng thái tự lưu: ✓ Đã lưu / Đang lưu… / Chưa lưu được */
export function NhanLuu({ trangThai }: { trangThai: TrangThaiLuu }) {
  return (
    <span className={`nhan-luu ${trangThai}`} role="status">
      {trangThai === 'daLuu' && (
        <>
          <BieuTuong ten="xong" co={18} /> Đã lưu
        </>
      )}
      {trangThai === 'dangLuu' && (
        <>
          <span className="cham-luu" /> Đang lưu…
        </>
      )}
      {trangThai === 'loi' && (
        <>
          <BieuTuong ten="canhBao" co={18} /> Chưa lưu
        </>
      )}
    </span>
  );
}

/** Trang soạn thảo: toàn màn hình (không menu) cho rộng chỗ nhập, thanh thao tác cố định dưới đáy. */
export function TrangSoan({
  tieuDe,
  phuDe,
  trangThaiLuu,
  loiLuu,
  children,
  thanhDuoi,
  quayVe = '/bao-gia',
  hep,
}: {
  tieuDe: string;
  phuDe?: ReactNode;
  trangThaiLuu?: TrangThaiLuu;
  /** Lý do chưa lưu được (mất mạng, trùng số chứng từ…) */
  loiLuu?: string;
  children: ReactNode;
  thanhDuoi?: ReactNode;
  quayVe?: string | number;
  /** Nội dung ít (một cột thẻ): thu khung về 760px, vẫn căn giữa và thẳng hàng với đầu trang */
  hep?: boolean;
}) {
  const dieuHuong = useNavigate();
  const lopHep = hep ? ' hep' : '';
  return (
    <>
      <header className={`dau-trang dau-soan${lopHep}`}>
        <button
          type="button"
          className="nut-quay-lai"
          aria-label="Quay lại"
          onClick={() => (typeof quayVe === 'number' ? dieuHuong(quayVe) : dieuHuong(quayVe))}
        >
          <BieuTuong ten="quayLai" co={26} />
          <span>Quay lại</span>
        </button>
        <div className="dau-trang-chu">
          <h1>{tieuDe}</h1>
          {phuDe && <p>{phuDe}</p>}
        </div>
        {trangThaiLuu && <NhanLuu trangThai={trangThaiLuu} />}
      </header>
      <main className={`noi-dung ${thanhDuoi ? 'co-thanh-duoi' : ''}${lopHep}`}>
        {trangThaiLuu === 'loi' && loiLuu && (
          <div className="canh-bao-loi" role="alert">
            <BieuTuong ten="canhBao" /> Chưa lưu được: {loiLuu}
          </div>
        )}
        {children}
      </main>
      {thanhDuoi && (
        <div className={`thanh-duoi${lopHep}`}>
          <div className="thanh-duoi-trong">{thanhDuoi}</div>
        </div>
      )}
    </>
  );
}

const khoaMo = (khoa: string) => `baoGiaNhanh:mo:${khoa}`;
function docMo(khoa: string | undefined, macDinh: boolean): boolean {
  if (!khoa) return macDinh;
  try {
    const v = localStorage.getItem(khoaMo(khoa));
    return v === null ? macDinh : v === '1';
  } catch {
    return macDinh;
  }
}

/**
 * Thẻ nội dung. `thuGon`: bấm tiêu đề để đóng / mở; `tomTat` hiện dưới tiêu đề khi đang đóng.
 * `moSan`: mở sẵn lần đầu (mặc định có). `khoa`: nhớ trạng thái đóng / mở trên máy này cho lần sau.
 */
export function The({
  tieuDe,
  bieuTuong,
  children,
  phai,
  thuGon,
  moSan = true,
  khoa,
  tomTat,
}: {
  tieuDe?: string;
  bieuTuong?: TenBieuTuong;
  children: ReactNode;
  phai?: ReactNode;
  thuGon?: boolean;
  moSan?: boolean;
  khoa?: string;
  tomTat?: ReactNode;
}) {
  const [mo] = useState(() => docMo(khoa, moSan));
  const dau = (
    <>
      {bieuTuong && (
        <span className="the-bieu-tuong">
          <BieuTuong ten={bieuTuong} co={20} />
        </span>
      )}
      <div className="the-ten">
        {tieuDe && <h2>{tieuDe}</h2>}
        {thuGon && tomTat && <p className="the-tom-tat">{tomTat}</p>}
      </div>
    </>
  );
  if (thuGon) {
    return (
      <details
        className="the the-thu-gon"
        open={mo}
        onToggle={(e) => {
          if (!khoa) return;
          try {
            localStorage.setItem(khoaMo(khoa), e.currentTarget.open ? '1' : '0');
          } catch {
            /* bỏ qua */
          }
        }}
      >
        <summary className="the-dau">
          {dau}
          {/* Bấm nút bên phải (vd. "Dùng câu mặc định") không làm đóng / mở thẻ */}
          {phai && (
            <span className="the-phai" onClick={(e) => e.preventDefault()}>
              {phai}
            </span>
          )}
          <BieuTuong ten="muiTenXuong" co={22} />
        </summary>
        <div className="the-than">{children}</div>
      </details>
    );
  }
  return (
    <section className="the">
      {(tieuDe || phai) && (
        <div className="the-dau">
          {dau}
          {phai}
        </div>
      )}
      {children}
    </section>
  );
}

export function NhanTrangThai({ loai, nhan }: { loai: string; nhan: string }) {
  return <span className={`nhan-trang-thai tt-${loai}`}>{nhan}</span>;
}

/** Ô tìm kiếm có biểu tượng kính lúp */
export function OTim({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="o-tim">
      <BieuTuong ten="tim" />
      <input
        className="o-nhap"
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
      />
      {value && (
        <button type="button" className="xoa-tim" onClick={() => onChange('')} aria-label="Xoá ô tìm">
          <BieuTuong ten="dong" co={18} />
        </button>
      )}
    </div>
  );
}

/** Thông báo khi danh sách trống, kèm nút hành động (tuỳ chọn) */
export function Trong({ bieuTuong = 'vanBan', children, hanhDong }: { bieuTuong?: TenBieuTuong; children: ReactNode; hanhDong?: ReactNode }) {
  return (
    <div className="trong">
      <span className="trong-bieu-tuong">
        <BieuTuong ten={bieuTuong} co={32} />
      </span>
      <p>{children}</p>
      {hanhDong}
    </div>
  );
}
