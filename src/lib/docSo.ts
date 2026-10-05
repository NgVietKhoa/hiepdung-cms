/**
 * Đọc số tiền thành chữ tiếng Việt.
 *
 * Quy tắc:
 *  - "mốt": hàng đơn vị là 1 khi hàng chục >= 2 (21, 31 ... nhưng 11 là "mười một").
 *  - "lăm": hàng đơn vị là 5 khi hàng chục >= 1 (15, 25 ... nhưng 105 là "linh năm").
 *  - "tư":  hàng đơn vị là 4 khi hàng chục >= 2, CHỈ khi bật tuỳ chọn `dungTu`
 *           (mặc định đọc "bốn": 2.024.350 → "... hai mươi bốn nghìn ...").
 *  - "linh": hàng chục là 0 nhưng hàng đơn vị khác 0 và phía trước có chữ số (105, 1.005).
 *  - "không trăm": nhóm 3 chữ số không phải nhóm đầu tiên mà hàng trăm bằng 0 (1.005.000).
 *  - Nhóm toàn số 0 được bỏ qua (1.000.005 → "một triệu không trăm linh năm").
 *  - Đơn vị: nghìn, triệu, tỷ; trên tỷ đọc đệ quy (1.500 tỷ → "một nghìn năm trăm tỷ").
 */

export interface TuyChonDocSo {
  /** Đọc 24, 34... là "hai mươi tư" thay vì "hai mươi bốn". */
  dungTu?: boolean;
}

const CHU_SO = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const MOT_TY = 1_000_000_000;

/** Đọc một nhóm 3 chữ số (0..999). `dauTien` = nhóm đứng đầu số, không đọc "không trăm"/"linh" thừa. */
function docBaChuSo(n: number, dauTien: boolean, tuyChon: TuyChonDocSo): string[] {
  const tram = Math.floor(n / 100);
  const chuc = Math.floor((n % 100) / 10);
  const donVi = n % 10;
  const tu: string[] = [];

  if (!dauTien || tram > 0) {
    tu.push(CHU_SO[tram], 'trăm');
  }

  const coPhiaTruoc = !dauTien || tram > 0;
  if (chuc === 0) {
    if (donVi > 0 && coPhiaTruoc) tu.push('linh');
  } else if (chuc === 1) {
    tu.push('mười');
  } else {
    tu.push(CHU_SO[chuc], 'mươi');
  }

  if (donVi > 0) {
    if (donVi === 1 && chuc >= 2) tu.push('mốt');
    else if (donVi === 5 && chuc >= 1) tu.push('lăm');
    else if (donVi === 4 && chuc >= 2 && tuyChon.dungTu) tu.push('tư');
    else tu.push(CHU_SO[donVi]);
  }
  return tu;
}

/** Đọc số 1..999.999.999. */
function docDuoiTy(n: number, dauTien: boolean, tuyChon: TuyChonDocSo): string[] {
  const nhom = [Math.floor(n / 1_000_000), Math.floor((n % 1_000_000) / 1000), n % 1000];
  const donViNhom = ['triệu', 'nghìn', ''];
  const tu: string[] = [];
  let laDau = dauTien;
  for (let i = 0; i < 3; i++) {
    if (nhom[i] === 0) continue;
    tu.push(...docBaChuSo(nhom[i], laDau, tuyChon));
    if (donViNhom[i]) tu.push(donViNhom[i]);
    laDau = false;
  }
  return tu;
}

function docSoNguyenDuong(n: number, dauTien: boolean, tuyChon: TuyChonDocSo): string[] {
  if (n >= MOT_TY) {
    const phanTy = Math.floor(n / MOT_TY);
    const phanDuoi = n % MOT_TY;
    const tu = [...docSoNguyenDuong(phanTy, dauTien, tuyChon), 'tỷ'];
    if (phanDuoi > 0) tu.push(...docDuoiTy(phanDuoi, false, tuyChon));
    return tu;
  }
  return docDuoiTy(n, dauTien, tuyChon);
}

/** Đọc số nguyên thành chữ thường, ví dụ 21 → "hai mươi mốt". */
export function docSo(so: number, tuyChon: TuyChonDocSo = {}): string {
  const n = Math.round(Math.abs(so));
  if (!Number.isFinite(n)) return '';
  if (n === 0) return 'không';
  const chu = docSoNguyenDuong(n, true, tuyChon).join(' ');
  return so < 0 ? `âm ${chu}` : chu;
}

/** Đọc số tiền: viết hoa chữ đầu, kết thúc "đồng", tròn nghìn thêm "chẵn". */
export function docTienBangChu(soTien: number, tuyChon: TuyChonDocSo = {}): string {
  const n = Math.round(soTien);
  let cau = `${docSo(n, tuyChon)} đồng`;
  if (n !== 0 && n % 1000 === 0) cau += ' chẵn';
  return cau.charAt(0).toUpperCase() + cau.slice(1);
}
