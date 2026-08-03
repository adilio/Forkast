type IconName =
  | 'book'
  | 'cart'
  | 'download'
  | 'settings'
  | 'plus'
  | 'wifi'
  | 'check'
  | 'calendar'
  | 'sun'
  | 'moon'
  | 'display'
  | 'log-out';

const paths: Record<IconName, string> = {
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H11a3 3 0 0 1 3 3v15a3 3 0 0 0-3-3H6.5A2.5 2.5 0 0 0 4 20.5zm16 0A2.5 2.5 0 0 0 17.5 3H14v18a3 3 0 0 1 3-3h.5a2.5 2.5 0 0 1 2.5 2.5z',
  cart: 'M3 4h2l2.4 10.4a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6m4 12h.01M18 20h.01',
  download: 'M12 3v12m0 0 5-5m-5 5-5-5M5 21h14',
  settings:
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm0-12v2m0 13v2m8.5-8.5h-2m-13 0h-2m14.5-6.5-1.4 1.4M7.4 16.6 6 18m12 0-1.4-1.4M7.4 7.4 6 6',
  plus: 'M12 5v14M5 12h14',
  wifi: 'M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01',
  check: 'm5 12 4 4L19 6',
  calendar:
    'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5zM4 10h16M8 3v4m8-4v4',
  sun: 'M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2M12 2v2.2M12 19.8V22M22 12h-2.2M4.2 12H2M19.07 4.93l-1.56 1.56M6.49 17.51l-1.56 1.56M19.07 19.07l-1.56-1.56M6.49 6.49 4.93 4.93',
  moon: 'M20.5 14.3A8.7 8.7 0 0 1 9.7 3.5a8.7 8.7 0 1 0 10.8 10.8z',
  display: 'M3 5.4h18v10.2H3zM9 20.4h6',
  'log-out': 'M10 4H5v16h5M14 8l4 4-4 4m4-4H9',
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={paths[name]} />
    </svg>
  );
}
