-- DropForeignKey
ALTER TABLE "nguoi_dung" DROP CONSTRAINT "nguoi_dung_vai_tro_id_fkey";

-- DropForeignKey
ALTER TABLE "nguoi_dung" DROP CONSTRAINT "nguoi_dung_nhan_vien_id_fkey";

-- DropTable
DROP TABLE "vai_tro";

-- DropTable
DROP TABLE "nguoi_dung";

