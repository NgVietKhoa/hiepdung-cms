import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BieuTuong, type TenBieuTuong } from '../components/BieuTuong';
import { HopThoai, useGiaoTiep } from '../components/HopThoai';
import { TrangSoan } from '../components/KhungTrang';
import { XemTruocPdf } from '../components/XemTruocPdf';
import { api } from '../db/api';
import { mauBaoGia } from '../pdf/mauBaoGia';
import { mauNghiemThu } from '../pdf/mauNghiemThu';
import { chiaSeFile, coTheChiaSeFile, inPdf, taiFile, taoPdf, tenKhachChoFile } from '../pdf/xuat';
import { excelBaoGia, excelNghiemThu } from '../pdf/xuatExcel';
import { wordBaoGia, wordNghiemThu } from '../pdf/xuatWord';

interface VanBan {
  blob: Blob;
  /** Tên file không có đuôi, vd. "BaoGia_BG-2026-001_HoangLong" */
  tenGoc: string;
  tieuDe: string;
  taoWord: () => Promise<Blob>;
  taoExcel: () => Promise<Blob>;
}

async function taoVanBan(loai: string, id: string): Promise<VanBan> {
  const cd = await api.caiDat.lay();
  if (loai === 'bao-gia') {
    const bg = await api.baoGia.lay(id);
    if (!bg) throw new Error('Không tìm thấy báo giá');
    const kh = (await api.khachHang.ds()).find((k) => k.id === bg.khachHangId);
    return {
      blob: await taoPdf(mauBaoGia(bg, kh, cd)),
      tenGoc: `BaoGia_${bg.soBaoGia}_${tenKhachChoFile(kh?.tenCongTy ?? '')}`,
      tieuDe: `Báo giá ${bg.soBaoGia}`,
      taoWord: () => wordBaoGia(bg, kh, cd),
      taoExcel: () => excelBaoGia(bg, kh, cd),
    };
  }
  const nt = await api.nghiemThu.lay(id);
  if (!nt) throw new Error('Không tìm thấy biên bản');
  const [dsKhach, bg, anh] = await Promise.all([
    api.khachHang.ds(),
    nt.baoGiaId ? api.baoGia.lay(nt.baoGiaId) : null,
    api.anh.ds(id),
  ]);
  const kh = dsKhach.find((k) => k.id === nt.khachHangId);
  return {
    blob: await taoPdf(mauNghiemThu(nt, kh, bg ?? undefined, anh, cd)),
    tenGoc: `NghiemThu_${nt.soBienBan}_${tenKhachChoFile(kh?.tenCongTy ?? '')}`,
    tieuDe: `Biên bản nghiệm thu ${nt.soBienBan}`,
    taoWord: () => wordNghiemThu(nt, kh, bg ?? undefined, anh, cd),
    taoExcel: () => excelNghiemThu(nt, kh, bg ?? undefined, cd),
  };
}

type DinhDang = 'pdf' | 'word' | 'excel';
const DINH_DANG: { loai: DinhDang; nhan: string; duoi: string; bieuTuong: TenBieuTuong; moTa: string }[] = [
  { loai: 'pdf', nhan: 'PDF', duoi: 'pdf', bieuTuong: 'tai', moTa: 'Bản in, gửi khách' },
  { loai: 'word', nhan: 'Word', duoi: 'docx', bieuTuong: 'vanBan', moTa: 'Sửa lại câu chữ, bố cục' },
  { loai: 'excel', nhan: 'Excel', duoi: 'xlsx', bieuTuong: 'bang', moTa: 'Bảng tính, có sẵn công thức' },
];

export function XemTruoc() {
  const { loai = '', id = '' } = useParams();
  const { thongBao } = useGiaoTiep();
  const [vb, setVb] = useState<VanBan>();
  const [loi, setLoi] = useState('');
  const [dangTao, setDangTao] = useState<DinhDang | null>(null);
  const [moTaiVe, setMoTaiVe] = useState(false);
  const chiaSeDuoc = coTheChiaSeFile();

  useEffect(() => {
    let huy = false;
    taoVanBan(loai, id)
      .then((v) => !huy && setVb(v))
      .catch((e) => !huy && setLoi((e as Error).message || 'Không tạo được văn bản'));
    return () => {
      huy = true;
    };
  }, [loai, id]);

  /** Lưu vào thư mục trên máy chạy ứng dụng (THU_MUC_LUU_FILE); máy chủ lỗi thì tải bằng trình duyệt cho khỏi mất file */
  const luu = async (dd: DinhDang) => {
    if (!vb || dangTao) return;
    const { duoi, nhan } = DINH_DANG.find((x) => x.loai === dd)!;
    const tenFile = `${vb.tenGoc}.${duoi}`;
    setDangTao(dd);
    let blob: Blob | undefined;
    try {
      blob = dd === 'pdf' ? vb.blob : dd === 'word' ? await vb.taoWord() : await vb.taoExcel();
      const kq = await api.file.luu(tenFile, blob);
      thongBao(`Đã lưu ${kq.tenFile} vào ${kq.thuMuc}`);
    } catch (e) {
      console.error(e);
      if (blob) {
        taiFile(blob, tenFile);
        thongBao(`Không lưu được vào thư mục (${(e as Error).message}) — đã tải về máy này`, 'loi');
      } else {
        thongBao(`Không tạo được file ${nhan}`, 'loi');
      }
    } finally {
      setDangTao(null);
      setMoTaiVe(false);
    }
  };

  const nutTai = (x: (typeof DINH_DANG)[number]) => (
    <button key={x.loai} type="button" className="nut nut-vien chi-may-tinh" disabled={!!dangTao} onClick={() => luu(x.loai)}>
      <BieuTuong ten={x.bieuTuong} /> {dangTao === x.loai ? 'Đang lưu…' : `Lưu ${x.nhan}`}
    </button>
  );

  return (
    <TrangSoan
      tieuDe={vb?.tieuDe ?? 'Xem trước bản in'}
      phuDe={vb && 'Kiểm tra lại rồi gửi Zalo, in, hoặc lưu PDF / Word / Excel'}
      quayVe={-1}
      thanhDuoi={
        vb && (
          <div className="thanh-xuat">
            {chiaSeDuoc && (
              <button
                type="button"
                className="nut nut-chinh"
                onClick={async () => {
                  try {
                    await chiaSeFile(vb.blob, `${vb.tenGoc}.pdf`, vb.tieuDe);
                  } catch {
                    thongBao('Không chia sẻ được, hãy dùng "Lưu file"', 'loi');
                  }
                }}
              >
                <BieuTuong ten="chiaSe" /> Gửi Zalo
              </button>
            )}
            <button type="button" className={`nut ${chiaSeDuoc ? 'nut-vien' : 'nut-chinh'}`} onClick={() => inPdf(vb.blob)}>
              <BieuTuong ten="in" /> In
            </button>
            {/* Máy tính: đủ nút từng định dạng; điện thoại: gom vào nút "Lưu file" cho đỡ chật */}
            {DINH_DANG.map(nutTai)}
            <button type="button" className="nut nut-vien chi-dien-thoai" onClick={() => setMoTaiVe(true)}>
              <BieuTuong ten="luu" /> Lưu file
            </button>
          </div>
        )
      }
    >
      <div className="khung-pdf">
        {loi && <p className="trong">{loi}</p>}
        {!vb && !loi && <p className="dang-tai">Đang tạo văn bản…</p>}
        {vb && (
          <>
            <p className="ten-file">
              <BieuTuong ten="vanBan" /> {vb.tenGoc}.pdf
            </p>
            <XemTruocPdf blob={vb.blob} />
          </>
        )}
      </div>

      {moTaiVe && (
        <HopThoai tieuDe="Lưu file dạng" onDong={() => setMoTaiVe(false)}>
          <div className="ds-lua-chon-tao">
            {DINH_DANG.map((x) => (
              <button key={x.loai} type="button" className="lua-chon-tao" disabled={!!dangTao} onClick={() => luu(x.loai)}>
                <span className="o-bieu-tuong">
                  <BieuTuong ten={x.bieuTuong} co={26} />
                </span>
                <span>
                  <strong>{dangTao === x.loai ? 'Đang lưu…' : `${x.nhan} (.${x.duoi})`}</strong>
                  <small>{x.moTa}</small>
                </span>
              </button>
            ))}
          </div>
        </HopThoai>
      )}
    </TrangSoan>
  );
}
