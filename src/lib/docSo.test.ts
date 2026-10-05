import { describe, expect, it } from 'vitest';
import { docSo, docTienBangChu } from './docSo';

describe('docTienBangChu – các trường hợp bắt buộc trong đặc tả', () => {
  const bang: [number, string][] = [
    [0, 'Không đồng'],
    [15, 'Mười lăm đồng'],
    [21, 'Hai mươi mốt đồng'],
    [105, 'Một trăm linh năm đồng'],
    [1_005_000, 'Một triệu không trăm linh năm nghìn đồng chẵn'],
    [125_000_000, 'Một trăm hai mươi lăm triệu đồng chẵn'],
    [2_024_350, 'Hai triệu không trăm hai mươi bốn nghìn ba trăm năm mươi đồng'],
    [1_000_000_000, 'Một tỷ đồng chẵn'],
  ];
  it.each(bang)('%d → %s', (so, mong) => {
    expect(docTienBangChu(so)).toBe(mong);
  });
});

describe('docSo – quy tắc chi tiết', () => {
  const bang: [number, string][] = [
    [1, 'một'],
    [5, 'năm'],
    [10, 'mười'],
    [11, 'mười một'],
    [14, 'mười bốn'],
    [20, 'hai mươi'],
    [24, 'hai mươi bốn'],
    [25, 'hai mươi lăm'],
    [31, 'ba mươi mốt'],
    [55, 'năm mươi lăm'],
    [100, 'một trăm'],
    [101, 'một trăm linh một'],
    [110, 'một trăm mười'],
    [111, 'một trăm mười một'],
    [115, 'một trăm mười lăm'],
    [121, 'một trăm hai mươi mốt'],
    [1000, 'một nghìn'],
    [1001, 'một nghìn không trăm linh một'],
    [1010, 'một nghìn không trăm mười'],
    [1015, 'một nghìn không trăm mười lăm'],
    [1005, 'một nghìn không trăm linh năm'],
    [1100, 'một nghìn một trăm'],
    [10_000, 'mười nghìn'],
    [15_000, 'mười lăm nghìn'],
    [21_000, 'hai mươi mốt nghìn'],
    [100_500, 'một trăm nghìn năm trăm'],
    [1_000_005, 'một triệu không trăm linh năm'],
    [1_250_000, 'một triệu hai trăm năm mươi nghìn'],
    [5_000_000_007, 'năm tỷ không trăm linh bảy'],
    [1_000_000_000_000, 'một nghìn tỷ'],
    [1_500_000_000_000, 'một nghìn năm trăm tỷ'],
    [2_001_000_000_000, 'hai nghìn không trăm linh một tỷ'],
    [1_000_001_000, 'một tỷ không trăm linh một nghìn'],
  ];
  it.each(bang)('%d → %s', (so, mong) => {
    expect(docSo(so)).toBe(mong);
  });

  it('tuỳ chọn đọc "tư"', () => {
    expect(docSo(24, { dungTu: true })).toBe('hai mươi tư');
    expect(docSo(34_000, { dungTu: true })).toBe('ba mươi tư nghìn');
    expect(docSo(14, { dungTu: true })).toBe('mười bốn');
    expect(docSo(104, { dungTu: true })).toBe('một trăm linh bốn');
  });

  it('làm tròn số lẻ và số âm', () => {
    expect(docTienBangChu(1499.6)).toBe('Một nghìn năm trăm đồng');
    expect(docTienBangChu(2999.7)).toBe('Ba nghìn đồng chẵn');
    expect(docSo(-21)).toBe('âm hai mươi mốt');
  });
});
