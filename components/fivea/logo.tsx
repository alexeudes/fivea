import Image from "next/image";
import logo from "@/public/brand/fivea-logo.png";

type LogoProps = {
  className?: string;
  size?: number;
};

// Fivea's standard logo — public/brand/fivea-logo.png (source: design/fivea_logo.png).
export function Logo({ className, size = 128 }: LogoProps) {
  return (
    <Image
      src={logo}
      alt="Fivea"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
