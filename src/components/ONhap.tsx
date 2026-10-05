/** Các ô nhập liệu: chữ, tiền (tự thêm dấu chấm), số lượng (bàn phím số), ngày. */
import { useEffect, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { BieuTuong } from './BieuTuong';
import { dinhDangNgay, dinhDangSo, dinhDangSoLuong, docChuoiSoLuong, docChuoiTien } from '../lib/dinhDang';
import { lamTronSoLuong } from '../lib/tinhTien';

export function TruongNhap({ nhan, goiY, children, id }: { nhan: string; goiY?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <div className="truong">
      <label className="nhan" htmlFor={id}>
        {nhan}
      </label>
      {children}
      {goiY && <div className="goi-y-nho">{goiY}</div>}
    </div>
  );
}

type ThuocTinhGoc = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;

export function OChu({
  nhan,
  value,
  onChange,
  nhieuDong,
  type,
  ...khac
}: ThuocTinhGoc & { nhan: string; value: string; onChange: (v: string) => void; nhieuDong?: boolean }) {
  const id = useId();
  const [hienMatKhau, setHienMatKhau] = useState(false);
  const laMatKhau = type === 'password';

  return (
    <TruongNhap nhan={nhan} id={id}>
      {nhieuDong ? (
        <textarea
          id={id}
          className="o-nhap"
          rows={3}
          value={value}
          placeholder={khac.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : laMatKhau ? (
        <div className="o-nhap-mat-khau">
          <input
            id={id}
            className="o-nhap"
            type={hienMatKhau ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            {...khac}
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
      ) : (
        <input id={id} className="o-nhap" type={type} value={value} onChange={(e) => onChange(e.target.value)} {...khac} />
      )}
    </TruongNhap>
  );
}

const chonHet = (e: React.FocusEvent<HTMLInputElement>) => {
  const o = e.currentTarget;
  // Chạm vào là chọn hết, gõ số mới sẽ thay luôn số cũ
  requestAnimationFrame(() => o.select());
};

/** Ô tiền: bàn phím số, tự chèn dấu chấm hàng nghìn khi gõ, giữ đúng vị trí con trỏ. */
export function OTien({
  value,
  onChange,
  nhan,
  ...khac
}: ThuocTinhGoc & { value: number; onChange: (v: number) => void; nhan?: string }) {
  const id = useId();
  const o = (
    <div className="o-co-don-vi">
      <input
        id={id}
        className="o-nhap so"
        inputMode="numeric"
        autoComplete="off"
        value={value ? dinhDangSo(value) : ''}
        placeholder="0"
        onFocus={chonHet}
        onChange={(e) => {
          const o = e.currentTarget;
          const viTri = o.selectionStart ?? o.value.length;
          const soChuSoTruoc = o.value.slice(0, viTri).replace(/\D/g, '').length;
          const moi = Math.min(docChuoiTien(o.value), 999_999_999_999);
          onChange(moi);
          requestAnimationFrame(() => {
            // Đặt lại con trỏ sau đúng số chữ số đã gõ
            let dem = 0;
            let p = 0;
            const s = o.value;
            while (p < s.length && dem < soChuSoTruoc) {
              if (/\d/.test(s[p])) dem++;
              p++;
            }
            o.setSelectionRange(p, p);
          });
        }}
        {...khac}
      />
      <span className="don-vi">đ</span>
    </div>
  );
  return nhan ? <TruongNhap nhan={nhan} id={id}>{o}</TruongNhap> : o;
}

/** Lớn nhất cột số lượng Decimal(14,3) trong DB chứa được */
const SO_TOI_DA = 99_999_999_999;

/** Ô số lượng: cho phép số lẻ với dấu phẩy (1,5), tối đa 3 chữ số thập phân. */
export function OSo({
  value,
  onChange,
  nhan,
  soNguyen,
  ...khac
}: ThuocTinhGoc & { value: number; onChange: (v: number) => void; nhan?: string; soNguyen?: boolean }) {
  const id = useId();
  const [chu, setChu] = useState(value ? dinhDangSoLuong(value) : '');
  const [dangGo, setDangGo] = useState(false);
  useEffect(() => {
    if (!dangGo) setChu(value ? dinhDangSoLuong(value) : '');
  }, [value, dangGo]);

  const o = (
    <input
      id={id}
      className="o-nhap so"
      inputMode={soNguyen ? 'numeric' : 'decimal'}
      autoComplete="off"
      value={chu}
      placeholder="0"
      onFocus={(e) => {
        setDangGo(true);
        chonHet(e);
      }}
      onBlur={() => setDangGo(false)}
      onChange={(e) => {
        const s = e.target.value.replace(/[^\d,.]/g, '');
        setChu(s);
        // Giữ đúng độ chính xác DB lưu (3 chữ số thập phân) để số tính trên màn hình không đổi sau khi tải lại
        const n = Math.min(docChuoiSoLuong(s), SO_TOI_DA);
        onChange(soNguyen ? Math.round(n) : lamTronSoLuong(n));
      }}
      {...khac}
    />
  );
  return nhan ? <TruongNhap nhan={nhan} id={id}>{o}</TruongNhap> : o;
}

/**
 * Danh sách chữ, mỗi dòng một mục (đơn vị tính, nhóm…). Giữ nguyên chữ đang gõ (kể cả dòng trống vừa xuống dòng),
 * chỉ chuẩn hoá lại khi rời ô.
 */
export function ODanhSach({
  nhan,
  value,
  onChange,
  goiY,
  placeholder,
}: {
  nhan: string;
  value: string[];
  onChange: (ds: string[]) => void;
  goiY?: ReactNode;
  placeholder?: string;
}) {
  const id = useId();
  const [chu, setChu] = useState(value.join('\n'));
  const [dangGo, setDangGo] = useState(false);
  useEffect(() => {
    if (!dangGo) setChu(value.join('\n'));
  }, [value, dangGo]);
  return (
    <TruongNhap nhan={nhan} id={id} goiY={goiY}>
      <textarea
        id={id}
        className="o-nhap"
        rows={Math.min(10, Math.max(3, value.length + 1))}
        value={chu}
        placeholder={placeholder}
        onFocus={() => setDangGo(true)}
        onBlur={() => setDangGo(false)}
        onChange={(e) => {
          setChu(e.target.value);
          onChange(e.target.value.split('\n').map((x) => x.trim()).filter(Boolean));
        }}
      />
    </TruongNhap>
  );
}

export function ONgay({ nhan, value, onChange }: { nhan: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <TruongNhap nhan={nhan} id={id} goiY={value ? `Ngày ${dinhDangNgay(value)}` : undefined}>
      <input id={id} type="date" className="o-nhap" value={value} onChange={(e) => onChange(e.target.value)} />
    </TruongNhap>
  );
}

/** Nhóm nút chọn một (thay cho ô chọn thả xuống — dễ bấm hơn). */
export function ChonMot<T extends string | number>({
  nhan,
  value,
  onChange,
  luaChon,
}: {
  nhan?: string;
  value: T;
  onChange: (v: T) => void;
  luaChon: { giaTri: T; nhan: string }[];
}) {
  const noiDung = (
    <div className="chon-mot" role="radiogroup" aria-label={nhan}>
      {luaChon.map((lc) => (
        <button
          key={String(lc.giaTri)}
          type="button"
          role="radio"
          aria-checked={lc.giaTri === value}
          className={lc.giaTri === value ? 'dang-chon' : ''}
          onClick={() => onChange(lc.giaTri)}
        >
          {lc.nhan}
        </button>
      ))}
    </div>
  );
  return nhan ? (
    <div className="truong">
      <span className="nhan">{nhan}</span>
      {noiDung}
    </div>
  ) : (
    noiDung
  );
}
