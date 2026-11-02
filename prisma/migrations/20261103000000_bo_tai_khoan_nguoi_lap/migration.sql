-- DropForeignKey
ALTER TABLE "nguoi_dung" DROP CONSTRAINT "nguoi_dung_vai_tro_id_fkey";

-- DropForeignKey
ALTER TABLE "nguoi_dung" DROP CONSTRAINT "nguoi_dung_nhan_vien_id_fkey";

-- AlterTable
ALTER TABLE "phieu_thu_chi" DROP COLUMN "nguoi_lap";

-- AlterTable
ALTER TABLE "phieu_kho" DROP COLUMN "nguoi_lap";

-- DropTable
DROP TABLE "vai_tro";

-- DropTable
DROP TABLE "nguoi_dung";

