/**
 * Đặt lại mật khẩu khi quên (chạy trên máy chủ, không qua giao diện):
 *   npm run dat-lai-mat-khau -- <tên đăng nhập> <mật khẩu mới>
 * Đồng thời mở khoá tài khoản và đăng xuất người đó khỏi mọi máy.
 */
import { prisma } from './prisma';
import { MAT_KHAU_TOI_THIEU, bamMatKhau } from './xacThuc';

async function main() {
  const [ten, matKhau] = process.argv.slice(2);
  if (!ten || !matKhau) {
    const ds = await prisma.nguoiDung.findMany({ select: { tenDangNhap: true, hoTen: true }, orderBy: { tenDangNhap: 'asc' } });
    console.log('Cách dùng: npm run dat-lai-mat-khau -- <tên đăng nhập> <mật khẩu mới>');
    console.log('Các tài khoản:', ds.map((n) => `${n.tenDangNhap} (${n.hoTen})`).join(', ') || '(chưa có — chạy npm run db:seed)');
    process.exitCode = 1;
    return;
  }
  if (matKhau.length < MAT_KHAU_TOI_THIEU) throw new Error(`Mật khẩu cần ít nhất ${MAT_KHAU_TOI_THIEU} ký tự`);
  const kq = await prisma.nguoiDung.updateMany({
    where: { tenDangNhap: ten.trim().toLowerCase() },
    data: { matKhauBam: await bamMatKhau(matKhau), khoa: false, phienBan: { increment: 1 } },
  });
  if (!kq.count) throw new Error(`Không có tài khoản "${ten}"`);
  console.log(`Đã đặt lại mật khẩu cho "${ten}".`);
}

main()
  .catch((e) => {
    console.error((e as Error).message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
