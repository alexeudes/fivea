"use client";

import { Button } from "@/components/ui/button";

// Envolve uma server action num form com confirmação nativa do browser.
export function ConfirmButton({
  action,
  confirmMessage,
  className,
  children,
}: {
  action: () => Promise<void>;
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <Button type="submit" variant="ghost" size="sm" className={className}>
        {children}
      </Button>
    </form>
  );
}
