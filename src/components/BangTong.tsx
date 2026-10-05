import type { ChietKhau } from '../db/kieu';
import { dinhDangSoLuong, dinhDangTien } from '../lib/dinhDang';
import { docTienBangChu } from '../lib/docSo';
import type { KetQuaTinhTien } from '../lib/tinhTien';
import { ChonMot, OSo, OTien } from './ONhap';

/** Nhãn mức VAT: 0 → "Không", 5.5 → "5,5%" */
export const nhanVAT = (v: number) => (v ? `${dinhDangSoLuong(v)}%` : 'Không');

/** Nút chọn VAT từ các mức trong Cài đặt; mức đang dùng mà không còn trong danh sách vẫn được giữ để thấy và chọn lại */
export function taoLuaChonVAT(ds: number[], dangChon: number) {
  const cacMuc = ds.includes(dangChon) ? ds : [...ds, dangChon].sort((a, b) => a - b);
  return cacMuc.map((giaTri) => ({ giaTri, nhan: nhanVAT(giaTri) }));
}

/** Ô chọn chiết khấu + VAT và bảng tổng tiền, kèm dòng "Bằng chữ". */
export function BangTong({
  tong,
  chietKhau,
  tyLeVAT,
  luaChonVAT,
  onDoiChietKhau,
  onDoiVAT,
  nhanTong = 'TỔNG THANH TOÁN',
  docSoTu,
}: {
  tong: KetQuaTinhTien;
  chietKhau: ChietKhau;
  tyLeVAT: number;
  /** Các mức VAT trong Cài đặt */
  luaChonVAT: number[];
  onDoiChietKhau: (ck: ChietKhau) => void;
  onDoiVAT: (vat: number) => void;
  nhanTong?: string;
  docSoTu?: boolean;
}) {
  return (
    <div className="bang-tong">
      <ChonMot nhan="Thuế VAT" value={tyLeVAT} onChange={onDoiVAT} luaChon={taoLuaChonVAT(luaChonVAT, tyLeVAT)} />

      <div className="truong">
        <span className="nhan">Chiết khấu</span>
        <div className="hang-chiet-khau">
          <ChonMot
            value={chietKhau.kieu}
            onChange={(kieu) => onDoiChietKhau({ kieu, giaTri: 0 })}
            luaChon={[
              { giaTri: 'phanTram', nhan: 'Theo %' },
              { giaTri: 'soTien', nhan: 'Số tiền' },
            ]}
          />
          {chietKhau.kieu === 'phanTram' ? (
            <div className="o-co-don-vi">
              <OSo
                value={chietKhau.giaTri}
                onChange={(v) => onDoiChietKhau({ ...chietKhau, giaTri: Math.min(100, v) })}
                aria-label="Phần trăm chiết khấu"
              />
              <span className="don-vi">%</span>
            </div>
          ) : (
            <OTien
              value={chietKhau.giaTri}
              onChange={(v) => onDoiChietKhau({ ...chietKhau, giaTri: v })}
              aria-label="Số tiền chiết khấu"
            />
          )}
        </div>
      </div>

      <dl className="dong-tong">
        <dt>Cộng tiền hàng</dt>
        <dd>{dinhDangTien(tong.congTienHang)}</dd>
        {tong.tienChietKhau > 0 && (
          <>
            <dt>
              Chiết khấu{chietKhau.kieu === 'phanTram' ? ` (${dinhDangSoLuong(chietKhau.giaTri)}%)` : ''}
            </dt>
            <dd className="giam">−{dinhDangTien(tong.tienChietKhau)}</dd>
          </>
        )}
        {tyLeVAT > 0 && (
          <>
            <dt>Thuế VAT {dinhDangSoLuong(tyLeVAT)}%</dt>
            <dd>{dinhDangTien(tong.tienVAT)}</dd>
          </>
        )}
      </dl>
      <div className="khung-tong-cuoi">
        <div className="tong-cuoi">
          <span>{nhanTong}</span>
          <strong>{dinhDangTien(tong.tongThanhToan)}</strong>
        </div>
        <p className="bang-chu">
          Bằng chữ: <em>{docTienBangChu(tong.tongThanhToan, { dungTu: docSoTu })}</em>
        </p>
      </div>
    </div>
  );
}
