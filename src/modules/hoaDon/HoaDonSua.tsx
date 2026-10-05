/**
 * Soạn hoá đơn (mua vào / bán ra): tự lưu như báo giá. Hoá đơn mới chỉ được tạo trên máy chủ khi bắt đầu sửa.
 * Sau khi đã lưu: ghi thanh toán (phiếu thu / chi gắn hoá đơn), đính kèm file PDF / XML / ảnh.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BangTong } from '../../components/BangTong';
import { BieuTuong } from '../../components/BieuTuong';
import { dinhDangKichThuoc, OChon } from '../../components/ChungCms';
import { useGiaoTiep } from '../../components/HopThoai';
import { HopThoaiKhachHang } from '../../components/KhachHangForm';
import { The, TrangSoan } from '../../components/KhungTrang';
import { ChonMot, OChu, ONgay, OSo, OTien } from '../../components/ONhap';
import { api } from '../../db/api';
import { useCaiDat, useTruyVan } from '../../db/hooks';
import type { CaiDat, KhachHang } from '../../db/kieu';
import { usePhien } from '../../db/phien';
import { taiFile } from '../../pdf/xuat';
import { dinhDangNgay, dinhDangTien, homNayISO } from '../../lib/dinhDang';
import { taoId } from '../../lib/id';
import { thanhTien } from '../../lib/tinhTien';
import { useTuLuu } from '../../lib/useTuLuu';
import { apiCms } from '../api';
import { HopThoaiPhieu, phieuMoi } from '../thuChi/HopThoaiPhieu';
import { NHAN_HINH_THUC, type PhieuThuChi } from '../thuChi/kieu';
import { NhanThanhToan } from './HoaDonTrang';
import { NHAN_LOAI_HOA_DON, tongHoaDon, type DongHoaDon, type HoaDon, type LoaiHoaDon, type NhaCungCap } from './kieu';
import { HopThoaiNhaCungCap, nhaCungCapTrong } from './NhaCungCapTrang';

const dongTrong = (donViTinh = ''): DongHoaDon => ({ id: taoId(), tenHang: '', donViTinh, soLuong: 1, donGia: 0 });

function hoaDonTrong(id: string, loai: LoaiHoaDon, cd: CaiDat): HoaDon {
  return {
    id,
    loai,
    kyHieu: '',
    soHoaDon: '',
    ngayHoaDon: homNayISO(),
    khachHangId: null,
    nhaCungCapId: null,
    tenDoiTac: '',
    maSoThueDoiTac: '',
    diaChiDoiTac: '',
    baoGiaId: null,
    tyLeVAT: cd.vatMacDinh,
    chietKhau: { kieu: 'soTien', giaTri: 0 },
    hanThanhToan: '',
    trangThai: 'hieuLuc',
    ghiChu: '',
    danhSachDong: [dongTrong(cd.danhSachDonViTinh[0])],
    ngayTao: Date.now(),
    ngaySua: Date.now(),
  };
}

export function HoaDonSua() {
  const { id = '' } = useParams();
  const [thamSo] = useSearchParams();
  const dieuHuong = useNavigate();
  const { xacNhan, thongBao } = useGiaoTiep();
  const { coQuyen } = usePhien();
  const cd = useCaiDat();
  const [hd, setHd] = useState<HoaDon>();
  const [daCo, setDaCo] = useState(false);
  const [loiTai, setLoiTai] = useState('');
  const [phieu, setPhieu] = useState<{ p: PhieuThuChi; moi: boolean } | null>(null);
  const [themDoiTac, setThemDoiTac] = useState(false);
  const daXoa = useRef(false);
  const oTep = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let huy = false;
    (async () => {
      const coSan = await apiCms.hoaDon.lay(id);
      if (huy) return;
      if (coSan) {
        setHd(coSan);
        setDaCo(true);
        return;
      }
      const caiDat = await api.caiDat.lay();
      const tuBaoGia = thamSo.get('tuBaoGia');
      const loai: LoaiHoaDon = thamSo.get('moi') === 'muaVao' ? 'muaVao' : 'banRa';
      if (tuBaoGia) {
        const nhap = await apiCms.hoaDon.tuBaoGia(tuBaoGia);
        if (!huy) setHd({ ...hoaDonTrong(id, 'banRa', caiDat), ...nhap, id, danhSachDong: (nhap.danhSachDong ?? []).map((d) => ({ ...d, id: taoId() })) });
      } else if (thamSo.get('moi')) {
        setHd(hoaDonTrong(id, loai, caiDat));
      } else {
        setLoiTai('Không tìm thấy hoá đơn này (có thể đã bị xoá).');
      }
    })().catch((e) => !huy && setLoiTai((e as Error).message));
    return () => {
      huy = true;
    };
  }, [id]);

  const { trangThai, thongDiepLoi } = useTuLuu(hd, async (h) => {
    if (daXoa.current) return;
    // Tự lưu khi đang gõ: không bắt các danh sách tải lại (danh sách hoá đơn tự tải lại khi mở)
    await apiCms.hoaDon.luu(h, { baoThayDoi: false });
    setDaCo(true);
  });

  const doiTac = useTruyVan(async () => {
    const [khach, ncc] = await Promise.all([
      hd?.loai === 'banRa' ? api.khachHang.ds() : Promise.resolve([] as KhachHang[]),
      hd?.loai === 'muaVao' ? apiCms.hoaDon.dsNhaCungCap() : Promise.resolve([] as NhaCungCap[]),
    ]);
    return { khach, ncc };
  }, [hd?.loai]);
  const thanhToan = useTruyVan(() => (daCo ? apiCms.thuChi.ds({ hoaDonId: id }) : Promise.resolve([])), [daCo, id]);
  const tep = useTruyVan(() => (daCo ? apiCms.hoaDon.dsTep(id) : Promise.resolve([])), [daCo, id]);

  if (!hd) {
    return (
      <TrangSoan tieuDe="Hoá đơn" quayVe="/hoa-don">
        {loiTai ? <div className="canh-bao-loi">{loiTai}</div> : <p className="dang-tai">Đang tải…</p>}
      </TrangSoan>
    );
  }

  const doi = (thayDoi: Partial<HoaDon>) => setHd((h) => (h ? { ...h, ...thayDoi } : h));
  const doiDong = (i: number, thayDoi: Partial<DongHoaDon>) =>
    doi({ danhSachDong: hd.danhSachDong.map((d, j) => (j === i ? { ...d, ...thayDoi } : d)) });
  const banRa = hd.loai === 'banRa';
  const tong = tongHoaDon(hd);
  const daTra = (thanhToan ?? []).reduce((s, p) => s + p.soTien, 0);

  const chonDoiTac = (dt: { id: string; tenCongTy: string; maSoThue: string; diaChi: string } | undefined) =>
    doi({
      ...(banRa ? { khachHangId: dt?.id ?? null } : { nhaCungCapId: dt?.id ?? null }),
      tenDoiTac: dt?.tenCongTy ?? hd.tenDoiTac,
      maSoThueDoiTac: dt?.maSoThue ?? hd.maSoThueDoiTac,
      diaChiDoiTac: dt?.diaChi ?? hd.diaChiDoiTac,
    });

  const xoa = async () => {
    if (!(await xacNhan('Xoá hoá đơn này? File đính kèm xoá theo; phiếu thu / chi đã lập vẫn giữ lại.', { nutDongY: 'Xoá' }))) return;
    daXoa.current = true;
    if (daCo) await apiCms.hoaDon.xoa(id);
    thongBao('Đã xoá hoá đơn');
    dieuHuong('/hoa-don', { replace: true });
  };

  const themTep = async (files: FileList | null) => {
    for (const f of Array.from(files ?? [])) {
      try {
        await apiCms.hoaDon.themTep(id, f);
      } catch (e) {
        thongBao(`${f.name}: ${(e as Error).message}`, 'loi');
      }
    }
  };

  const conNo = tong.tongThanhToan - daTra;

  return (
    <TrangSoan
      tieuDe={`Hoá đơn ${NHAN_LOAI_HOA_DON[hd.loai].toLowerCase()}`}
      phuDe={[hd.kyHieu, hd.soHoaDon && `Số ${hd.soHoaDon}`, hd.tenDoiTac].filter(Boolean).join(' · ') || 'Hoá đơn mới'}
      trangThaiLuu={daCo || trangThai !== 'daLuu' ? trangThai : undefined}
      loiLuu={thongDiepLoi}
      quayVe={`/hoa-don?loai=${hd.loai}&thang=${hd.ngayHoaDon.slice(0, 7)}`}
      thanhDuoi={
        <div className="hang-nut">
          <button type="button" className="nut nut-vien-do" onClick={xoa}>
            <BieuTuong ten="xoa" /> Xoá
          </button>
          {daCo && hd.trangThai === 'hieuLuc' && (coQuyen('thuChi') || coQuyen('hoaDon')) && (
            <button
              type="button"
              className="nut nut-chinh"
              onClick={() =>
                setPhieu({
                  moi: true,
                  p: phieuMoi(banRa ? 'thu' : 'chi', {
                    hoaDonId: hd.id,
                    soTien: Math.max(0, conNo),
                    danhMuc: banRa ? (cd.danhMucThu[0] ?? '') : (cd.danhMucChi[0] ?? ''),
                    nguoiNopNhan: hd.tenDoiTac,
                    noiDung: `Thanh toán hoá đơn ${[hd.kyHieu, hd.soHoaDon].filter(Boolean).join(' số ')}`,
                  }),
                })
              }
            >
              <BieuTuong ten="tien" /> {banRa ? 'Ghi tiền thu' : 'Ghi tiền trả'}
            </button>
          )}
        </div>
      }
    >
      <div className="bo-cuc-soan">
        <The tieuDe="Thông tin hoá đơn" bieuTuong="hoaDon">
          {!daCo && (
            <ChonMot
              nhan="Loại hoá đơn"
              value={hd.loai}
              onChange={(loai) => doi({ loai, khachHangId: null, nhaCungCapId: null, baoGiaId: null })}
              luaChon={[
                { giaTri: 'banRa', nhan: 'Bán ra (xuất cho khách)' },
                { giaTri: 'muaVao', nhan: 'Mua vào (nhà cung cấp xuất)' },
              ]}
            />
          )}
          <div className="luoi-2">
            <OChu nhan="Ký hiệu" value={hd.kyHieu} onChange={(kyHieu) => doi({ kyHieu: kyHieu.toUpperCase() })} placeholder="vd: 1C26TAA" />
            <OChu nhan="Số hoá đơn" value={hd.soHoaDon} onChange={(soHoaDon) => doi({ soHoaDon })} inputMode="numeric" />
          </div>
          <div className="luoi-2">
            <ONgay nhan="Ngày hoá đơn" value={hd.ngayHoaDon} onChange={(ngayHoaDon) => doi({ ngayHoaDon })} />
            <ONgay nhan="Hạn thanh toán" value={hd.hanThanhToan} onChange={(hanThanhToan) => doi({ hanThanhToan })} />
          </div>
          <ChonMot
            nhan="Trạng thái"
            value={hd.trangThai}
            onChange={(trangThai) => doi({ trangThai })}
            luaChon={[
              { giaTri: 'hieuLuc', nhan: 'Hiệu lực' },
              { giaTri: 'huy', nhan: 'Đã huỷ' },
            ]}
          />
        </The>

        <The tieuDe={banRa ? 'Người mua' : 'Người bán'} bieuTuong={banRa ? 'nguoi' : 'nhaMay'}>
          <div className="hang-chon-doi-tac">
            <OChon
              nhan={banRa ? 'Khách hàng trong danh bạ' : 'Nhà cung cấp trong danh bạ'}
              value={(banRa ? hd.khachHangId : hd.nhaCungCapId) ?? ''}
              onChange={(v) => {
                const ds = banRa ? doiTac?.khach : doiTac?.ncc;
                const dt = ds?.find((x) => x.id === v);
                if (!v) doi(banRa ? { khachHangId: null } : { nhaCungCapId: null });
                else chonDoiTac(dt);
              }}
              trong="— Không chọn —"
              luaChon={((banRa ? doiTac?.khach : doiTac?.ncc) ?? []).map((x) => ({ giaTri: x.id, nhan: x.tenCongTy }))}
            />
            <button type="button" className="nut nut-vien" onClick={() => setThemDoiTac(true)}>
              <BieuTuong ten="them" /> Thêm mới
            </button>
          </div>
          <OChu nhan="Tên đơn vị trên hoá đơn" value={hd.tenDoiTac} onChange={(tenDoiTac) => doi({ tenDoiTac })} />
          <div className="luoi-2">
            <OChu nhan="Mã số thuế" value={hd.maSoThueDoiTac} onChange={(maSoThueDoiTac) => doi({ maSoThueDoiTac })} inputMode="numeric" />
            <OChu nhan="Địa chỉ" value={hd.diaChiDoiTac} onChange={(diaChiDoiTac) => doi({ diaChiDoiTac })} />
          </div>
        </The>

        <The tieuDe="Hàng hoá, dịch vụ" bieuTuong="danhSach">
          <div className="bang-cuon">
            <table className="bang-nhap">
              <thead>
                <tr>
                  <th>Tên hàng hoá, dịch vụ</th>
                  <th>ĐVT</th>
                  <th className="so">Số lượng</th>
                  <th className="so">Đơn giá</th>
                  <th className="so">Thành tiền</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {hd.danhSachDong.map((d, i) => (
                  <tr key={d.id}>
                    <td>
                      <input className="o-nhap" aria-label="Tên hàng" value={d.tenHang} onChange={(e) => doiDong(i, { tenHang: e.target.value })} />
                    </td>
                    <td className="cot-dvt">
                      <input className="o-nhap" aria-label="Đơn vị tính" list="ds-dvt-hoa-don" value={d.donViTinh} onChange={(e) => doiDong(i, { donViTinh: e.target.value })} />
                    </td>
                    <td className="cot-sl">
                      <OSo value={d.soLuong} onChange={(soLuong) => doiDong(i, { soLuong })} aria-label="Số lượng" />
                    </td>
                    <td className="cot-tien">
                      <OTien value={d.donGia} onChange={(donGia) => doiDong(i, { donGia })} aria-label="Đơn giá" />
                    </td>
                    <td className="so cot-tien">{dinhDangTien(thanhTien(d.soLuong, d.donGia), false)}</td>
                    <td>
                      <button type="button" className="nut-bieu-tuong do" aria-label="Xoá dòng" onClick={() => doi({ danhSachDong: hd.danhSachDong.filter((_, j) => j !== i) })}>
                        <BieuTuong ten="xoa" co={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <datalist id="ds-dvt-hoa-don">
              {cd.danhSachDonViTinh.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>
          <button type="button" className="nut nut-vien nut-them-dong" onClick={() => doi({ danhSachDong: [...hd.danhSachDong, dongTrong(cd.danhSachDonViTinh[0])] })}>
            <BieuTuong ten="them" /> Thêm dòng
          </button>
        </The>

        <The tieuDe="Tổng tiền" bieuTuong="tien">
          <BangTong
            tong={tong}
            chietKhau={hd.chietKhau}
            tyLeVAT={hd.tyLeVAT}
            luaChonVAT={cd.luaChonVAT}
            onDoiChietKhau={(chietKhau) => doi({ chietKhau })}
            onDoiVAT={(tyLeVAT) => doi({ tyLeVAT })}
            docSoTu={cd.docSoTu}
          />
          <OChu nhan="Ghi chú" value={hd.ghiChu} onChange={(ghiChu) => doi({ ghiChu })} nhieuDong />
        </The>

        {daCo && (
          <The
            tieuDe={banRa ? 'Tiền đã thu' : 'Tiền đã trả'}
            bieuTuong="tien"
            phai={<NhanThanhToan h={{ ...hd, tong: tong.tongThanhToan, daThanhToan: daTra }} />}
          >
            {!thanhToan?.length ? (
              <p className="goi-y-nho">Chưa có phiếu {banRa ? 'thu' : 'chi'} nào cho hoá đơn này.</p>
            ) : (
              <ul className="ds-don">
                {thanhToan.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="dong-don" onClick={() => setPhieu({ p, moi: false })}>
                      <span className="dong-don-ten">
                        <strong>{p.soPhieu}</strong>
                        <small>
                          {dinhDangNgay(p.ngay)} · {NHAN_HINH_THUC[p.hinhThuc]} {p.noiDung && `· ${p.noiDung}`}
                        </small>
                      </span>
                      <span className="dong-don-gia">{dinhDangTien(p.soTien)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </The>
        )}

        {daCo ? (
          <The tieuDe="File hoá đơn" bieuTuong="tep">
            <p className="goi-y-nho">Đính kèm file PDF, XML hoá đơn điện tử hoặc ảnh chụp (tối đa 15 MB mỗi file).</p>
            {!!tep?.length && (
              <ul className="ds-don cach-duoi">
                {tep.map((t) => (
                  <li key={t.id} className="dong-co-sap-xep">
                    <button
                      type="button"
                      className="dong-don"
                      onClick={async () => {
                        try {
                          taiFile(await apiCms.hoaDon.taiTep(t.id), t.tenFile);
                        } catch (e) {
                          thongBao((e as Error).message, 'loi');
                        }
                      }}
                    >
                      <BieuTuong ten="tai" co={20} />
                      <span className="dong-don-ten">
                        <strong>{t.tenFile}</strong>
                        <small>{dinhDangKichThuoc(t.kichThuoc)}</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="nut-bieu-tuong do"
                      aria-label={`Xoá file ${t.tenFile}`}
                      onClick={async () => (await xacNhan(`Xoá file "${t.tenFile}"?`, { nutDongY: 'Xoá' })) && apiCms.hoaDon.xoaTep(t.id)}
                    >
                      <BieuTuong ten="xoa" co={20} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input ref={oTep} type="file" multiple hidden accept=".pdf,.xml,image/*" onChange={(e) => void themTep(e.target.files).then(() => (e.target.value = ''))} />
            <button type="button" className="nut nut-vien nut-rong" onClick={() => oTep.current?.click()}>
              <BieuTuong ten="tep" /> Đính kèm file
            </button>
          </The>
        ) : (
          <p className="goi-y-nho">Sau khi nhập thông tin (hoá đơn được lưu), có thể ghi tiền thanh toán và đính kèm file.</p>
        )}
      </div>

      {phieu && <HopThoaiPhieu banDau={phieu.p} moi={phieu.moi} coDinhLoai onDong={() => setPhieu(null)} />}
      {themDoiTac &&
        (banRa ? (
          <HopThoaiKhachHang tenBanDau={hd.tenDoiTac} onDong={() => setThemDoiTac(false)} onDaLuu={(k) => chonDoiTac(k)} />
        ) : (
          <HopThoaiNhaCungCap banDau={nhaCungCapTrong(hd.tenDoiTac)} moi onDong={() => setThemDoiTac(false)} onDaLuu={(n) => chonDoiTac(n)} />
        ))}
    </TrangSoan>
  );
}
