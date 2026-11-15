-- Nghiệm thu chỉ còn một số lượng: giữ số lượng thực tế (số đang dùng để tính tiền) trước khi bỏ cột
UPDATE "dong_nghiem_thu" SET "so_luong" = "so_luong_thuc_te";

-- AlterTable
ALTER TABLE "dong_nghiem_thu" DROP COLUMN "so_luong_thuc_te";
