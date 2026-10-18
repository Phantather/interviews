const PEAKS = [
  0, 24, 40, 20, 70, 22, 95, 12, 120, 17, 150, 6, 175, 14, 205, 9, 230, 18, 260, 4, 290, 13, 320, 8,
  350, 19, 380, 10, 410, 15, 440, 3, 470, 12, 500, 16, 530, 7, 560, 14, 590, 10, 620, 18, 640, 15,
];

const WIDTH = 640;
const HEIGHT = 30;

/** Силуэт горного хребта: заполняется цветом по мере продвижения по анкете. */
const PATH = (() => {
  let d = `M0,${HEIGHT} `;
  for (let i = 0; i < PEAKS.length; i += 2) d += `L${PEAKS[i]},${PEAKS[i + 1]} `;
  return `${d}L${WIDTH},${HEIGHT} Z`;
})();

export function RidgeProgress({ fraction }: { fraction: number }) {
  const clamped = Math.min(1, Math.max(0, fraction));
  return (
    <svg
      className="ridge"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="ridge-clip" className="ridge__clip">
          <rect x="0" y="0" width={(WIDTH * clamped).toFixed(1)} height={HEIGHT} />
        </clipPath>
      </defs>
      <path className="ridge__base" d={PATH} />
      <path className="ridge__fill" d={PATH} clipPath="url(#ridge-clip)" />
    </svg>
  );
}
