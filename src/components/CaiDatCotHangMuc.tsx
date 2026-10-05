import { useEffect, useState } from 'react';
import { api } from '../db/api';
import { napCotHangMucCache } from '../db/hooks';
import type { CotHangMuc } from '../db/kieu';
import { beRongCotMoi } from '../lib/cotHangMuc';
import { taoId } from '../lib/id';
import { useTuLuu } from '../lib/useTuLuu';
import { chuyenViTri, useKeoTha } from '../lib/useKeoTha';
import { BieuTuong } from './BieuTuong';
import { useGiaoTiep } from './HopThoai';
import { NhanLuu } from './KhungTrang';
import { ChonMot, OChu } from './ONhap';

/**
 * Cài đặt cột của bảng nhập hạng mục (bảng cot_hang_muc): tiêu đề, chữ gợi ý, ẩn/hiện, thêm / xoá cột,
 * kéo thả đổi thứ tự. Mọi thay đổi tự lưu lên máy chủ.
 */
export function CaiDatCotHangMuc() {
  const { xacNhan } = useGiaoTiep();
  const [ds, setDs] = useState<CotHangMuc[]>();
  const [loiTai, setLoiTai] = useState('');

  useEffect(() => {
    api.cotHangMuc
      .ds()
      .then(setDs)
      .catch((e: Error) => setLoiTai(e.message));
  }, []);

  const { trangThai, thongDiepLoi } = useTuLuu(ds, (v) => api.cotHangMuc.luu(v, { baoThayDoi: false }).then(napCotHangMucCache));
  const { dangKeo, laMucDangKeo, tayNam, kieuMuc } = useKeoTha({
    soMuc: ds?.length ?? 0,
    chonMuc: '.cai-dat-cot',
    onDiChuyen: (tu, den) => setDs((c) => c && chuyenViTri(c, tu, den)),
  });

  if (loiTai) return <p className="canh-bao-loi">Không tải được danh sách cột: {loiTai}</p>;
  if (!ds) return <p className="dang-tai">Đang tải…</p>;

  const doi = (id: string, thayDoi: Partial<CotHangMuc>) =>
    setDs((c) => c?.map((x) => (x.id === id ? { ...x, ...thayDoi } : x)));
  const themCot = () =>
    setDs((c) => [
      ...(c ?? []),
      {
        id: taoId(),
        truong: null,
        tieuDe: '',
        goiY: '',
        kieu: 'chu',
        an: false,
        batBuoc: false,
        ...beRongCotMoi('chu'),
        thuTu: c?.length ?? 0,
      },
    ]);
  const xoaCot = async (c: CotHangMuc) => {
    if (
      await xacNhan(
        `Xoá cột "${c.tieuDe || 'chưa đặt tên'}"?\nCột sẽ biến mất khỏi mọi báo giá. Nếu chỉ muốn tạm giấu, hãy bỏ tích “Hiện”.`,
        { nutDongY: 'Xoá cột' },
      )
    )
      setDs((ds) => ds?.filter((x) => x.id !== c.id));
  };

  return (
    <>
      <div className="hang-trang-thai-luu">
        <NhanLuu trangThai={trangThai} />
        {trangThai === 'loi' && <span className="chu-loi">{thongDiepLoi}</span>}
      </div>
      <p className="goi-y-nho">
        Kéo tay nắm ⠿ để đổi thứ tự cột. Đổi tên tiêu đề cột và chữ gợi ý mờ trong ô nhập. Bỏ tích “Hiện” để ẩn cột không
        dùng — các cột còn lại tự giãn ra cho cân. Dữ liệu đã nhập ở cột bị ẩn vẫn được giữ.
      </p>

      <div className={dangKeo ? 'ds-cai-dat-cot co-keo' : 'ds-cai-dat-cot'}>
        {ds.map((c, i) => {
          const tuThem = c.truong === null;
          return (
            <fieldset
              key={c.id}
              className={['cai-dat-cot', tuThem && 'cot-tu-tao', c.an && 'dang-an', laMucDangKeo(i) && 'dang-keo']
                .filter(Boolean)
                .join(' ')}
              style={kieuMuc(i)}
            >
              <button
                type="button"
                className="tay-nam"
                aria-label={`Cột ${c.tieuDe || i + 1}: kéo để đổi thứ tự, hoặc bấm phím mũi tên lên/xuống`}
                title="Kéo để đổi thứ tự cột"
                {...tayNam(i, c.id)}
              >
                <BieuTuong ten="keoTha" co={22} />
              </button>
              <legend>
                {c.tieuDe || <i>Chưa đặt tên</i>}
                {tuThem && <span className="nhan-cot-tu-them">cột tự thêm</span>}
              </legend>

              {c.batBuoc ? (
                <span className="o-hien cot-bat-buoc">Luôn hiện</span>
              ) : (
                <label className={`o-tich o-hien ${c.an ? '' : 'dang-chon'}`}>
                  <input type="checkbox" checked={!c.an} onChange={() => doi(c.id, { an: !c.an })} />
                  Hiện
                </label>
              )}

              {!c.an && (
                <>
                  <div className="o-tieu-de">
                    <OChu
                      nhan="Tiêu đề cột"
                      value={c.tieuDe}
                      onChange={(tieuDe) => doi(c.id, { tieuDe })}
                      placeholder={tuThem ? 'vd: Xuất xứ, Bảo hành' : undefined}
                      maxLength={80}
                    />
                  </div>
                  {/* Cột Thành tiền chỉ hiện số tính ra, không có ô nhập nên không cần chữ gợi ý */}
                  {c.truong !== 'thanhTien' && (
                    <div className="o-goi-y-cot">
                      <OChu
                        nhan="Chữ gợi ý trong ô"
                        value={c.goiY}
                        onChange={(goiY) => doi(c.id, { goiY })}
                        placeholder="Để trống nếu không cần"
                        maxLength={80}
                      />
                    </div>
                  )}
                  {tuThem && (
                    <div className="o-kieu">
                      <ChonMot
                        nhan="Kiểu"
                        value={c.kieu}
                        onChange={(kieu) => doi(c.id, { kieu, ...beRongCotMoi(kieu) })}
                        luaChon={[
                          { giaTri: 'chu', nhan: 'Chữ' },
                          { giaTri: 'so', nhan: 'Số' },
                        ]}
                      />
                    </div>
                  )}
                </>
              )}
              {tuThem && (
                <button type="button" className="nut-nho do nut-xoa-cot" onClick={() => xoaCot(c)}>
                  <BieuTuong ten="xoa" co={20} /> Xoá cột
                </button>
              )}
            </fieldset>
          );
        })}
      </div>

      <button type="button" className="nut nut-vien nut-rong nut-them-cot" onClick={themCot}>
        <BieuTuong ten="them" /> Thêm cột
      </button>
    </>
  );
}
