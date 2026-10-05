/**
 * Quản lý landing page (khung tạm): nội dung theo khối, thư viện ảnh, khách liên hệ, SEO.
 * Trang landing (làm riêng) đọc dữ liệu qua API công khai — xem tab "Kết nối".
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BieuTuong } from '../../components/BieuTuong';
import { dinhDangKichThuoc, OChon } from '../../components/ChungCms';
import { HopThoai, useGiaoTiep } from '../../components/HopThoai';
import { NhanLuu, NhanTrangThai, The, TrangChinh, Trong } from '../../components/KhungTrang';
import { OChu } from '../../components/ONhap';
import { useTruyVan } from '../../db/hooks';
import { taoId } from '../../lib/id';
import { useTuLuu } from '../../lib/useTuLuu';
import { apiCms } from '../api';
import { duongDanAnh, LOAI_KHOI, tenLoaiKhoi, type AnhLanding, type CaiDatLanding, type KhoiLanding, type MucKhoi } from './kieu';

type Tab = 'noi-dung' | 'anh' | 'lien-he' | 'cai-dat' | 'ket-noi';
const DS_TAB: { id: Tab; ten: string }[] = [
  { id: 'noi-dung', ten: 'Nội dung' },
  { id: 'anh', ten: 'Thư viện ảnh' },
  { id: 'lien-he', ten: 'Khách liên hệ' },
  { id: 'cai-dat', ten: 'SEO & cài đặt' },
  { id: 'ket-noi', ten: 'Kết nối' },
];

export function LandingTrang() {
  const viTri = useLocation();
  const dieuHuong = useNavigate();
  const tab: Tab = DS_TAB.find((t) => t.id === viTri.hash.slice(1))?.id ?? 'noi-dung';
  const anh = useTruyVan(() => apiCms.landing.dsAnh(), []);
  const lienHe = useTruyVan(() => apiCms.landing.dsLienHe(), []);
  const soMoi = (lienHe ?? []).filter((l) => !l.daXuLy).length;

  return (
    <TrangChinh tieuDe="Landing page" phuDe="Nội dung trang giới thiệu xưởng trên Internet">
      <div className="tab-loai cuon" role="tablist">
        {DS_TAB.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'dang-chon' : ''}
            onClick={() => dieuHuong({ hash: t.id }, { replace: true })}
          >
            {t.ten}
            {t.id === 'lien-he' && soMoi > 0 && <span className="dem">{soMoi}</span>}
          </button>
        ))}
      </div>
      {tab === 'noi-dung' && <NoiDung anh={anh ?? []} />}
      {tab === 'anh' && <ThuVienAnh anh={anh} />}
      {tab === 'lien-he' && <KhachLienHe ds={lienHe} />}
      {tab === 'cai-dat' && <CaiDatSeo anh={anh ?? []} />}
      {tab === 'ket-noi' && <KetNoi />}
    </TrangChinh>
  );
}

/* ---------- Nội dung theo khối ---------- */

function NoiDung({ anh }: { anh: AnhLanding[] }) {
  const ds = useTruyVan(() => apiCms.landing.dsKhoi(), []);
  const [sua, setSua] = useState<{ k: KhoiLanding; moi: boolean } | null>(null);
  const { thongBao } = useGiaoTiep();

  const doiCho = async (i: number, huong: -1 | 1) => {
    if (!ds) return;
    const moi = [...ds];
    [moi[i], moi[i + huong]] = [moi[i + huong], moi[i]];
    await apiCms.landing.thuTuKhoi(moi.map((k) => k.id)).catch((e) => thongBao((e as Error).message, 'loi'));
  };
  const batTat = async (k: KhoiLanding) => {
    await apiCms.landing.luuKhoi({ ...k, hien: !k.hien }).catch((e) => thongBao((e as Error).message, 'loi'));
  };

  return (
    <>
      <div className="thanh-cong-cu">
        <p className="goi-y-nho nhoi">Trang landing hiện các khối theo thứ tự dưới đây. Khối đang ẩn không xuất hiện trên trang.</p>
        <button
          type="button"
          className="nut nut-chinh"
          onClick={() =>
            setSua({
              moi: true,
              k: { id: taoId(), loai: 'dichVu', tieuDe: '', phuDe: '', noiDung: '', anhId: null, nutChu: '', nutLienKet: '', danhSachMuc: [], hien: true, thuTu: 0, ngaySua: 0 },
            })
          }
        >
          <BieuTuong ten="them" /> Thêm khối
        </button>
      </div>
      {!ds && <p className="dang-tai">Đang tải…</p>}
      {ds && ds.length === 0 && <Trong bieuTuong="web">Chưa có khối nội dung nào.</Trong>}
      {!!ds?.length && (
        <ul className="ds-don">
          {ds.map((k, i) => (
            <li key={k.id} className="dong-co-sap-xep">
              <button type="button" className="dong-don" onClick={() => setSua({ k, moi: false })}>
                {k.anhId ? <img className="anh-nho" src={duongDanAnh(k.anhId)!} alt="" /> : <span className="anh-nho trong" />}
                <span className="dong-don-ten">
                  <strong>{k.tieuDe || '(Chưa có tiêu đề)'}</strong>
                  <small>
                    {tenLoaiKhoi(k.loai)}
                    {k.danhSachMuc.length > 0 && ` · ${k.danhSachMuc.length} mục`}
                  </small>
                </span>
                {!k.hien && <NhanTrangThai loai="huy" nhan="Đang ẩn" />}
              </button>
              <span className="nut-sap-xep">
                <button type="button" className="nut-bieu-tuong" onClick={() => batTat(k)} aria-label={k.hien ? 'Ẩn khối' : 'Hiện khối'} title={k.hien ? 'Ẩn khối' : 'Hiện khối'}>
                  <BieuTuong ten={k.hien ? 'mat' : 'matAn'} co={18} />
                </button>
                <button type="button" className="nut-bieu-tuong" disabled={i === 0} onClick={() => doiCho(i, -1)} aria-label="Đưa lên">
                  <BieuTuong ten="len" co={18} />
                </button>
                <button type="button" className="nut-bieu-tuong" disabled={i === ds.length - 1} onClick={() => doiCho(i, 1)} aria-label="Đưa xuống">
                  <BieuTuong ten="muiTenXuong" co={18} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {sua && <HopThoaiKhoi banDau={sua.k} moi={sua.moi} anh={anh} onDong={() => setSua(null)} />}
    </>
  );
}

/** Chọn ảnh từ thư viện (lưới ảnh nhỏ) */
function ChonAnh({ nhan, value, onChange, anh }: { nhan: string; value: string | null; onChange: (id: string | null) => void; anh: AnhLanding[] }) {
  return (
    <div className="truong">
      <span className="nhan">{nhan}</span>
      {anh.length === 0 ? (
        <p className="goi-y-nho">Thư viện chưa có ảnh — tải ảnh lên ở tab “Thư viện ảnh”.</p>
      ) : (
        <div className="luoi-chon-anh">
          <button type="button" className={`o-chon-anh trong ${!value ? 'dang-chon' : ''}`} onClick={() => onChange(null)}>
            Không
          </button>
          {anh.map((a) => (
            <button key={a.id} type="button" className={`o-chon-anh ${value === a.id ? 'dang-chon' : ''}`} onClick={() => onChange(a.id)} title={a.moTa || a.tenFile}>
              <img src={duongDanAnh(a.id)!} alt={a.moTa} loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HopThoaiKhoi({ banDau, moi, anh, onDong }: { banDau: KhoiLanding; moi: boolean; anh: AnhLanding[]; onDong: () => void }) {
  const { xacNhan, thongBao } = useGiaoTiep();
  const [k, setK] = useState(banDau);
  const doi = (x: Partial<KhoiLanding>) => setK((c) => ({ ...c, ...x }));
  const doiMuc = (i: number, x: Partial<MucKhoi>) => doi({ danhSachMuc: k.danhSachMuc.map((m, j) => (j === i ? { ...m, ...x } : m)) });

  const luu = async () => {
    try {
      await apiCms.landing.luuKhoi(k);
      thongBao(moi ? 'Đã thêm khối' : 'Đã lưu khối');
      onDong();
    } catch (e) {
      thongBao((e as Error).message, 'loi');
    }
  };
  const xoa = async () => {
    if (!(await xacNhan(`Xoá khối "${k.tieuDe || tenLoaiKhoi(k.loai)}"?`, { nutDongY: 'Xoá' }))) return;
    await apiCms.landing.xoaKhoi(k.id);
    thongBao('Đã xoá khối');
    onDong();
  };

  return (
    <HopThoai
      tieuDe={moi ? 'Thêm khối nội dung' : 'Sửa khối nội dung'}
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
      <OChon
        nhan="Loại khối"
        value={k.loai}
        onChange={(loai) => doi({ loai })}
        luaChon={[...LOAI_KHOI.map((l) => ({ giaTri: l.ma as string, nhan: l.ten })), ...(LOAI_KHOI.some((l) => l.ma === k.loai) ? [] : [{ giaTri: k.loai, nhan: k.loai }])]}
        goiY={LOAI_KHOI.find((l) => l.ma === k.loai)?.moTa}
      />
      <OChu nhan="Tiêu đề" value={k.tieuDe} onChange={(tieuDe) => doi({ tieuDe })} />
      <OChu nhan="Phụ đề" value={k.phuDe} onChange={(phuDe) => doi({ phuDe })} />
      <OChu nhan="Nội dung" value={k.noiDung} onChange={(noiDung) => doi({ noiDung })} nhieuDong />
      <ChonAnh nhan="Ảnh của khối" value={k.anhId} onChange={(anhId) => doi({ anhId })} anh={anh} />
      <div className="luoi-2">
        <OChu nhan="Chữ trên nút" value={k.nutChu} onChange={(nutChu) => doi({ nutChu })} placeholder="vd: Nhận báo giá" />
        <OChu nhan="Liên kết của nút" value={k.nutLienKet} onChange={(nutLienKet) => doi({ nutLienKet })} placeholder="vd: #lien-he hoặc tel:09…" />
      </div>
      <fieldset className="chon-thong-tin">
        <legend className="nhan">Các mục con ({k.danhSachMuc.length})</legend>
        <p className="goi-y-nho">Dịch vụ, công trình, con số, cảm nhận khách… mỗi mục một thẻ trên trang.</p>
        {k.danhSachMuc.map((m, i) => (
          <div key={i} className="the-muc-con">
            <div className="the-muc-con-dau">
              <strong>Mục {i + 1}</strong>
              <button type="button" className="nut-bieu-tuong do" aria-label={`Xoá mục ${i + 1}`} onClick={() => doi({ danhSachMuc: k.danhSachMuc.filter((_, j) => j !== i) })}>
                <BieuTuong ten="xoa" co={18} />
              </button>
            </div>
            <OChu nhan="Tiêu đề" value={m.tieuDe} onChange={(tieuDe) => doiMuc(i, { tieuDe })} />
            <OChu nhan="Mô tả" value={m.moTa} onChange={(moTa) => doiMuc(i, { moTa })} nhieuDong />
            <OChu nhan="Liên kết (tuỳ chọn)" value={m.lienKet} onChange={(lienKet) => doiMuc(i, { lienKet })} />
            <ChonAnh nhan="Ảnh" value={m.anhId} onChange={(anhId) => doiMuc(i, { anhId })} anh={anh} />
          </div>
        ))}
        <button type="button" className="nut nut-vien nut-rong" onClick={() => doi({ danhSachMuc: [...k.danhSachMuc, { tieuDe: '', moTa: '', anhId: null, lienKet: '' }] })}>
          <BieuTuong ten="them" /> Thêm mục
        </button>
      </fieldset>
      <label className={`o-tich ${k.hien ? 'dang-chon' : ''}`}>
        <input type="checkbox" checked={k.hien} onChange={(e) => doi({ hien: e.target.checked })} />
        Hiện khối này trên trang
      </label>
    </HopThoai>
  );
}

/* ---------- Thư viện ảnh ---------- */

function ThuVienAnh({ anh }: { anh: AnhLanding[] | undefined }) {
  const { xacNhan, thongBao } = useGiaoTiep();
  const oFile = useRef<HTMLInputElement>(null);
  const [dangTai, setDangTai] = useState(false);

  const taiLen = async (files: FileList | null) => {
    setDangTai(true);
    for (const f of Array.from(files ?? [])) {
      try {
        await apiCms.landing.themAnh(f);
      } catch (e) {
        thongBao(`${f.name}: ${(e as Error).message}`, 'loi');
      }
    }
    setDangTai(false);
  };

  return (
    <>
      <div className="thanh-cong-cu">
        <p className="goi-y-nho nhoi">Ảnh JPEG, PNG, WebP, SVG tối đa 5 MB. Nên nén ảnh trước (rộng ~1600px) để trang tải nhanh.</p>
        <button type="button" className="nut nut-chinh" disabled={dangTai} onClick={() => oFile.current?.click()}>
          <BieuTuong ten="anh" /> {dangTai ? 'Đang tải lên…' : 'Tải ảnh lên'}
        </button>
        <input
          ref={oFile}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          multiple
          hidden
          onChange={(e) => void taiLen(e.target.files).then(() => (e.target.value = ''))}
        />
      </div>
      {!anh && <p className="dang-tai">Đang tải…</p>}
      {anh && anh.length === 0 && <Trong bieuTuong="anh">Chưa có ảnh nào.</Trong>}
      {!!anh?.length && (
        <ul className="luoi-anh-landing">
          {anh.map((a) => (
            <li key={a.id}>
              <img src={duongDanAnh(a.id)!} alt={a.moTa} loading="lazy" />
              <div className="anh-landing-than">
                <input
                  className="o-nhap"
                  defaultValue={a.moTa}
                  placeholder="Mô tả ảnh (cho SEO)"
                  aria-label={`Mô tả ảnh ${a.tenFile}`}
                  onBlur={(e) => e.target.value !== a.moTa && void apiCms.landing.suaAnh(a.id, e.target.value)}
                />
                <small>
                  {a.tenFile} · {dinhDangKichThuoc(a.kichThuoc)}
                </small>
                <div className="hang-nut-nho">
                  <button
                    type="button"
                    className="nut-nho"
                    onClick={() => {
                      void navigator.clipboard?.writeText(new URL(duongDanAnh(a.id)!, location.origin).href);
                      thongBao('Đã chép đường dẫn ảnh');
                    }}
                  >
                    Chép link
                  </button>
                  <button
                    type="button"
                    className="nut-nho do"
                    onClick={async () => (await xacNhan('Xoá ảnh này? Khối đang dùng ảnh sẽ không còn ảnh.', { nutDongY: 'Xoá' })) && apiCms.landing.xoaAnh(a.id)}
                  >
                    Xoá
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ---------- Khách liên hệ ---------- */

function KhachLienHe({ ds }: { ds: Awaited<ReturnType<typeof apiCms.landing.dsLienHe>> | undefined }) {
  const { xacNhan } = useGiaoTiep();
  const [chiMoi, setChiMoi] = useState(true);
  const loc = (ds ?? []).filter((l) => !chiMoi || !l.daXuLy);
  return (
    <>
      <label className={`o-tich gon ${chiMoi ? 'dang-chon' : ''}`}>
        <input type="checkbox" checked={chiMoi} onChange={(e) => setChiMoi(e.target.checked)} />
        Chỉ hiện yêu cầu chưa xử lý
      </label>
      {!ds && <p className="dang-tai">Đang tải…</p>}
      {ds && loc.length === 0 && <Trong bieuTuong="xong">Không có yêu cầu liên hệ nào{chiMoi ? ' cần xử lý' : ''}.</Trong>}
      <ul className="ds-the-lien-he">
        {loc.map((l) => (
          <li key={l.id} className={`the ${l.daXuLy ? 'da-xu-ly' : ''}`}>
            <div className="the-dau">
              <div className="the-ten">
                <h2>{l.hoTen}</h2>
                <p className="the-tom-tat">{new Date(l.ngayTao).toLocaleString('vi-VN')}</p>
              </div>
              {l.daXuLy ? <NhanTrangThai loai="daChot" nhan="Đã xử lý" /> : <NhanTrangThai loai="daGui" nhan="Mới" />}
            </div>
            <p className="hang-lien-he">
              {l.soDienThoai && (
                <a href={`tel:${l.soDienThoai}`} className="nut-nho">
                  <BieuTuong ten="dienThoai" co={16} /> {l.soDienThoai}
                </a>
              )}
              {l.email && (
                <a href={`mailto:${l.email}`} className="nut-nho">
                  {l.email}
                </a>
              )}
            </p>
            {l.noiDung && <p className="noi-dung-lien-he">{l.noiDung}</p>}
            <input
              className="o-nhap"
              defaultValue={l.ghiChu}
              placeholder="Ghi chú xử lý (đã gọi, đã báo giá…)"
              aria-label="Ghi chú xử lý"
              onBlur={(e) => e.target.value !== l.ghiChu && void apiCms.landing.suaLienHe(l.id, { ghiChu: e.target.value })}
            />
            <div className="hang-nut nho">
              <button type="button" className="nut nut-phu" onClick={() => apiCms.landing.suaLienHe(l.id, { daXuLy: !l.daXuLy })}>
                {l.daXuLy ? 'Đánh dấu chưa xử lý' : 'Đã xử lý'}
              </button>
              <button
                type="button"
                className="nut nut-vien-do"
                onClick={async () => (await xacNhan(`Xoá liên hệ của "${l.hoTen}"?`, { nutDongY: 'Xoá' })) && apiCms.landing.xoaLienHe(l.id)}
              >
                Xoá
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------- SEO & cài đặt ---------- */

function CaiDatSeo({ anh }: { anh: AnhLanding[] }) {
  const [c, setC] = useState<CaiDatLanding>();
  useEffect(() => {
    void apiCms.landing.caiDat().then(setC);
  }, []);
  const { trangThai, thongDiepLoi } = useTuLuu(c, (x) => apiCms.landing.luuCaiDat(x, { baoThayDoi: false }));
  if (!c) return <p className="dang-tai">Đang tải…</p>;
  const doi = (x: Partial<CaiDatLanding>) => setC((v) => (v ? { ...v, ...x } : v));
  return (
    <div className="khung-hep">
      <div className="hang-trang-thai-luu">
        <NhanLuu trangThai={trangThai} />
        {trangThai === 'loi' && <span className="chu-loi">{thongDiepLoi}</span>}
      </div>
      <The tieuDe="Xuất bản" bieuTuong="web">
        <label className={`o-tich ${c.xuatBan ? 'dang-chon' : ''}`}>
          <input type="checkbox" checked={c.xuatBan} onChange={(e) => doi({ xuatBan: e.target.checked })} />
          Mở trang landing (API công khai trả nội dung)
        </label>
        <p className="goi-y-nho">Khi tắt, trang landing nhận lỗi 503 “Trang đang được xây dựng”.</p>
      </The>
      <The tieuDe="SEO" bieuTuong="tim">
        <OChu nhan="Tiêu đề trang (thẻ title)" value={c.tieuDeTrang} onChange={(tieuDeTrang) => doi({ tieuDeTrang })} placeholder="Để trống = tên xưởng" />
        <OChu nhan="Mô tả (meta description, ~160 ký tự)" value={c.moTa} onChange={(moTa) => doi({ moTa })} nhieuDong />
        <p className="goi-y-nho">{c.moTa.length} ký tự</p>
        <OChu nhan="Từ khoá" value={c.tuKhoa} onChange={(tuKhoa) => doi({ tuKhoa })} placeholder="gia công cơ khí, tiện CNC, …" />
        <ChonAnh nhan="Ảnh khi chia sẻ (Zalo, Facebook)" value={c.anhChiaSeId} onChange={(anhChiaSeId) => doi({ anhChiaSeId })} anh={anh} />
      </The>
      <The tieuDe="Liên hệ & mạng xã hội" bieuTuong="dienThoai">
        <p className="goi-y-nho">Tên xưởng, địa chỉ, điện thoại, email, logo lấy từ Cài đặt → Thông tin xưởng.</p>
        <OChu nhan="Link Zalo" value={c.lienKetZalo} onChange={(lienKetZalo) => doi({ lienKetZalo })} placeholder="https://zalo.me/09…" />
        <OChu nhan="Link Facebook" value={c.lienKetFacebook} onChange={(lienKetFacebook) => doi({ lienKetFacebook })} />
        <OChu nhan="Bản đồ (đường dẫn nhúng Google Maps)" value={c.banDo} onChange={(banDo) => doi({ banDo })} placeholder="https://www.google.com/maps/embed?pb=…" />
        <OChu nhan="Mã đo lường (Google Analytics ID…)" value={c.maTheoDoi} onChange={(maTheoDoi) => doi({ maTheoDoi })} placeholder="G-XXXXXXX" />
      </The>
    </div>
  );
}

/* ---------- Hướng dẫn kết nối cho trang landing ---------- */

function KetNoi() {
  const goc = location.origin;
  return (
    <div className="khung-hep">
      <The tieuDe="API cho trang landing" bieuTuong="web">
        <p className="goi-y-nho">
          Trang landing làm riêng (tên miền khác cũng được) chỉ cần gọi các đường dẫn công khai dưới đây — không cần đăng nhập. Giới hạn tên miền được gọi bằng
          biến <code>LANDING_ORIGIN</code> trong <code>.env</code>.
        </p>
        <dl className="ds-api">
          <dt>
            <code>GET {goc}/api/cong-khai/trang</code>
          </dt>
          <dd>SEO, thông tin xưởng và các khối đang hiện (đã sắp thứ tự, ảnh là đường dẫn).</dd>
          <dt>
            <code>GET {goc}/api/cong-khai/anh/:id</code>
          </dt>
          <dd>File ảnh (cache 1 năm).</dd>
          <dt>
            <code>GET {goc}/api/cong-khai/logo</code>
          </dt>
          <dd>Logo xưởng.</dd>
          <dt>
            <code>POST {goc}/api/cong-khai/lien-he</code>
          </dt>
          <dd>
            JSON <code>{'{ hoTen, soDienThoai, email, noiDung }'}</code> — khách để lại thông tin, hiện ở tab “Khách liên hệ”. Mỗi IP tối đa 5 lần / 10 phút.
          </dd>
        </dl>
        <p className="goi-y-nho">
          Kiểu dữ liệu trả về: <code>TrangCongKhai</code> trong <code>src/modules/landing/kieu.ts</code>.
        </p>
      </The>
    </div>
  );
}
