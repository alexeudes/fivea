import { Link } from "@/i18n/navigation";
import { Logo } from "./logo";
import { LocaleSwitcher } from "./locale-switcher";
import { PushBell } from "./push-bell";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-2">
        <Link href="/inicio" aria-label="Fivea">
          <Logo size={32} className="h-8 w-8 rounded-lg" />
        </Link>
        <div className="flex items-center gap-1">
          <PushBell />
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
