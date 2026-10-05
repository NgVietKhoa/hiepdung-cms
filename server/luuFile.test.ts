import { describe, expect, it } from 'vitest';
import { tenFileAnToan } from './luuFile';

describe('tên file lưu', () => {
  it('giữ nguyên tên hợp lệ', () => {
    expect(tenFileAnToan('BaoGia_BG-2026-001_HoangLong.pdf')).toBe('BaoGia_BG-2026-001_HoangLong.pdf');
    expect(tenFileAnToan('NghiemThu_NT-2026-001_X.docx')).toBe('NghiemThu_NT-2026-001_X.docx');
  });

  it('bỏ đường dẫn, không cho ghi ra ngoài thư mục', () => {
    expect(tenFileAnToan('../../server/index.xlsx')).toBe('index.xlsx');
    expect(tenFileAnToan('C:\\Windows\\a.pdf')).toBe('a.pdf');
  });

  it('thay ký tự không hợp lệ trên Windows', () => {
    expect(tenFileAnToan('BaoGia_BG:01*?.pdf')).toBe('BaoGia_BG_01__.pdf');
  });

  it('từ chối đuôi khác pdf / docx / xlsx và tên rỗng', () => {
    expect(() => tenFileAnToan('a.exe')).toThrow();
    expect(() => tenFileAnToan('a.pdf.js')).toThrow();
    expect(() => tenFileAnToan('')).toThrow();
    expect(() => tenFileAnToan('.pdf')).toThrow();
  });
});
