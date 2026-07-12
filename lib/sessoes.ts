// Próximas N datas de uma pelada recorrente, no fuso do servidor.
// ponytail: fuso do servidor por enquanto; fuso por grupo quando o app
// tiver grupos fora do Brasil de fato.
export function proximasSessoes(
  diaSemana: number,
  horario: string, // "HH:MM"
  frequencia: "semanal" | "quinzenal",
  quantidade = 4,
): Date[] {
  const [h, m] = horario.split(":").map(Number);
  const passo = frequencia === "quinzenal" ? 14 : 7;

  const d = new Date();
  d.setHours(h, m, 0, 0);
  // avança até o próximo dia_semana com horário ainda no futuro
  while (d.getDay() !== diaSemana || d.getTime() <= Date.now()) {
    d.setDate(d.getDate() + 1);
  }

  const datas: Date[] = [];
  for (let i = 0; i < quantidade; i++) {
    datas.push(new Date(d));
    d.setDate(d.getDate() + passo); // setDate preserva hora local através de DST
  }
  return datas;
}
