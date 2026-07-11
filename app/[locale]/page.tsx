import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/fivea/logo";
import { Button } from "@/components/ui/button";

export default function Home() {
  const t = useTranslations("HomePage");

  return (
    <main className="flex flex-1 flex-col bg-ink-navy text-chalk">
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-10 px-6 py-20 text-center sm:py-28">
        <Logo size={144} className="h-28 w-28 rounded-3xl sm:h-36 sm:w-36" />

        <div className="space-y-4">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-cone-yellow">
            {t("eyebrow")}
          </p>
          <h1 className="font-heading text-5xl leading-[0.9] sm:text-7xl">
            {t("title")}
          </h1>
          <p className="mx-auto max-w-md text-base text-[#C7D0DA] sm:text-lg">
            {t("subtitle")}
          </p>
        </div>

        <Button
          size="lg"
          className="bg-whistle-orange text-chalk hover:bg-whistle-orange/90"
          render={<Link href="/cadastro" />}
        >
          {t("cta")}
        </Button>
      </section>
    </main>
  );
}
