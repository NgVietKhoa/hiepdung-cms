/** Bỏ dấu tiếng Việt để tìm kiếm: gõ "tien truc" vẫn ra "Tiện trục". */
export function boDau(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/** Mọi từ trong câu tìm đều phải xuất hiện (không phân biệt dấu, hoa thường). */
export function khop(noiDung: string, cauTim: string): boolean {
  const tu = boDau(cauTim).split(/\s+/).filter(Boolean);
  if (!tu.length) return true;
  const nd = boDau(noiDung);
  return tu.every((t) => nd.includes(t));
}
