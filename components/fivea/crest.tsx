type CrestProps = {
  className?: string;
};

// Full crest, per the "Assinatura" section of design/fivea-identidade-visual.html.
export function Crest({ className }: CrestProps) {
  return (
    <svg
      viewBox="0 0 220 220"
      className={className}
      role="img"
      aria-label="Fivea"
    >
      <path
        d="M110 10 L204 46 V120 C204 168 163 202 110 214 C57 202 16 168 16 120 V46 Z"
        fill="none"
        stroke="#FF5A2E"
        strokeWidth="3"
      />
      <text
        x="50%"
        y="63%"
        textAnchor="middle"
        fontFamily="var(--font-big-shoulders)"
        fontWeight="900"
        fontSize="150"
        fill="#F5F6F2"
      >
        5
      </text>
      <circle cx="97" cy="132" r="19" fill="#FF5A2E" />
      <circle cx="97" cy="132" r="19" fill="none" stroke="#0E1B2A" strokeWidth="1.5" />
      <path
        d="M50 168 Q110 190 170 168"
        fill="none"
        stroke="#FFC93C"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="1 10"
      />
    </svg>
  );
}
