-- DropForeignKey
ALTER TABLE "phieu_kho" DROP CONSTRAINT "phieu_kho_nha_cung_cap_id_fkey";

-- DropForeignKey
ALTER TABLE "phieu_kho" DROP CONSTRAINT "phieu_kho_hoa_don_id_fkey";

-- DropForeignKey
ALTER TABLE "phieu_kho" DROP CONSTRAINT "phieu_kho_bao_gia_id_fkey";

-- DropForeignKey
ALTER TABLE "dong_phieu_kho" DROP CONSTRAINT "dong_phieu_kho_phieu_kho_id_fkey";

-- DropForeignKey
ALTER TABLE "dong_phieu_kho" DROP CONSTRAINT "dong_phieu_kho_vat_tu_id_fkey";

-- AlterTable
ALTER TABLE "cai_dat" DROP COLUMN "nhom_vat_tu",
DROP COLUMN "tien_to_phieu_nhap",
DROP COLUMN "tien_to_phieu_xuat";

-- DropTable
DROP TABLE "vat_tu";

-- DropTable
DROP TABLE "phieu_kho";

-- DropTable
DROP TABLE "dong_phieu_kho";

-- DropEnum
DROP TYPE "LoaiPhieuKho";
