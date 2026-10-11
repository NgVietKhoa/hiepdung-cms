-- Bỏ cột "Đánh giá" (Đạt / Không đạt) của dòng nghiệm thu
ALTER TABLE "dong_nghiem_thu" DROP COLUMN "dat_khong_dat";

-- DropEnum
DROP TYPE "DanhGia";
