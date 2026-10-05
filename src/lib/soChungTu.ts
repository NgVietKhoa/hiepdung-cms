/**
 * Tính số chứng từ kế tiếp dạng "BG-2026-001": lấy số lớn nhất đã có trong năm rồi cộng 1.
 * Đầu mỗi năm tự quay về 001. Máy chủ gọi hàm này khi tạo chứng từ mới.
 */
export function soKeTiep(cacSoDaCo: string[], tienTo: string, nam: number, soChuSo: number): string {
  const dau = `${tienTo}-${nam}-`;
  let lonNhat = 0;
  for (const so of cacSoDaCo) {
    if (!so.startsWith(dau)) continue;
    const n = parseInt(so.slice(dau.length), 10);
    if (Number.isFinite(n) && n > lonNhat) lonNhat = n;
  }
  return dau + String(lonNhat + 1).padStart(soChuSo, '0');
}
