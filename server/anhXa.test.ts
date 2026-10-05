import { describe, expect, it } from 'vitest';
import { baoGiaVaoDB, caiDatVaoDB, dongBaoGiaVaoDB, hangMucVaoDB } from './anhXa';

describe('làm sạch dữ liệu trước khi ghi DB', () => {
  it('giới hạn VAT, chiết khấu, số ngày theo kiểu cột', () => {
    const cot = baoGiaVaoDB({ tyLeVAT: 1500, chietKhau: { kieu: 'phanTram', giaTri: 250 }, hieuLucBaoGia: -3 });
    expect(cot.tyLeVAT).toBe(100);
    expect(cot.giaTriChietKhau).toBe(100);
    expect(cot.hieuLucBaoGia).toBe(0);
    expect(baoGiaVaoDB({ chietKhau: { kieu: 'soTien', giaTri: -5 } }).giaTriChietKhau).toBe(0);
  });

  it('số lượng làm tròn 3 chữ số thập phân, không âm; tiền làm tròn đồng', () => {
    const [d] = dongBaoGiaVaoDB([{ id: 'x', tenHangMuc: 'A', soLuong: 1.23456, donGia: 1000.6 }]);
    expect(d.soLuong).toBe(1.235);
    expect(d.donGia).toBe(1001);
    expect(dongBaoGiaVaoDB([{ soLuong: -2, donGia: -10 }])[0]).toMatchObject({ soLuong: 0, donGia: 0 });
    expect(dongBaoGiaVaoDB([{ soLuong: 1e20 }])[0].soLuong).toBe(99_999_999_999.999);
  });

  it('danh sách trong cài đặt: bỏ trống, bỏ trùng; VAT xếp tăng dần trong 0–100', () => {
    const cd = caiDatVaoDB({ danhSachDonViTinh: [' cái ', '', 'cái', 'bộ'], luaChonVAT: [10, 8, 8, 0, 120, -1] });
    expect(cd.danhSachDonViTinh).toEqual(['cái', 'bộ']);
    expect(cd.luaChonVAT).toEqual([0, 8, 10, 100]);
  });

  it('hạng mục thiếu nhóm / đơn vị: để DB dùng giá trị mặc định', () => {
    expect(hangMucVaoDB({ ten: 'Tiện', nhom: '', donViTinh: ' ' })).toMatchObject({ nhom: undefined, donViTinh: undefined });
  });
});
