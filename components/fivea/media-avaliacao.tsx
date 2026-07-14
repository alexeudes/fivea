// Média agregada estilo scoreboard (IBM Plex Mono, uma casa decimal).
// Nunca recebe notas individuais — só o retorno de media_avaliacao_jogador().
export function MediaAvaliacao({ media, label }: { media: number | null; label: string }) {
  if (media == null) return null;
  return (
    <span
      aria-label={label}
      className="font-mono text-sm font-medium text-cone-yellow"
    >
      ★ {media.toFixed(1)}
    </span>
  );
}
