export const Loader = ({ size = 48 }: { size?: number }) => (
  <div class="ck-loader" style={`width:${size}px;height:${size}px`}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="32"
        cy="32"
        r="28"
        stroke="var(--border-default)"
        stroke-width="3"
        fill="none"
        opacity="0.3"
      />
      <path
        d="M32 4 a28 28 0 0 1 28 28"
        stroke="var(--accent-500)"
        stroke-width="3"
        stroke-linecap="round"
        fill="none"
        class="ck-loader-ring"
      />
      <g transform="translate(32, 32)" class="ck-loader-crown">
        <path
          d="M-10,-4 L-10,6 L10,6 L10,-4 L6,-1 L3,-7 L0,-3 L-3,-7 L-6,-1 Z"
          fill="var(--accent-500)"
        />
        <rect x="-10" y="6" width="20" height="3" rx="1.5" fill="var(--accent-400)" />
        <circle cx="-6" cy="-1" r="1.5" fill="var(--accent-400)" />
        <circle cx="0" cy="-3" r="2" fill="var(--accent-400)" />
        <circle cx="6" cy="-1" r="1.5" fill="var(--accent-400)" />
      </g>
    </svg>
  </div>
);
