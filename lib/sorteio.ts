// Sorteio de times balanceando por posição preferida primeiro e por média
// de avaliação como critério secundário.

export type JogadorSorteio = {
  usuarioId: string;
  posicao: string | null;
  media: number | null;
};

// Goleiro primeiro (o mais crítico de distribuir), depois da defesa pro
// ataque; sem posição por último.
const ORDEM_POSICAO = ["goleiro", "zagueiro", "lateral", "volante", "meia", "atacante"];

export function sortearTimes<T extends JogadorSorteio>(
  jogadores: T[],
  numTimes: number,
): T[][] {
  // embaralha pra desempatar aleatoriamente entre iguais
  const pool = [...jogadores];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // posição na ordem de escassez; dentro dela, melhores primeiro
  pool.sort((a, b) => {
    const pa = a.posicao ? ORDEM_POSICAO.indexOf(a.posicao) : ORDEM_POSICAO.length;
    const pb = b.posicao ? ORDEM_POSICAO.indexOf(b.posicao) : ORDEM_POSICAO.length;
    if (pa !== pb) return pa - pb;
    return (b.media ?? 0) - (a.media ?? 0);
  });

  // guloso: cada jogador vai pro time com menos gente da posição dele;
  // empate → menos jogadores no total → menor soma de média
  const times: T[][] = Array.from({ length: numTimes }, () => []);
  const somaMedia = new Array(numTimes).fill(0);

  for (const jogador of pool) {
    let melhor = 0;
    for (let t = 1; t < numTimes; t++) {
      const naPosicao = (i: number) =>
        times[i].filter((j) => j.posicao === jogador.posicao).length;
      const diff =
        naPosicao(t) - naPosicao(melhor) ||
        times[t].length - times[melhor].length ||
        somaMedia[t] - somaMedia[melhor];
      if (diff < 0) melhor = t;
    }
    times[melhor].push(jogador);
    somaMedia[melhor] += jogador.media ?? 0;
  }
  return times;
}
