export interface CotThang {
  thang: string;
  /** Hoá đơn bán ra (trước thuế) */
  doanhThu: number;
  thu: number;
  chi: number;
}

export interface TongQuan {
  thang: string;
  /** Hoá đơn bán ra / mua vào trong tháng (trước thuế, không tính hoá đơn huỷ) */
  doanhThu: number;
  muaVao: number;
  thuThang: number;
  chiThang: number;
  /** Tồn quỹ hiện tại (tiền mặt + chuyển khoản) */
  tonQuy: number;
  phaiThu: number;
  phaiTra: number;
  /** Báo giá Nháp / Đã gửi (chưa chốt) */
  baoGiaCho: { so: number; tong: number };
  baoGiaChotThang: { so: number; tong: number };
  /** Chấm công hôm nay */
  chamCongHomNay: { daCham: number; tongNhanVien: number };
  /** Vật tư (đang dùng, có mức tồn tối thiểu) đã xuống dưới mức */
  vatTuSapHet: { id: string; ten: string; tonKho: number; tonToiThieu: number; donViTinh: string }[];
  /** 6 tháng gần nhất, cũ → mới */
  bieuDo: CotThang[];
}
