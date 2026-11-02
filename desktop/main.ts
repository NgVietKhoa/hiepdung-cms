/**
 * Bản desktop: tự chạy PostgreSQL nhúng (dữ liệu trong thư mục AppData của ứng dụng) và máy chủ API
 * (migrate deploy → seed → server), rồi mở cửa sổ vào máy chủ đó.
 * Các tiến trình con chạy bằng chính electron.exe ở chế độ Node nên máy dùng không cần cài Node.
 */
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cp, rename, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { app, BrowserWindow, clipboard, dialog, Menu, shell } from 'electron';
import { pg_ctl } from '@embedded-postgres/windows-x64';
import EmbeddedPostgres from 'embedded-postgres';

/** Cổng API cố định: localStorage (phiên đăng nhập, bản nháp tạm) gắn theo địa chỉ, đổi cổng là mất */
const CONG_API = 41730;
const TEN_DB = 'hiep_dung_cms';
const DIA_CHI = `http://127.0.0.1:${CONG_API}`;

const goc = app.getAppPath();
const thuMucDuLieu = app.getPath('userData');
mkdirSync(thuMucDuLieu, { recursive: true });
const duongDanNhatKy = join(thuMucDuLieu, 'nhatKy.log');
const nhatKy = createWriteStream(duongDanNhatKy, { flags: 'a' });
const ghiNhatKy = (s: string) => nhatKy.write(s.endsWith('\n') ? s : `${s}\n`);
const thuMucDb = join(thuMucDuLieu, 'pgdata');
const duongDanCauHinh = join(thuMucDuLieu, 'cauHinh.json');
const thuMucFile = join(app.getPath('documents'), 'Hiep Dung CMS');

/** Mật khẩu DB và APP_SECRET sinh ngẫu nhiên lần đầu, giữ nguyên các lần sau */
function docCauHinh(): { matKhauDb: string; biMat: string } {
  if (existsSync(duongDanCauHinh)) return JSON.parse(readFileSync(duongDanCauHinh, 'utf8'));
  const cauHinh = { matKhauDb: randomBytes(24).toString('hex'), biMat: randomBytes(32).toString('hex') };
  writeFileSync(duongDanCauHinh, JSON.stringify(cauHinh, null, 2));
  return cauHinh;
}

function layCongTrong(): Promise<number> {
  return new Promise((xong, loi) => {
    const s = createServer();
    s.once('error', loi);
    s.listen(0, '127.0.0.1', () => {
      const cong = (s.address() as { port: number }).port;
      s.close(() => xong(cong));
    });
  });
}

/** Chạy một script TypeScript / JS bằng electron.exe ở chế độ Node, ghi đầu ra vào nhật ký */
function chayNode(doiSo: string[], moiTruong: NodeJS.ProcessEnv): ChildProcess {
  const tienTrinh = spawn(process.execPath, doiSo, {
    cwd: goc,
    env: { ...process.env, ...moiTruong, ELECTRON_RUN_AS_NODE: '1' },
    windowsHide: true,
  });
  tienTrinh.stdout?.on('data', (d) => ghiNhatKy(String(d)));
  tienTrinh.stderr?.on('data', (d) => ghiNhatKy(String(d)));
  return tienTrinh;
}

/** Chạy đến khi xong; trả về đầu ra, mã thoát khác 0 thì báo lỗi */
function chayDenXong(doiSo: string[], moiTruong: NodeJS.ProcessEnv): Promise<string> {
  return new Promise((xong, loi) => {
    let dauRa = '';
    const tienTrinh = chayNode(doiSo, moiTruong);
    tienTrinh.stdout?.on('data', (d) => (dauRa += d));
    tienTrinh.on('error', loi);
    // 'close' (không phải 'exit') để đã nhận hết stdout
    tienTrinh.on('close', (ma) => (ma === 0 ? xong(dauRa) : loi(new Error(`${doiSo.join(' ')} thoát với mã ${ma}`))));
  });
}

async function choMayChu(mayChu: ChildProcess): Promise<void> {
  for (let i = 0; i < 120; i++) {
    if (mayChu.exitCode !== null) throw new Error('Máy chủ API dừng khi đang khởi động');
    try {
      if ((await fetch(`${DIA_CHI}/api/suc-khoe`)).ok) return;
    } catch {
      /* chưa sẵn sàng */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Máy chủ API không phản hồi');
}

/** db.stop() trên Windows dùng taskkill /f → lần mở sau Postgres phải tự phục hồi; tắt đúng cách bằng pg_ctl */
function tatPostgres(): Promise<void> {
  return new Promise((xong) =>
    execFile(pg_ctl, ['stop', '-D', thuMucDb, '-m', 'fast', '-w'], (loi, _ra, loiRa) => {
      if (loi) ghiNhatKy(`pg_ctl stop: ${loiRa || loi.message}`);
      xong();
    }),
  );
}

let db: EmbeddedPostgres | undefined;
let mayChu: ChildProcess | undefined;
let cuaSo: BrowserWindow | undefined;
/** Đang khởi động / sao lưu / khôi phục: không nhận thao tác menu khác */
let dangBan = false;

/** Bật Postgres → migrate → seed → máy chủ API, chờ máy chủ sẵn sàng */
async function batDichVu() {
  const { matKhauDb, biMat } = docCauHinh();
  const congDb = await layCongTrong();
  db = new EmbeddedPostgres({
    databaseDir: thuMucDb,
    port: congDb,
    user: 'hiepdung',
    password: matKhauDb,
    authMethod: 'scram-sha-256',
    // Tránh mã hoá theo locale Windows (WIN1258…); sắp xếp theo byte như image postgres:16-alpine
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    onLog: ghiNhatKy,
    onError: (e) => ghiNhatKy(String(e)),
  });
  const lanDau = !existsSync(join(thuMucDb, 'PG_VERSION'));
  if (lanDau) await db.initialise();
  await db.start();
  // Lần mở nào cũng kiểm tra: lần đầu lỗi ngay sau initdb thì lần sau vẫn tạo được
  const ketNoi = db.getPgClient();
  await ketNoi.connect();
  try {
    const { rowCount } = await ketNoi.query('SELECT 1 FROM pg_database WHERE datname = $1', [TEN_DB]);
    if (!rowCount) await ketNoi.query(`CREATE DATABASE ${TEN_DB}`);
  } finally {
    await ketNoi.end();
  }

  const moiTruong: NodeJS.ProcessEnv = {
    DATABASE_URL: `postgresql://hiepdung:${matKhauDb}@127.0.0.1:${congDb}/${TEN_DB}?schema=public`,
    APP_SECRET: biMat,
    PORT: String(CONG_API),
    THU_MUC_LUU_FILE: thuMucFile,
    SEED_DU_LIEU_MAU: 'false',
    // Prisma CLI không gọi mạng kiểm tra bản mới / gửi thống kê mỗi lần mở
    CHECKPOINT_DISABLE: '1',
  };
  await chayDenXong([join(goc, 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'], moiTruong);
  const dauRaSeed = await chayDenXong(['--import', 'tsx', join(goc, 'prisma', 'seed.ts')], moiTruong);

  // Seed tạo tài khoản quản trị lần đầu với mật khẩu ngẫu nhiên và in ra; bản desktop không có log để xem.
  // Hiện ngay sau seed: các bước sau có lỗi thì người dùng vẫn đã có mật khẩu (lần sau seed không in lại)
  const matKhauTam = /Mật khẩu tạm: (\S+)/.exec(dauRaSeed)?.[1];
  if (matKhauTam && cuaSo) {
    clipboard.writeText(matKhauTam);
    await dialog.showMessageBox(cuaSo, {
      type: 'info',
      title: 'Tài khoản quản trị',
      message: `Tên đăng nhập: admin\nMật khẩu tạm: ${matKhauTam}`,
      detail: 'Mật khẩu đã được chép sẵn, dán vào ô đăng nhập. Đăng nhập xong hãy đổi mật khẩu ngay (bấm tên mình ở menu → Đổi mật khẩu).',
    });
  }

  const tienTrinh = chayNode(['--import', 'tsx', join(goc, 'server', 'index.ts')], moiTruong);
  mayChu = tienTrinh;
  await choMayChu(tienTrinh);
  tienTrinh.on('exit', () => {
    // tatDichVu() bỏ mayChu trước khi dừng → còn trỏ vào đây nghĩa là máy chủ tự dừng
    if (mayChu === tienTrinh) {
      dialog.showErrorBox('Máy chủ dừng đột ngột', `Mở lại ứng dụng. Nhật ký: ${duongDanNhatKy}`);
      app.quit();
    }
  });
}

/** Dừng máy chủ API (chờ nhả cổng) rồi tắt Postgres */
async function tatDichVu() {
  const tienTrinh = mayChu;
  mayChu = undefined;
  if (tienTrinh && tienTrinh.exitCode === null && tienTrinh.signalCode === null) {
    await new Promise((xong) => {
      tienTrinh.once('exit', xong);
      tienTrinh.kill();
    });
  }
  if (db) await tatPostgres();
  db = undefined;
}

const hienDangCho = (chu: string) =>
  cuaSo?.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(
      `<body style="font-family:sans-serif;display:grid;place-items:center;height:90vh;color:#555">${chu}</body>`,
    )}`,
  );

/** Tạm dừng dịch vụ để chép thư mục dữ liệu (Postgres đang chạy thì bản chép không nhất quán) rồi bật lại */
async function baoTri(chu: string, viec: () => Promise<void>) {
  if (dangBan) return;
  dangBan = true;
  try {
    void hienDangCho(chu);
    await tatDichVu();
    try {
      await viec();
    } finally {
      await batDichVu();
      await cuaSo?.loadURL(DIA_CHI);
    }
  } finally {
    dangBan = false;
  }
}

const dauThoiGian = () => {
  const d = new Date();
  const hai = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${hai(d.getMonth() + 1)}-${hai(d.getDate())}_${hai(d.getHours())}${hai(d.getMinutes())}${hai(d.getSeconds())}`;
};

async function saoLuu() {
  if (!cuaSo || dangBan) return;
  const goiY = join(thuMucFile, 'SaoLuu');
  mkdirSync(goiY, { recursive: true });
  const { canceled, filePaths } = await dialog.showOpenDialog(cuaSo, {
    title: 'Chọn thư mục để lưu bản sao lưu (nên là USB / ổ khác)',
    defaultPath: goiY,
    properties: ['openDirectory', 'createDirectory'],
  });
  if (canceled || !filePaths[0]) return;
  const dich = join(filePaths[0], `SaoLuu_${dauThoiGian()}`);
  // Chép kèm cauHinh.json: mật khẩu DB nằm trong đó, thiếu thì bản sao lưu không mở được
  await baoTri('Đang sao lưu…', async () => {
    await cp(thuMucDb, join(dich, 'pgdata'), { recursive: true });
    await cp(duongDanCauHinh, join(dich, 'cauHinh.json'));
  });
  await dialog.showMessageBox(cuaSo, { type: 'info', title: 'Sao lưu', message: 'Đã sao lưu toàn bộ dữ liệu', detail: dich });
}

async function khoiPhuc() {
  if (!cuaSo || dangBan) return;
  const { canceled, filePaths } = await dialog.showOpenDialog(cuaSo, {
    title: 'Chọn thư mục sao lưu (SaoLuu_…)',
    defaultPath: join(thuMucFile, 'SaoLuu'),
    properties: ['openDirectory'],
  });
  if (canceled || !filePaths[0]) return;
  const nguon = filePaths[0];
  if (!existsSync(join(nguon, 'pgdata', 'PG_VERSION')) || !existsSync(join(nguon, 'cauHinh.json'))) {
    return dialog.showErrorBox('Không phải bản sao lưu', 'Hãy chọn thư mục SaoLuu_… (bên trong có pgdata và cauHinh.json).');
  }
  // Dữ liệu hiện tại giữ lại cùng dạng bản sao lưu → chọn nhầm thì khôi phục lại được bằng chính menu này
  const banCu = join(thuMucDuLieu, `TruocKhoiPhuc_${dauThoiGian()}`);
  const { response } = await dialog.showMessageBox(cuaSo, {
    type: 'warning',
    title: 'Khôi phục',
    buttons: ['Khôi phục', 'Huỷ'],
    defaultId: 1,
    cancelId: 1,
    message: 'Thay toàn bộ dữ liệu hiện tại bằng bản sao lưu này?',
    detail: `${nguon}\n\nDữ liệu hiện tại được giữ ở:\n${banCu}`,
  });
  if (response !== 0) return;
  await baoTri('Đang khôi phục…', async () => {
    // Chép bản sao lưu ra chỗ tạm trước: chép lỗi giữa chừng (rút USB, đầy ổ) thì dữ liệu hiện tại còn nguyên
    const banMoi = `${thuMucDb}.moi`;
    await rm(banMoi, { recursive: true, force: true });
    await cp(join(nguon, 'pgdata'), banMoi, { recursive: true });
    mkdirSync(banCu, { recursive: true });
    await rename(thuMucDb, join(banCu, 'pgdata'));
    await cp(duongDanCauHinh, join(banCu, 'cauHinh.json'));
    await rename(banMoi, thuMucDb);
    await cp(join(nguon, 'cauHinh.json'), duongDanCauHinh);
  });
  await dialog.showMessageBox(cuaSo, { type: 'info', title: 'Khôi phục', message: 'Đã khôi phục. Hãy đăng nhập lại.' });
}

/** Lỗi khi sao lưu / khôi phục: báo lỗi; máy chủ không bật lại được thì thoát để người dùng mở lại */
const batLoi = (viec: () => Promise<unknown>) => () =>
  void viec().catch((e) => {
    ghiNhatKy(String((e as Error)?.stack ?? e));
    dialog.showErrorBox('Có lỗi', `${(e as Error).message}\n\nNhật ký: ${duongDanNhatKy}`);
    if (!mayChu) app.quit();
  });

function taoMenu() {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'Dữ liệu',
        submenu: [
          { label: 'Sao lưu toàn bộ…', click: batLoi(saoLuu) },
          { label: 'Khôi phục từ bản sao lưu…', click: batLoi(khoiPhuc) },
          { type: 'separator' },
          {
            label: 'Mở thư mục file đã lưu',
            click: () => {
              mkdirSync(thuMucFile, { recursive: true });
              void shell.openPath(thuMucFile);
            },
          },
          { type: 'separator' },
          { label: 'Thoát', role: 'quit' },
        ],
      },
      {
        label: 'Xem',
        submenu: [
          { label: 'Tải lại', role: 'reload' },
          { label: 'Phóng to', role: 'zoomIn' },
          { label: 'Thu nhỏ', role: 'zoomOut' },
          { label: 'Cỡ mặc định', role: 'resetZoom' },
        ],
      },
    ]),
  );
}

async function khoiDong() {
  dangBan = true;
  taoMenu();
  cuaSo = new BrowserWindow({
    width: 1280,
    height: 820,
    title: 'Hiệp Dung CMS',
    icon: join(goc, 'dist', 'icon-512.png'),
  });
  // Đóng cửa sổ lúc đang chép thư mục dữ liệu sẽ cắt ngang việc chép
  cuaSo.on('close', (e) => {
    if (dangBan) e.preventDefault();
  });
  void hienDangCho('Đang khởi động…');
  await batDichVu();
  await cuaSo.loadURL(DIA_CHI);
  dangBan = false;
}

let dangThoat = false;

if (!app.requestSingleInstanceLock()) {
  // Hai bản cùng mở một thư mục dữ liệu sẽ hỏng DB
  app.quit();
} else {
  app.on('second-instance', () => {
    if (cuaSo?.isMinimized()) cuaSo.restore();
    cuaSo?.focus();
  });
  app.on('will-quit', (e) => {
    if (dangThoat) return;
    e.preventDefault();
    dangThoat = true;
    void tatDichVu().finally(() => app.quit());
  });
  app.whenReady().then(khoiDong).catch((e) => {
    dangBan = false;
    ghiNhatKy(String(e?.stack ?? e));
    dialog.showErrorBox('Không khởi động được', `${(e as Error).message}\n\nNhật ký: ${duongDanNhatKy}`);
    app.quit();
  });
}
