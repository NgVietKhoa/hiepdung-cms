import { useId, useMemo, useState, type ReactNode } from 'react';

/** Số gợi ý hiện tối đa — nhiều hơn thì người dùng gõ thêm chữ để lọc */
const TOI_DA = 8;

/**
 * Ô nhập có danh sách gợi ý bên dưới. Gõ không dấu vẫn tìm được.
 * Người dùng vẫn có thể gõ nội dung mới hoàn toàn (không bắt buộc chọn gợi ý).
 */
export function OGoiY<T>({
  value,
  onChange,
  goiY,
  locGoiY,
  hienThi,
  onChon,
  placeholder,
  nhan,
  hienKhiTrong = false,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  goiY: T[];
  locGoiY: (muc: T, cauTim: string) => boolean;
  hienThi: (muc: T) => { chinh: ReactNode; phu?: ReactNode; khoa: string };
  onChon: (muc: T) => void;
  placeholder?: string;
  nhan?: string;
  hienKhiTrong?: boolean;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [mo, setMo] = useState(false);
  const ketQua = useMemo(() => {
    if (!value.trim()) return hienKhiTrong ? goiY.slice(0, TOI_DA) : [];
    return goiY.filter((m) => locGoiY(m, value)).slice(0, TOI_DA);
  }, [goiY, value, locGoiY, hienKhiTrong]);

  return (
    <div className="truong o-goi-y">
      {nhan && (
        <label className="nhan" htmlFor={id}>
          {nhan}
        </label>
      )}
      <input
        id={id}
        className="o-nhap"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        autoFocus={autoFocus}
        onChange={(e) => {
          onChange(e.target.value);
          setMo(true);
        }}
        onFocus={() => setMo(true)}
        onBlur={() => setMo(false)}
      />
      {mo && ketQua.length > 0 && (
        <ul className="danh-sach-goi-y" role="listbox">
          {ketQua.map((m) => {
            const h = hienThi(m);
            return (
              <li
                key={h.khoa}
                role="option"
                aria-selected={false}
                // onMouseDown chặn mất focus trước khi kịp chọn
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChon(m);
                  setMo(false);
                }}
              >
                <div className="goi-y-chinh">{h.chinh}</div>
                {h.phu && <div className="goi-y-phu">{h.phu}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
