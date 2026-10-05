-- CreateEnum
CREATE TYPE "TrangThaiBaoGia" AS ENUM ('nhap', 'daGui', 'daChot', 'huy');

-- CreateEnum
CREATE TYPE "TrangThaiNghiemThu" AS ENUM ('nhap', 'daKy', 'huy');

-- CreateEnum
CREATE TYPE "KieuChietKhau" AS ENUM ('phanTram', 'soTien');

-- CreateEnum
CREATE TYPE "DanhGia" AS ENUM ('dat', 'khongDat');

-- CreateEnum
CREATE TYPE "LoaiDong" AS ENUM ('hang', 'phan');

-- CreateEnum
CREATE TYPE "LoaiHoaDon" AS ENUM ('muaVao', 'banRa');

-- CreateEnum
CREATE TYPE "TrangThaiHoaDon" AS ENUM ('hieuLuc', 'huy');

-- CreateEnum
CREATE TYPE "LoaiPhieuThuChi" AS ENUM ('thu', 'chi');

-- CreateEnum
CREATE TYPE "HinhThucTien" AS ENUM ('tienMat', 'chuyenKhoan');

-- CreateEnum
CREATE TYPE "LoaiPhieuKho" AS ENUM ('nhap', 'xuat');

-- CreateEnum
CREATE TYPE "TruongDong" AS ENUM ('tenHangMuc', 'quyCach', 'donViTinh', 'soLuong', 'donGia', 'thanhTien');

-- CreateEnum
CREATE TYPE "KieuCot" AS ENUM ('chu', 'so');

-- CreateTable
CREATE TABLE "khach_hang" (
    "id" TEXT NOT NULL,
    "ten_cong_ty" TEXT NOT NULL,
    "dia_chi" TEXT NOT NULL DEFAULT '',
    "ma_so_thue" TEXT NOT NULL DEFAULT '',
    "nguoi_lien_he" TEXT NOT NULL DEFAULT '',
    "chuc_vu" TEXT NOT NULL DEFAULT '',
    "so_dien_thoai" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "ghi_chu" TEXT NOT NULL DEFAULT '',
    "ngay_tao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "khach_hang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hang_muc" (
    "id" TEXT NOT NULL,
    "ten" TEXT NOT NULL,
    "don_vi_tinh" TEXT NOT NULL DEFAULT 'cái',
    "don_gia_mac_dinh" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "nhom" TEXT NOT NULL DEFAULT 'Khác',
    "mo_ta" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "hang_muc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bao_gia" (
    "id" TEXT NOT NULL,
    "so_bao_gia" TEXT NOT NULL,
    "ngay_lap" DATE NOT NULL,
    "khach_hang_id" TEXT,
    "tieu_de" TEXT NOT NULL DEFAULT '',
    "ty_le_vat" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "kieu_chiet_khau" "KieuChietKhau" NOT NULL DEFAULT 'phanTram',
    "gia_tri_chiet_khau" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "thoi_gian_giao_hang" TEXT NOT NULL DEFAULT '',
    "hieu_luc_bao_gia" INTEGER NOT NULL DEFAULT 15,
    "dieu_khoan_thanh_toan" TEXT NOT NULL DEFAULT '',
    "ghi_chu" TEXT NOT NULL DEFAULT '',
    "trang_thai" "TrangThaiBaoGia" NOT NULL DEFAULT 'nhap',
    "ngay_tao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_sua" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bao_gia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dong_bao_gia" (
    "id" TEXT NOT NULL,
    "bao_gia_id" TEXT NOT NULL,
    "stt" INTEGER NOT NULL,
    "loai" "LoaiDong" NOT NULL DEFAULT 'hang',
    "ten_hang_muc" TEXT NOT NULL DEFAULT '',
    "chi_tiet" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quy_cach" TEXT NOT NULL DEFAULT '',
    "don_vi_tinh" TEXT NOT NULL DEFAULT '',
    "so_luong" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "don_gia" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "ghi_chu" TEXT NOT NULL DEFAULT '',
    "cot_them" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "dong_bao_gia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nghiem_thu" (
    "id" TEXT NOT NULL,
    "so_bien_ban" TEXT NOT NULL,
    "bao_gia_id" TEXT,
    "khach_hang_id" TEXT,
    "ngay_nghiem_thu" DATE NOT NULL,
    "dia_diem" TEXT NOT NULL DEFAULT '',
    "can_cu_hop_dong" TEXT NOT NULL DEFAULT '',
    "ngay_can_cu" DATE,
    "tieu_de" TEXT NOT NULL DEFAULT '',
    "thanh_phan_ben_a" JSONB NOT NULL DEFAULT '[]',
    "thanh_phan_ben_b" JSONB NOT NULL DEFAULT '[]',
    "ty_le_vat" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "kieu_chiet_khau" "KieuChietKhau" NOT NULL DEFAULT 'phanTram',
    "gia_tri_chiet_khau" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ket_luan" TEXT NOT NULL DEFAULT '',
    "trang_thai" "TrangThaiNghiemThu" NOT NULL DEFAULT 'nhap',
    "ngay_tao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_sua" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nghiem_thu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dong_nghiem_thu" (
    "id" TEXT NOT NULL,
    "nghiem_thu_id" TEXT NOT NULL,
    "stt" INTEGER NOT NULL,
    "loai" "LoaiDong" NOT NULL DEFAULT 'hang',
    "ten_hang_muc" TEXT NOT NULL DEFAULT '',
    "chi_tiet" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quy_cach" TEXT NOT NULL DEFAULT '',
    "don_vi_tinh" TEXT NOT NULL DEFAULT '',
    "so_luong" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "so_luong_thuc_te" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "don_gia" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "dat_khong_dat" "DanhGia" NOT NULL DEFAULT 'dat',
    "ghi_chu" TEXT NOT NULL DEFAULT '',
    "cot_them" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "dong_nghiem_thu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anh_nghiem_thu" (
    "id" TEXT NOT NULL,
    "nghiem_thu_id" TEXT NOT NULL,
    "du_lieu" TEXT NOT NULL,
    "ghi_chu" TEXT NOT NULL DEFAULT '',
    "thu_tu" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "anh_nghiem_thu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cai_dat" (
    "id" TEXT NOT NULL DEFAULT 'caiDat',
    "ten_don_vi" TEXT NOT NULL,
    "dia_chi" TEXT NOT NULL DEFAULT '',
    "ma_so_thue" TEXT NOT NULL DEFAULT '',
    "dien_thoai" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "so_tai_khoan" TEXT NOT NULL DEFAULT '',
    "ngan_hang" TEXT NOT NULL DEFAULT '',
    "chi_nhanh" TEXT NOT NULL DEFAULT '',
    "chu_tai_khoan" TEXT NOT NULL DEFAULT '',
    "nguoi_dai_dien" TEXT NOT NULL DEFAULT '',
    "chuc_vu" TEXT NOT NULL DEFAULT '',
    "logo" TEXT NOT NULL DEFAULT '',
    "vat_mac_dinh" DECIMAL(5,2) NOT NULL DEFAULT 8,
    "hieu_luc_mac_dinh" INTEGER NOT NULL DEFAULT 15,
    "thoi_gian_giao_hang_mac_dinh" TEXT NOT NULL DEFAULT '',
    "dieu_khoan_thanh_toan_mac_dinh" TEXT NOT NULL DEFAULT '',
    "ket_luan_mac_dinh" TEXT NOT NULL DEFAULT '',
    "dia_diem_nghiem_thu_mac_dinh" TEXT NOT NULL DEFAULT '',
    "tien_to_bao_gia" TEXT NOT NULL DEFAULT 'BG',
    "tien_to_nghiem_thu" TEXT NOT NULL DEFAULT 'NT',
    "so_chu_so" INTEGER NOT NULL DEFAULT 3,
    "doc_so_tu" BOOLEAN NOT NULL DEFAULT false,
    "truong_an" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "danh_sach_don_vi_tinh" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nhom_hang_muc" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lua_chon_vat" DECIMAL(5,2)[] DEFAULT ARRAY[]::DECIMAL(5,2)[],
    "lan_sao_luu_cuoi" TIMESTAMP(3),
    "tien_to_phieu_thu" TEXT NOT NULL DEFAULT 'PT',
    "tien_to_phieu_chi" TEXT NOT NULL DEFAULT 'PC',
    "tien_to_phieu_nhap" TEXT NOT NULL DEFAULT 'PN',
    "tien_to_phieu_xuat" TEXT NOT NULL DEFAULT 'PX',
    "danh_muc_thu" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "danh_muc_chi" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nhom_vat_tu" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ngay_nghi_tuan" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "cai_dat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vai_tro" (
    "id" TEXT NOT NULL,
    "ten" TEXT NOT NULL,
    "mo_ta" TEXT NOT NULL DEFAULT '',
    "quyen" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "he_thong" BOOLEAN NOT NULL DEFAULT false,
    "thu_tu" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "vai_tro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nguoi_dung" (
    "id" TEXT NOT NULL,
    "ten_dang_nhap" TEXT NOT NULL,
    "ho_ten" TEXT NOT NULL,
    "mat_khau_bam" TEXT NOT NULL,
    "vai_tro_id" TEXT NOT NULL,
    "nhan_vien_id" TEXT,
    "khoa" BOOLEAN NOT NULL DEFAULT false,
    "phien_ban" INTEGER NOT NULL DEFAULT 0,
    "lan_dang_nhap_cuoi" TIMESTAMP(3),
    "ngay_tao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nguoi_dung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nhan_vien" (
    "id" TEXT NOT NULL,
    "ma_nhan_vien" TEXT NOT NULL DEFAULT '',
    "ho_ten" TEXT NOT NULL,
    "chuc_vu" TEXT NOT NULL DEFAULT '',
    "so_dien_thoai" TEXT NOT NULL DEFAULT '',
    "cccd" TEXT NOT NULL DEFAULT '',
    "dia_chi" TEXT NOT NULL DEFAULT '',
    "ngay_vao_lam" DATE,
    "luong_ngay" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "luong_gio_tang_ca" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "phu_cap_thang" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "so_tai_khoan" TEXT NOT NULL DEFAULT '',
    "ngan_hang" TEXT NOT NULL DEFAULT '',
    "dang_lam" BOOLEAN NOT NULL DEFAULT true,
    "ghi_chu" TEXT NOT NULL DEFAULT '',
    "thu_tu" INTEGER NOT NULL DEFAULT 0,
    "ngay_tao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nhan_vien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loai_cong" (
    "id" TEXT NOT NULL,
    "ky_hieu" TEXT NOT NULL,
    "ten" TEXT NOT NULL,
    "he_so" DECIMAL(4,2) NOT NULL DEFAULT 1,
    "mau" TEXT NOT NULL DEFAULT '',
    "thu_tu" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "loai_cong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cham_cong" (
    "id" TEXT NOT NULL,
    "nhan_vien_id" TEXT NOT NULL,
    "ngay" DATE NOT NULL,
    "loai_cong_id" TEXT,
    "gio_tang_ca" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ghi_chu" TEXT NOT NULL DEFAULT '',
    "ngay_sua" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cham_cong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nha_cung_cap" (
    "id" TEXT NOT NULL,
    "ten_cong_ty" TEXT NOT NULL,
    "dia_chi" TEXT NOT NULL DEFAULT '',
    "ma_so_thue" TEXT NOT NULL DEFAULT '',
    "nguoi_lien_he" TEXT NOT NULL DEFAULT '',
    "so_dien_thoai" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "so_tai_khoan" TEXT NOT NULL DEFAULT '',
    "ngan_hang" TEXT NOT NULL DEFAULT '',
    "ghi_chu" TEXT NOT NULL DEFAULT '',
    "ngay_tao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nha_cung_cap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hoa_don" (
    "id" TEXT NOT NULL,
    "loai" "LoaiHoaDon" NOT NULL,
    "ky_hieu" TEXT NOT NULL DEFAULT '',
    "so_hoa_don" TEXT NOT NULL DEFAULT '',
    "ngay_hoa_don" DATE NOT NULL,
    "khach_hang_id" TEXT,
    "nha_cung_cap_id" TEXT,
    "ten_doi_tac" TEXT NOT NULL DEFAULT '',
    "ma_so_thue_doi_tac" TEXT NOT NULL DEFAULT '',
    "dia_chi_doi_tac" TEXT NOT NULL DEFAULT '',
    "bao_gia_id" TEXT,
    "ty_le_vat" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "kieu_chiet_khau" "KieuChietKhau" NOT NULL DEFAULT 'soTien',
    "gia_tri_chiet_khau" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "han_thanh_toan" DATE,
    "trang_thai" "TrangThaiHoaDon" NOT NULL DEFAULT 'hieuLuc',
    "ghi_chu" TEXT NOT NULL DEFAULT '',
    "ngay_tao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_sua" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hoa_don_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dong_hoa_don" (
    "id" TEXT NOT NULL,
    "hoa_don_id" TEXT NOT NULL,
    "stt" INTEGER NOT NULL,
    "ten_hang" TEXT NOT NULL DEFAULT '',
    "don_vi_tinh" TEXT NOT NULL DEFAULT '',
    "so_luong" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "don_gia" DECIMAL(15,0) NOT NULL DEFAULT 0,

    CONSTRAINT "dong_hoa_don_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tep_hoa_don" (
    "id" TEXT NOT NULL,
    "hoa_don_id" TEXT NOT NULL,
    "ten_file" TEXT NOT NULL,
    "kieu_file" TEXT NOT NULL,
    "kich_thuoc" INTEGER NOT NULL,
    "du_lieu" BYTEA NOT NULL,
    "ngay_tao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tep_hoa_don_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phieu_thu_chi" (
    "id" TEXT NOT NULL,
    "loai" "LoaiPhieuThuChi" NOT NULL,
    "so_phieu" TEXT NOT NULL,
    "ngay" DATE NOT NULL,
    "so_tien" DECIMAL(15,0) NOT NULL,
    "hinh_thuc" "HinhThucTien" NOT NULL DEFAULT 'tienMat',
    "danh_muc" TEXT NOT NULL DEFAULT '',
    "khach_hang_id" TEXT,
    "nha_cung_cap_id" TEXT,
    "nhan_vien_id" TEXT,
    "hoa_don_id" TEXT,
    "tru_vao_luong" BOOLEAN NOT NULL DEFAULT false,
    "nguoi_nop_nhan" TEXT NOT NULL DEFAULT '',
    "noi_dung" TEXT NOT NULL DEFAULT '',
    "nguoi_lap" TEXT NOT NULL DEFAULT '',
    "ngay_tao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phieu_thu_chi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vat_tu" (
    "id" TEXT NOT NULL,
    "ma_vat_tu" TEXT NOT NULL DEFAULT '',
    "ten" TEXT NOT NULL,
    "don_vi_tinh" TEXT NOT NULL DEFAULT '',
    "nhom" TEXT NOT NULL DEFAULT '',
    "quy_cach" TEXT NOT NULL DEFAULT '',
    "ton_toi_thieu" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "ghi_chu" TEXT NOT NULL DEFAULT '',
    "ngung_dung" BOOLEAN NOT NULL DEFAULT false,
    "ngay_tao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vat_tu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phieu_kho" (
    "id" TEXT NOT NULL,
    "loai" "LoaiPhieuKho" NOT NULL,
    "so_phieu" TEXT NOT NULL,
    "ngay" DATE NOT NULL,
    "nha_cung_cap_id" TEXT,
    "hoa_don_id" TEXT,
    "bao_gia_id" TEXT,
    "nguoi_giao_nhan" TEXT NOT NULL DEFAULT '',
    "ghi_chu" TEXT NOT NULL DEFAULT '',
    "nguoi_lap" TEXT NOT NULL DEFAULT '',
    "ngay_tao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_sua" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phieu_kho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dong_phieu_kho" (
    "id" TEXT NOT NULL,
    "phieu_kho_id" TEXT NOT NULL,
    "stt" INTEGER NOT NULL,
    "vat_tu_id" TEXT NOT NULL,
    "so_luong" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "don_gia" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "ghi_chu" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "dong_phieu_kho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "khoi_landing" (
    "id" TEXT NOT NULL,
    "loai" TEXT NOT NULL,
    "tieu_de" TEXT NOT NULL DEFAULT '',
    "phu_de" TEXT NOT NULL DEFAULT '',
    "noi_dung" TEXT NOT NULL DEFAULT '',
    "anh_id" TEXT,
    "nut_chu" TEXT NOT NULL DEFAULT '',
    "nut_lien_ket" TEXT NOT NULL DEFAULT '',
    "danh_sach_muc" JSONB NOT NULL DEFAULT '[]',
    "hien" BOOLEAN NOT NULL DEFAULT true,
    "thu_tu" INTEGER NOT NULL DEFAULT 0,
    "ngay_sua" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "khoi_landing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anh_landing" (
    "id" TEXT NOT NULL,
    "ten_file" TEXT NOT NULL,
    "kieu_file" TEXT NOT NULL,
    "kich_thuoc" INTEGER NOT NULL,
    "mo_ta" TEXT NOT NULL DEFAULT '',
    "du_lieu" BYTEA NOT NULL,
    "ngay_tao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anh_landing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lien_he_landing" (
    "id" TEXT NOT NULL,
    "ho_ten" TEXT NOT NULL,
    "so_dien_thoai" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "noi_dung" TEXT NOT NULL DEFAULT '',
    "da_xu_ly" BOOLEAN NOT NULL DEFAULT false,
    "ghi_chu" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL DEFAULT '',
    "ngay_tao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lien_he_landing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cai_dat_landing" (
    "id" TEXT NOT NULL DEFAULT 'landing',
    "xuat_ban" BOOLEAN NOT NULL DEFAULT false,
    "tieu_de_trang" TEXT NOT NULL DEFAULT '',
    "mo_ta" TEXT NOT NULL DEFAULT '',
    "tu_khoa" TEXT NOT NULL DEFAULT '',
    "anh_chia_se_id" TEXT,
    "lien_ket_zalo" TEXT NOT NULL DEFAULT '',
    "lien_ket_facebook" TEXT NOT NULL DEFAULT '',
    "ban_do" TEXT NOT NULL DEFAULT '',
    "ma_theo_doi" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "cai_dat_landing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cot_hang_muc" (
    "id" TEXT NOT NULL,
    "truong" "TruongDong",
    "tieu_de" TEXT NOT NULL,
    "goi_y" TEXT NOT NULL DEFAULT '',
    "kieu" "KieuCot" NOT NULL DEFAULT 'chu',
    "an" BOOLEAN NOT NULL DEFAULT false,
    "bat_buoc" BOOLEAN NOT NULL DEFAULT false,
    "do_rong" INTEGER NOT NULL DEFAULT 110,
    "he_so_gian" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "thu_tu" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cot_hang_muc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "khach_hang_ten_cong_ty_idx" ON "khach_hang"("ten_cong_ty");

-- CreateIndex
CREATE INDEX "hang_muc_ten_idx" ON "hang_muc"("ten");

-- CreateIndex
CREATE UNIQUE INDEX "bao_gia_so_bao_gia_key" ON "bao_gia"("so_bao_gia");

-- CreateIndex
CREATE INDEX "bao_gia_ngay_sua_idx" ON "bao_gia"("ngay_sua");

-- CreateIndex
CREATE INDEX "bao_gia_trang_thai_idx" ON "bao_gia"("trang_thai");

-- CreateIndex
CREATE INDEX "dong_bao_gia_bao_gia_id_stt_idx" ON "dong_bao_gia"("bao_gia_id", "stt");

-- CreateIndex
CREATE UNIQUE INDEX "nghiem_thu_so_bien_ban_key" ON "nghiem_thu"("so_bien_ban");

-- CreateIndex
CREATE INDEX "nghiem_thu_bao_gia_id_idx" ON "nghiem_thu"("bao_gia_id");

-- CreateIndex
CREATE INDEX "nghiem_thu_ngay_sua_idx" ON "nghiem_thu"("ngay_sua");

-- CreateIndex
CREATE INDEX "dong_nghiem_thu_nghiem_thu_id_stt_idx" ON "dong_nghiem_thu"("nghiem_thu_id", "stt");

-- CreateIndex
CREATE INDEX "anh_nghiem_thu_nghiem_thu_id_thu_tu_idx" ON "anh_nghiem_thu"("nghiem_thu_id", "thu_tu");

-- CreateIndex
CREATE UNIQUE INDEX "vai_tro_ten_key" ON "vai_tro"("ten");

-- CreateIndex
CREATE UNIQUE INDEX "nguoi_dung_ten_dang_nhap_key" ON "nguoi_dung"("ten_dang_nhap");

-- CreateIndex
CREATE UNIQUE INDEX "nguoi_dung_nhan_vien_id_key" ON "nguoi_dung"("nhan_vien_id");

-- CreateIndex
CREATE INDEX "nhan_vien_dang_lam_thu_tu_idx" ON "nhan_vien"("dang_lam", "thu_tu");

-- CreateIndex
CREATE UNIQUE INDEX "loai_cong_ky_hieu_key" ON "loai_cong"("ky_hieu");

-- CreateIndex
CREATE INDEX "cham_cong_ngay_idx" ON "cham_cong"("ngay");

-- CreateIndex
CREATE UNIQUE INDEX "cham_cong_nhan_vien_id_ngay_key" ON "cham_cong"("nhan_vien_id", "ngay");

-- CreateIndex
CREATE INDEX "nha_cung_cap_ten_cong_ty_idx" ON "nha_cung_cap"("ten_cong_ty");

-- CreateIndex
CREATE INDEX "hoa_don_loai_ngay_hoa_don_idx" ON "hoa_don"("loai", "ngay_hoa_don");

-- CreateIndex
CREATE INDEX "hoa_don_khach_hang_id_idx" ON "hoa_don"("khach_hang_id");

-- CreateIndex
CREATE INDEX "hoa_don_nha_cung_cap_id_idx" ON "hoa_don"("nha_cung_cap_id");

-- CreateIndex
CREATE INDEX "dong_hoa_don_hoa_don_id_stt_idx" ON "dong_hoa_don"("hoa_don_id", "stt");

-- CreateIndex
CREATE INDEX "tep_hoa_don_hoa_don_id_idx" ON "tep_hoa_don"("hoa_don_id");

-- CreateIndex
CREATE UNIQUE INDEX "phieu_thu_chi_so_phieu_key" ON "phieu_thu_chi"("so_phieu");

-- CreateIndex
CREATE INDEX "phieu_thu_chi_ngay_idx" ON "phieu_thu_chi"("ngay");

-- CreateIndex
CREATE INDEX "phieu_thu_chi_hoa_don_id_idx" ON "phieu_thu_chi"("hoa_don_id");

-- CreateIndex
CREATE INDEX "phieu_thu_chi_nhan_vien_id_ngay_idx" ON "phieu_thu_chi"("nhan_vien_id", "ngay");

-- CreateIndex
CREATE INDEX "vat_tu_ten_idx" ON "vat_tu"("ten");

-- CreateIndex
CREATE UNIQUE INDEX "phieu_kho_so_phieu_key" ON "phieu_kho"("so_phieu");

-- CreateIndex
CREATE INDEX "phieu_kho_ngay_idx" ON "phieu_kho"("ngay");

-- CreateIndex
CREATE INDEX "dong_phieu_kho_phieu_kho_id_stt_idx" ON "dong_phieu_kho"("phieu_kho_id", "stt");

-- CreateIndex
CREATE INDEX "dong_phieu_kho_vat_tu_id_idx" ON "dong_phieu_kho"("vat_tu_id");

-- CreateIndex
CREATE INDEX "khoi_landing_thu_tu_idx" ON "khoi_landing"("thu_tu");

-- CreateIndex
CREATE INDEX "lien_he_landing_da_xu_ly_ngay_tao_idx" ON "lien_he_landing"("da_xu_ly", "ngay_tao");

-- CreateIndex
CREATE UNIQUE INDEX "cot_hang_muc_truong_key" ON "cot_hang_muc"("truong");

-- CreateIndex
CREATE INDEX "cot_hang_muc_thu_tu_idx" ON "cot_hang_muc"("thu_tu");

-- AddForeignKey
ALTER TABLE "bao_gia" ADD CONSTRAINT "bao_gia_khach_hang_id_fkey" FOREIGN KEY ("khach_hang_id") REFERENCES "khach_hang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dong_bao_gia" ADD CONSTRAINT "dong_bao_gia_bao_gia_id_fkey" FOREIGN KEY ("bao_gia_id") REFERENCES "bao_gia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nghiem_thu" ADD CONSTRAINT "nghiem_thu_bao_gia_id_fkey" FOREIGN KEY ("bao_gia_id") REFERENCES "bao_gia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nghiem_thu" ADD CONSTRAINT "nghiem_thu_khach_hang_id_fkey" FOREIGN KEY ("khach_hang_id") REFERENCES "khach_hang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dong_nghiem_thu" ADD CONSTRAINT "dong_nghiem_thu_nghiem_thu_id_fkey" FOREIGN KEY ("nghiem_thu_id") REFERENCES "nghiem_thu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anh_nghiem_thu" ADD CONSTRAINT "anh_nghiem_thu_nghiem_thu_id_fkey" FOREIGN KEY ("nghiem_thu_id") REFERENCES "nghiem_thu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nguoi_dung" ADD CONSTRAINT "nguoi_dung_vai_tro_id_fkey" FOREIGN KEY ("vai_tro_id") REFERENCES "vai_tro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nguoi_dung" ADD CONSTRAINT "nguoi_dung_nhan_vien_id_fkey" FOREIGN KEY ("nhan_vien_id") REFERENCES "nhan_vien"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cham_cong" ADD CONSTRAINT "cham_cong_nhan_vien_id_fkey" FOREIGN KEY ("nhan_vien_id") REFERENCES "nhan_vien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cham_cong" ADD CONSTRAINT "cham_cong_loai_cong_id_fkey" FOREIGN KEY ("loai_cong_id") REFERENCES "loai_cong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hoa_don" ADD CONSTRAINT "hoa_don_khach_hang_id_fkey" FOREIGN KEY ("khach_hang_id") REFERENCES "khach_hang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hoa_don" ADD CONSTRAINT "hoa_don_nha_cung_cap_id_fkey" FOREIGN KEY ("nha_cung_cap_id") REFERENCES "nha_cung_cap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hoa_don" ADD CONSTRAINT "hoa_don_bao_gia_id_fkey" FOREIGN KEY ("bao_gia_id") REFERENCES "bao_gia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dong_hoa_don" ADD CONSTRAINT "dong_hoa_don_hoa_don_id_fkey" FOREIGN KEY ("hoa_don_id") REFERENCES "hoa_don"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tep_hoa_don" ADD CONSTRAINT "tep_hoa_don_hoa_don_id_fkey" FOREIGN KEY ("hoa_don_id") REFERENCES "hoa_don"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phieu_thu_chi" ADD CONSTRAINT "phieu_thu_chi_khach_hang_id_fkey" FOREIGN KEY ("khach_hang_id") REFERENCES "khach_hang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phieu_thu_chi" ADD CONSTRAINT "phieu_thu_chi_nha_cung_cap_id_fkey" FOREIGN KEY ("nha_cung_cap_id") REFERENCES "nha_cung_cap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phieu_thu_chi" ADD CONSTRAINT "phieu_thu_chi_nhan_vien_id_fkey" FOREIGN KEY ("nhan_vien_id") REFERENCES "nhan_vien"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phieu_thu_chi" ADD CONSTRAINT "phieu_thu_chi_hoa_don_id_fkey" FOREIGN KEY ("hoa_don_id") REFERENCES "hoa_don"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phieu_kho" ADD CONSTRAINT "phieu_kho_nha_cung_cap_id_fkey" FOREIGN KEY ("nha_cung_cap_id") REFERENCES "nha_cung_cap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phieu_kho" ADD CONSTRAINT "phieu_kho_hoa_don_id_fkey" FOREIGN KEY ("hoa_don_id") REFERENCES "hoa_don"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phieu_kho" ADD CONSTRAINT "phieu_kho_bao_gia_id_fkey" FOREIGN KEY ("bao_gia_id") REFERENCES "bao_gia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dong_phieu_kho" ADD CONSTRAINT "dong_phieu_kho_phieu_kho_id_fkey" FOREIGN KEY ("phieu_kho_id") REFERENCES "phieu_kho"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dong_phieu_kho" ADD CONSTRAINT "dong_phieu_kho_vat_tu_id_fkey" FOREIGN KEY ("vat_tu_id") REFERENCES "vat_tu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
