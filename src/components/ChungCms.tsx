/** Thành phần dùng chung cho các module CMS: chọn tháng, ô số liệu, ô chọn. */
import { useId, type ReactNode } from 'react';
import { congThang, laThang, tenThang } from '../lib/thang';
import { BieuTuong, type TenBieuTuong } from './BieuTuong';
import { TruongNhap } from './ONhap';

/** Chọn tháng: ‹ Tháng 10/2026 › — bấm giữa để chọn tháng bất kỳ */
export function ChonThang({ value, onChange }: { value: string; onChange: (thang: string) => void }) {
  return (
    <div className="chon-thang" role="group" aria-label="Chọn tháng">
      <button type="button" className="nut-bieu-tuong" onClick={() => onChange(congThang(value, -1))} aria-label="Tháng trước">
        <BieuTuong ten="quayLai" />
      </button>
      <label className="chon-thang-giua">
        <span>{tenThang(value)}</span>
        <input type="month" value={value} onChange={(e) => laThang(e.target.value) && onChange(e.target.value)} aria-label="Chọn tháng" />
      </label>
      <button type="button" className="nut-bieu-tuong" onClick={() => onChange(congThang(value, 1))} aria-label="Tháng sau">
        <BieuTuong ten="muiTenPhai" />
      </button>
    </div>
  );
}

/** Ô số liệu: nhãn, giá trị lớn, dòng phụ */
export function OSoLieu({
  nhan,
  giaTri,
  phu,
  bieuTuong,
  loai,
  den,
  onClick,
}: {
  nhan: string;
  giaTri: ReactNode;
  phu?: ReactNode;
  bieuTuong?: TenBieuTuong;
  /** Tô màu: tot = xanh, xau = đỏ */
  loai?: 'tot' | 'xau';
  den?: string;
  onClick?: () => void;
}) {
  const noiDung = (
    <>
      <span className="osl-dau">
        {bieuTuong && <BieuTuong ten={bieuTuong} co={18} />}
        {nhan}
      </span>
      <span className="osl-so">{giaTri}</span>
      {phu && <span className="osl-phu">{phu}</span>}
    </>
  );
  const lop = `o-so-lieu ${loai ?? ''}`;
  if (den) {
    return (
      <a className={lop} href={`#${den}`}>
        {noiDung}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={lop} onClick={onClick}>
        {noiDung}
      </button>
    );
  }
  return <div className={lop}>{noiDung}</div>;
}

/** Ô chọn thả xuống (danh sách dài: khách hàng, nhà cung cấp, nhân viên…) */
export function OChon<T extends string>({
  nhan,
  value,
  onChange,
  luaChon,
  trong,
  goiY,
}: {
  nhan: string;
  value: T;
  onChange: (v: T) => void;
  luaChon: { giaTri: T; nhan: string }[];
  /** Có = thêm lựa chọn rỗng ở đầu với nhãn này */
  trong?: string;
  goiY?: ReactNode;
}) {
  const id = useId();
  return (
    <TruongNhap nhan={nhan} id={id} goiY={goiY}>
      <select id={id} className="o-nhap" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {trong !== undefined && <option value="">{trong}</option>}
        {luaChon.map((l) => (
          <option key={l.giaTri} value={l.giaTri}>
            {l.nhan}
          </option>
        ))}
      </select>
    </TruongNhap>
  );
}

/** Bảng dữ liệu cuộn ngang trên điện thoại */
export function BangCuon({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bang-cuon ${className}`}>
      <table className="bang-du-lieu">{children}</table>
    </div>
  );
}

/** Kích thước file dễ đọc: 1,2 MB */
export function dinhDangKichThuoc(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${Math.round(byte / 1024)} KB`;
  return `${(byte / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}
