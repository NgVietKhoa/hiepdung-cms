import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';

/** Kéo sát mép trên/dưới màn hình (px) thì trang tự cuộn */
const VUNG_TU_CUON = 90;
/** Chừa thanh cố định dưới đáy (thanh tổng tiền / menu) khi tự cuộn xuống */
const CHUA_DAY = 80;

interface TrangThaiKeo {
  tu: number;
  den: number;
  /** Khoảng các mục khác phải dịch để nhường chỗ = cao mục đang kéo + khoảng cách giữa các mục */
  buoc: number;
}

interface PhienKeo extends TrangThaiKeo {
  muc: HTMLElement;
  /** Vị trí trên trang (đã cộng cuộn) của từng mục lúc bắt đầu kéo */
  viTri: { tren: number; cao: number }[];
  yBatDau: number;
  yHienTai: number;
  khung: number;
}

/**
 * Kéo thả đổi thứ tự một danh sách xếp dọc, bằng chuột hoặc ngón tay (pointer events), qua một tay nắm.
 * Mục đang kéo đi theo con trỏ, các mục khác dịch ra nhường chỗ; kéo sát mép màn hình thì tự cuộn.
 * Trên tay nắm, phím mũi tên lên/xuống cũng đổi chỗ được.
 *
 * `chonMuc`: bộ chọn CSS của mỗi mục (các mục phải là con trực tiếp của cùng một phần tử cha).
 */
export function useKeoTha({
  soMuc,
  chonMuc,
  onDiChuyen,
}: {
  soMuc: number;
  chonMuc: string;
  onDiChuyen: (tu: number, den: number) => void;
}) {
  const [keo, setKeo] = useState<TrangThaiKeo | null>(null);
  const phien = useRef<PhienKeo | null>(null);
  const cacTayNam = useRef(new Map<string, HTMLElement>());
  const giuFocus = useRef<string | null>(null);
  const diChuyen = useRef(onDiChuyen);
  diChuyen.current = onDiChuyen;

  // Đổi chỗ bằng phím thì giữ focus ở tay nắm của mục vừa chuyển
  useEffect(() => {
    if (!giuFocus.current) return;
    cacTayNam.current.get(giuFocus.current)?.focus();
    giuFocus.current = null;
  });

  // Rời trang giữa chừng khi đang kéo thì dọn dẹp
  useEffect(
    () => () => {
      if (phien.current) cancelAnimationFrame(phien.current.khung);
      document.body.classList.remove('dang-keo-tha');
    },
    [],
  );

  const capNhat = () => {
    const p = phien.current;
    if (!p) return;
    const dy = p.yHienTai + window.scrollY - p.yBatDau;
    p.muc.style.transform = `translateY(${dy}px)`;
    const tam = p.viTri[p.tu].tren + p.viTri[p.tu].cao / 2 + dy;
    let den = p.tu;
    for (let j = p.tu + 1; j < p.viTri.length; j++) if (tam > p.viTri[j].tren + p.viTri[j].cao / 2) den = j;
    for (let j = p.tu - 1; j >= 0; j--) if (tam < p.viTri[j].tren + p.viTri[j].cao / 2) den = j;
    if (den !== p.den) {
      p.den = den;
      setKeo({ tu: p.tu, den, buoc: p.buoc });
    }
  };

  const tuCuon = () => {
    const p = phien.current;
    if (!p) return;
    const tren = VUNG_TU_CUON - p.yHienTai;
    const duoi = p.yHienTai - (window.innerHeight - VUNG_TU_CUON - CHUA_DAY);
    if (tren > 0 || duoi > 0) {
      window.scrollBy(0, tren > 0 ? -Math.ceil(tren / 6) : Math.ceil(duoi / 6));
      capNhat();
    }
    p.khung = requestAnimationFrame(tuCuon);
  };

  const batDau = (i: number, e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || soMuc < 2) return;
    const muc = e.currentTarget.closest<HTMLElement>(chonMuc);
    const cha = muc?.parentElement;
    if (!muc || !cha) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const viTri = Array.from(cha.querySelectorAll<HTMLElement>(`:scope > ${chonMuc}`)).map((m) => {
      const r = m.getBoundingClientRect();
      return { tren: r.top + window.scrollY, cao: r.height };
    });
    const khoangCach = viTri[1].tren - (viTri[0].tren + viTri[0].cao);
    phien.current = {
      tu: i,
      den: i,
      buoc: viTri[i].cao + khoangCach,
      muc,
      viTri,
      yBatDau: e.clientY + window.scrollY,
      yHienTai: e.clientY,
      khung: requestAnimationFrame(tuCuon),
    };
    document.body.classList.add('dang-keo-tha');
    setKeo({ tu: i, den: i, buoc: phien.current.buoc });
  };

  const tha = (huy: boolean) => {
    const p = phien.current;
    if (!p) return;
    cancelAnimationFrame(p.khung);
    p.muc.style.transform = '';
    phien.current = null;
    document.body.classList.remove('dang-keo-tha');
    setKeo(null);
    if (!huy && p.den !== p.tu) diChuyen.current(p.tu, p.den);
  };

  /** Thuộc tính gắn vào nút tay nắm của mục thứ i (`khoa` để giữ focus sau khi đổi chỗ bằng phím) */
  const tayNam = (i: number, khoa: string) => ({
    ref: (el: HTMLElement | null) => {
      if (el) cacTayNam.current.set(khoa, el);
      else cacTayNam.current.delete(khoa);
    },
    disabled: soMuc < 2,
    onPointerDown: (e: PointerEvent<HTMLElement>) => batDau(i, e),
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (!phien.current) return;
      phien.current.yHienTai = e.clientY;
      capNhat();
    },
    onPointerUp: () => tha(false),
    onPointerCancel: () => tha(true),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      const den = i + (e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0);
      if (den === i) return;
      e.preventDefault();
      if (den < 0 || den >= soMuc) return;
      giuFocus.current = khoa;
      diChuyen.current(i, den);
    },
  });

  /** Kiểu cho mục thứ i trong lúc kéo: các mục nằm giữa vị trí cũ và mới dịch ra nhường chỗ */
  const kieuMuc = (i: number): CSSProperties | undefined => {
    if (!keo || i === keo.tu) return undefined;
    if (keo.tu < i && i <= keo.den) return { transform: `translateY(${-keo.buoc}px)` };
    if (keo.den <= i && i < keo.tu) return { transform: `translateY(${keo.buoc}px)` };
    return undefined;
  };

  return { dangKeo: keo !== null, laMucDangKeo: (i: number) => keo?.tu === i, tayNam, kieuMuc };
}

/** Chuyển phần tử từ vị trí `tu` sang `den`, trả về mảng mới */
export function chuyenViTri<T>(ds: T[], tu: number, den: number): T[] {
  const moi = [...ds];
  const [x] = moi.splice(tu, 1);
  moi.splice(den, 0, x);
  return moi;
}
