export interface WisdomQuote {
  text: string;
  source: string;
}

const wisdomQuotes: WisdomQuote[] = [
  { text: "Os planos bem elaborados levam à fartura.", source: "Provérbios 21:5" },
  { text: "O dinheiro ganho com desonestidade diminuirá.", source: "Provérbios 13:11" },
  { text: "Quem ama o dinheiro jamais terá o suficiente.", source: "Eclesiastes 5:10" },
  { text: "É melhor ter pouco com o temor do Senhor do que riqueza com inquietação.", source: "Provérbios 15:16" }
];

export const getDailyWisdom = (): WisdomQuote => {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0];
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
      hash = ((hash << 5) - hash) + dateString.charCodeAt(i);
      hash |= 0;
  }
  return wisdomQuotes[Math.abs(hash) % wisdomQuotes.length];
};