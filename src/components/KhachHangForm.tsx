import { useCallback, useState } from 'react';
import { api } from '../db/api';
import { useTruyVan } from '../db/hooks';
import type { KhachHang } from '../db/kieu';
import { khachHangTrong } from '../lib/nghiepVu';
import { khop } from '../lib/timKiem';
import { BieuTuong } from './BieuTuong';
import { HopThoai, useGiaoTiep } from './HopThoai';
import { OChu } from './ONhap';
import { OGoiY } from './OGoiY';

/** Hộp thoại thêm / sửa khách hàng. */
export function HopThoaiKhachHang({
  khachHang,
  tenBanDau = '',
  onDong,
  onDaLuu,
  coNutXoa,
}: {
  /** Có = sửa khách đã có; không có = thêm mới */
  khachHang?: KhachHang;
  tenBanDau?: string;
  onDong: () => void;
  onDaLuu?: (kh: KhachHang) => void;
  coNutXoa?: boolean;
}) {
  const { xacNhan, thongBao } = useGiaoTiep();
  const [kh, setKh] = useState<KhachHang>(() => khachHang ?? { ...khachHangTrong(), tenCongTy: tenBanDau });
  const doi = (truong: keyof KhachHang) => (v: string) => setKh((k) => ({ ...k, [truong]: v }));

  const luu = async () => {
    if (!kh.tenCongTy.trim()) {
      thongBao('Vui lòng nhập tên khách hàng', 'loi');
      return;
    }
    const daLuu = { ...kh, tenCongTy: kh.tenCongTy.trim() };
    try {
      await api.khachHang.luu(daLuu);
    } catch (e) {
      thongBao((e as Error).message, 'loi');
      return;
    }
    thongBao(khachHang ? 'Đã lưu thay đổi' : 'Đã thêm khách hàng');
    onDaLuu?.(daLuu);
    onDong();
  };

  const xoa = async () => {
    const soBaoGia = await api.khachHang.soBaoGia(kh.id);
    const canhBao = soBaoGia ? `\n\nKhách này đang có ${soBaoGia} báo giá — các báo giá đó sẽ không còn thông tin khách.` : '';
    if (!(await xacNhan(`Xoá khách hàng "${kh.tenCongTy}"?${canhBao}`, { nutDongY: 'Xoá' }))) return;
    await api.khachHang.xoa(kh.id);
    thongBao('Đã xoá khách hàng');
    onDong();
  };

  return (
    <HopThoai
      tieuDe={khachHang ? 'Sửa khách hàng' : 'Thêm khách hàng mới'}
      onDong={onDong}
      chanTrang={
        <div className="hang-nut">
          {coNutXoa && khachHang && (
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
      <OChu nhan="Tên công ty / khách hàng *" value={kh.tenCongTy} onChange={doi('tenCongTy')} autoFocus={!khachHang} />
      <OChu nhan="Người liên hệ" value={kh.nguoiLienHe} onChange={doi('nguoiLienHe')} />
      <OChu nhan="Chức vụ" value={kh.chucVu} onChange={doi('chucVu')} />
      <OChu nhan="Số điện thoại" value={kh.soDienThoai} onChange={doi('soDienThoai')} inputMode="tel" type="tel" />
      <OChu nhan="Địa chỉ" value={kh.diaChi} onChange={doi('diaChi')} nhieuDong />
      <OChu nhan="Mã số thuế" value={kh.maSoThue} onChange={doi('maSoThue')} inputMode="numeric" />
      <OChu nhan="Email" value={kh.email} onChange={doi('email')} type="email" inputMode="email" />
      <OChu nhan="Ghi chú" value={kh.ghiChu} onChange={doi('ghiChu')} nhieuDong />
    </HopThoai>
  );
}

const locKhach = (k: KhachHang, cauTim: string) =>
  khop(`${k.tenCongTy} ${k.nguoiLienHe} ${k.soDienThoai}`, cauTim);

/** Chọn khách hàng bằng ô tìm kiếm gợi ý, hoặc thêm khách mới ngay tại chỗ. */
export function ChonKhachHang({
  khachHangId,
  onChon,
  nhan = 'Khách hàng',
}: {
  khachHangId: string | null;
  onChon: (kh: KhachHang | null) => void;
  nhan?: string;
}) {
  const dsKhach = useTruyVan(() => api.khachHang.ds(), []) ?? [];
  const daChon = dsKhach.find((k) => k.id === khachHangId);
  const [cauTim, setCauTim] = useState('');
  const [moForm, setMoForm] = useState<'them' | 'sua' | null>(null);
  const hienThi = useCallback(
    (k: KhachHang) => ({ khoa: k.id, chinh: k.tenCongTy, phu: [k.nguoiLienHe, k.soDienThoai].filter(Boolean).join(' – ') }),
    [],
  );

  return (
    <div className="chon-khach">
      {daChon ? (
        <div className="the-khach-da-chon">
          <div className="nhan">{nhan}</div>
          <div className="ten-khach">{daChon.tenCongTy}</div>
          {(daChon.nguoiLienHe || daChon.soDienThoai) && (
            <div className="phu">{[daChon.nguoiLienHe, daChon.chucVu, daChon.soDienThoai].filter(Boolean).join(' – ')}</div>
          )}
          {daChon.diaChi && <div className="phu">{daChon.diaChi}</div>}
          <div className="hang-nut nho">
            <button type="button" className="nut nut-phu" onClick={() => setMoForm('sua')}>
              <BieuTuong ten="sua" /> Sửa thông tin
            </button>
            <button type="button" className="nut nut-phu" onClick={() => onChon(null)}>
              Đổi khách khác
            </button>
          </div>
        </div>
      ) : (
        <>
          <OGoiY
            nhan={nhan}
            value={cauTim}
            onChange={setCauTim}
            goiY={dsKhach}
            locGoiY={locKhach}
            hienThi={hienThi}
            hienKhiTrong
            onChon={(k) => {
              onChon(k);
              setCauTim('');
            }}
            placeholder="Gõ tên khách để tìm…"
          />
          <button type="button" className="nut nut-vien nut-rong" onClick={() => setMoForm('them')}>
            <BieuTuong ten="them" /> Thêm khách mới
          </button>
        </>
      )}
      {moForm && (
        <HopThoaiKhachHang
          khachHang={moForm === 'sua' ? daChon : undefined}
          tenBanDau={cauTim}
          onDong={() => setMoForm(null)}
          onDaLuu={(k) => {
            onChon(k);
            setCauTim('');
          }}
        />
      )}
    </div>
  );
}
