import { COMPANIES } from "./companies";
import type { VoteMap } from "./store";

export type Row = { name: string; avg: number | null; firsts: number };

export function computeRanking(votes: VoteMap): { total: number; rows: Row[] } {
  const lists = Object.values(votes);
  const rows = COMPANIES.map((name) => {
    let sum = 0;
    let count = 0;
    let firsts = 0;
    for (const list of lists) {
      const i = list.indexOf(name);
      if (i < 0) continue;
      sum += i + 1;
      count++;
      if (i === 0) firsts++;
    }
    return { name, avg: count ? sum / count : null, firsts };
  });
  rows.sort((a, b) => (a.avg ?? 99) - (b.avg ?? 99) || b.firsts - a.firsts);
  return { total: lists.length, rows };
}
