/**
 * Đọc bảng hạng mục từ file Excel (.xlsx), Word (.docx) hoặc PDF có chữ (không đọc được PDF scan).
 * Mỗi loại file được đưa về một bảng chữ thô (hàng × ô); sau đó tìm dòng tiêu đề theo tên cột
 * ("Tên / Hạng mục", "Quy cách", "ĐVT", "Số lượng", "Đơn giá"…) rồi đọc các hàng bên dưới thành dòng hạng mục.
 * Đọc được file do chính ứng dụng xuất ra và file của bên khác có bảng với dòng tiêu đề tương tự.
 */
import type { DongHangMuc } from '../db/kieu';
import { boDau } from '../lib/timKiem';
import { layExcel } from './xuatExcel';

type O = string | number;
type Bang = O[][];
type Truong = 'stt' | 'ten' | 'quyCach' | 'donViTinh' | 'soLuong' | 'donGia' | 'thanhTien' | 'ghiChu';
type ViTriCot = Partial<Record<Truong, number>>;

/** Từ khoá tiêu đề cột (đã bỏ dấu), xét theo thứ tự: "Đơn giá" trước "Đơn vị", "Thành tiền" trước "Tên" */
const TU_KHOA: [Truong, RegExp][] = [
  ['thanhTien', /\b(thanh tien|gia tri)\b/],
  ['donGia', /\b(don gia|gia ban)\b/],
  ['donViTinh', /\b(dvt|don vi)\b/],
  ['soLuong', /\b(so luong|khoi luong|sl|kl)\b/],
  ['stt', /^(stt|tt|so tt)$/],
  ['ghiChu', /\bghi chu\b/],
  ['quyCach', /\b(quy cach|kich thuoc|thong so|mo ta)\b/],
  ['ten', /\b(ten|hang muc|noi dung|dien giai|cong viec|hang hoa|san pham|vat tu)\b/],
];

/** Dòng tiêu đề: có cột tên và ít nhất một trong số lượng / đơn giá */
function timTieuDe(hang: O[]): ViTriCot | null {
  const cot: ViTriCot = {};
  hang.forEach((o, i) => {
    const chu = boDau(String(o)).replace(/\s+/g, ' ');
    const khop = chu && TU_KHOA.find(([truong, mau]) => cot[truong] === undefined && mau.test(chu));
    if (khop) cot[khop[0]] = i;
  });
  return cot.ten !== undefined && (cot.soLuong !== undefined || cot.donGia !== undefined) ? cot : null;
}

/**
 * Số theo cách viết Việt Nam ("1.250.000", "2,5"); vẫn đọc được "1,250,000" / "2.5" khi không lẫn với cách viết Việt Nam.
 * Không có chữ số thì trả về null.
 */
function docSo(o: O | undefined): number | null {
  if (typeof o === 'number') return o;
  const s = (o ?? '').replace(/[^\d.,-]/g, '');
  if (!/\d/.test(s)) return null;
  const cham = s.lastIndexOf('.');
  const phay = s.lastIndexOf(',');
  let chuan: string;
  if (cham >= 0 && phay >= 0) chuan = cham > phay ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.');
  else if (phay >= 0) chuan = s.indexOf(',') === phay ? s.replace(',', '.') : s.replace(/,/g, '');
  else chuan = /^-?\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s;
  const n = Number(chuan);
  return Number.isFinite(n) ? n : null;
}

/** Ô tên dạng "Tên\n- chi tiết\n(ghi chú)" (cách các bản xuất ghép) → tên, các dòng chi tiết, ghi chú */
function tachTen(tho: string): Pick<DongHangMuc, 'tenHangMuc' | 'chiTiet' | 'ghiChu'> {
  const ten: string[] = [];
  const chiTiet: string[] = [];
  let ghiChu = '';
  for (const dong of tho.split('\n').map((x) => x.trim()).filter(Boolean)) {
    const gach = dong.match(/^[-•+]\s*(.*)$/);
    const ngoac = dong.match(/^\((.*)\)$/);
    if (gach) chiTiet.push(gach[1]);
    else if (ngoac) ghiChu = ngoac[1];
    else if (chiTiet.length) chiTiet[chiTiet.length - 1] += ` ${dong}`;
    else ten.push(dong);
  }
  return { tenHangMuc: ten.join(' '), chiTiet, ghiChu };
}

const LA_MA = /^[IVXLC]+$/;
/** Hàng tổng dưới bảng: hết bảng hạng mục */
const DONG_TONG = /^(cong|tong|chiet khau|thue|bang chu)/;

interface DongTho {
  ten: string;
  quyCach: string;
  donViTinh: string;
  ghiChu: string;
  soLuong: number | null;
  donGia: number | null;
  laPhan: boolean;
}

/** Đọc các hàng dưới dòng tiêu đề. Hàng rỗng (`[]`) ngắt việc nối hàng tiếp nối vào hàng trước (sang trang PDF). */
function dongTuBang(bang: Bang): Partial<DongHangMuc>[] {
  let cot: ViTriCot | null = null;
  const tho: DongTho[] = [];
  let truoc: DongTho | null = null;
  for (const hang of bang) {
    if (!hang.length) {
      truoc = null;
      continue;
    }
    // Dòng tiêu đề (cả dòng tiêu đề lặp lại ở đầu trang sau) thì bỏ qua
    const tieuDe = timTieuDe(hang);
    if (tieuDe) {
      cot ??= tieuDe;
      truoc = null;
      continue;
    }
    if (!cot) continue;
    const vt = cot;
    const lay = (t: Truong) => (vt[t] === undefined ? '' : hang[vt[t]] ?? '');
    const chu = (t: Truong) => String(lay(t)).trim();
    const stt = chu('stt');
    const dau = String(hang.find((o) => String(o).trim()) ?? '');
    if (DONG_TONG.test(boDau(dau))) {
      if (tho.length) break;
      continue;
    }
    const soLuong = docSo(lay('soLuong'));
    const donGia = docSo(lay('donGia'));
    const dong: DongTho = {
      ten: chu('ten'),
      quyCach: chu('quyCach'),
      donViTinh: chu('donViTinh'),
      ghiChu: chu('ghiChu'),
      soLuong,
      donGia,
      laPhan: LA_MA.test(stt),
    };
    // Hàng không STT, không số: phần chữ xuống dòng của hàng trước (PDF tách mỗi dòng chữ thành một hàng)
    if (!stt && soLuong === null && donGia === null) {
      if (truoc && !truoc.laPhan) {
        truoc.ten = [truoc.ten, dong.ten].filter(Boolean).join('\n');
        truoc.quyCach = [truoc.quyCach, dong.quyCach].filter(Boolean).join(' ');
        truoc.donViTinh = [truoc.donViTinh, dong.donViTinh].filter(Boolean).join(' ');
        truoc.ghiChu = [truoc.ghiChu, dong.ghiChu].filter(Boolean).join(' ');
      }
      continue;
    }
    if (!dong.ten && !dong.laPhan && donGia === null) continue;
    tho.push(dong);
    truoc = dong;
  }

  return tho.map((d): Partial<DongHangMuc> => {
    const { tenHangMuc, chiTiet, ghiChu } = tachTen(d.ten);
    if (d.laPhan)
      return { loai: 'phan', tenHangMuc, quyCach: '', donViTinh: '', soLuong: 0, donGia: 0, ghiChu: '', chiTiet: [] };
    return {
      tenHangMuc,
      chiTiet,
      quyCach: d.quyCach,
      donViTinh: d.donViTinh,
      soLuong: d.soLuong ?? 0,
      donGia: Math.round(d.donGia ?? 0),
      ghiChu: [d.ghiChu, ghiChu].filter(Boolean).join('; '),
    };
  });
}

/* ---------- Excel ---------- */

async function bangExcel(du: ArrayBuffer): Promise<Bang[]> {
  const ExcelJS = await layExcel();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(du);
  return wb.worksheets.map((ws) => {
    const bang: Bang = [];
    ws.eachRow((row) => {
      const hang: O[] = [];
      for (let c = 1; c <= ws.columnCount; c++) {
        const o = row.getCell(c);
        const v = o.value;
        // Ô bị gộp: chỉ ô đầu mang giá trị
        if (o.isMerged && o.master.address !== o.address) hang.push('');
        else if (typeof v === 'number') hang.push(v);
        else if (v && typeof v === 'object' && 'result' in v && typeof v.result === 'number') hang.push(v.result);
        else hang.push(o.text ?? '');
      }
      bang.push(hang);
    });
    return bang;
  });
}

/* ---------- Word ---------- */

const giaiMaXml = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

/** Chữ trong một ô: mỗi đoạn (w:p) và mỗi ngắt dòng (w:br) là một dòng */
const chuTrongO = (xml: string) =>
  (xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [])
    .map((p) =>
      giaiMaXml(
        (p.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>|<w:br\b[^>]*\/>|<w:tab\/>/g) ?? [])
          .map((x) => (x.startsWith('<w:br') ? '\n' : x === '<w:tab/>' ? ' ' : x.replace(/<[^>]+>/g, '')))
          .join(''),
      ),
    )
    .join('\n');

async function bangWord(du: ArrayBuffer): Promise<Bang[]> {
  const { default: JSZip } = await import('jszip');
  const xml = await (await JSZip.loadAsync(du)).file('word/document.xml')?.async('string');
  if (!xml) throw new Error('file Word không hợp lệ');
  return (xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) ?? []).map((bang) =>
    (bang.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) ?? []).map((tr) =>
      (tr.match(/<w:tc>[\s\S]*?<\/w:tc>/g) ?? []).flatMap((tc) => {
        // Ô gộp ngang chiếm nhiều cột lưới: thêm ô trống để các cột sau không bị lệch
        const gop = Number(tc.match(/<w:gridSpan w:val="(\d+)"/)?.[1] ?? 1);
        return [chuTrongO(tc), ...Array<string>(gop - 1).fill('')];
      }),
    ),
  );
}

/* ---------- PDF ---------- */

interface Chu {
  x: number;
  y: number;
  rong: number;
  cao: number;
  chu: string;
}

/** Gom các chữ cùng dòng, đứng sát nhau thành ô (pdf.js trả về từng từ, khoảng trống giữa hai cột rộng hơn nhiều) */
function gomO(dong: Chu[]) {
  const o: { dau: number; cuoi: number; cao: number; chu: string }[] = [];
  for (const c of [...dong].sort((a, b) => a.x - b.x)) {
    const cuoi = o[o.length - 1];
    if (cuoi && c.x - cuoi.cuoi < c.cao * 0.8) {
      cuoi.chu += ` ${c.chu}`;
      cuoi.cuoi = c.x + c.rong;
    } else o.push({ dau: c.x, cuoi: c.x + c.rong, cao: c.cao, chu: c.chu });
  }
  return o;
}

async function bangPdf(du: ArrayBuffer): Promise<Bang[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (typeof document !== 'undefined') {
    const { default: duongDanWorker } = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = duongDanWorker;
  }
  const taiLieu = await pdfjs.getDocument({ data: new Uint8Array(du) }).promise;
  // Các dòng chữ của mọi trang, hàng rỗng đánh dấu chỗ ngắt (sang trang, khoảng trống lớn)
  const cacDong: Chu[][] = [];
  for (let so = 1; so <= taiLieu.numPages; so++) {
    const { items } = await (await taiLieu.getPage(so)).getTextContent();
    const chu = items
      .flatMap((it) => ('str' in it && it.str.trim() ? [{ x: it.transform[4], y: it.transform[5], rong: it.width, cao: it.height, chu: it.str.trim() }] : []))
      .sort((a, b) => b.y - a.y || a.x - b.x);
    cacDong.push([]);
    let yTruoc: number | null = null;
    for (const c of chu) {
      const dong = cacDong[cacDong.length - 1];
      if (dong.length && Math.abs(dong[0].y - c.y) < c.cao * 0.5) {
        dong.push(c);
        continue;
      }
      if (yTruoc !== null && yTruoc - c.y > c.cao * 3) cacDong.push([]);
      cacDong.push([c]);
      yTruoc = c.y;
    }
  }
  void taiLieu.destroy();

  // Ranh giới cột: giữa khoảng trống của hai ô tiêu đề kề nhau. Chữ trong bảng xét theo mép trái lùi vào nửa cỡ chữ:
  // chữ canh trái nằm sát mép trái cột (tiêu đề canh giữa có thể nằm lệch vào trong), số canh phải không tràn sang cột trước.
  const tieuDe = cacDong.map(gomO).find((o) => timTieuDe(o.map((x) => x.chu)));
  if (!tieuDe) return [];
  const ranhGioi = tieuDe.slice(1).map((o, i) => (tieuDe[i].cuoi + o.dau) / 2);
  return [
    cacDong.map((dong) => {
      const hang: string[] = Array<string>(tieuDe.length).fill('');
      for (const o of gomO(dong)) {
        const i = ranhGioi.filter((r) => r < o.dau + o.cao / 2).length;
        hang[i] = hang[i] ? `${hang[i]} ${o.chu}` : o.chu;
      }
      return dong.length ? hang : [];
    }),
  ];
}

/** Đọc các dòng hạng mục trong file; không tìm thấy bảng hạng mục thì trả về mảng rỗng */
export async function docHangMucTuFile(tep: File): Promise<Partial<DongHangMuc>[]> {
  const duoi = tep.name.toLowerCase().split('.').pop();
  const cachDoc: Record<string, (du: ArrayBuffer) => Promise<Bang[]>> = { xlsx: bangExcel, docx: bangWord, pdf: bangPdf };
  const docBang = cachDoc[duoi ?? ''];
  if (!docBang) throw new Error('chỉ đọc được file .xlsx, .docx hoặc .pdf');
  for (const bang of await docBang(await tep.arrayBuffer())) {
    const dong = dongTuBang(bang);
    if (dong.length) return dong;
  }
  return [];
}
