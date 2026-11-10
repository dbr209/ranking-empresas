// Armazenamento dos votos: um voto por votante (voterId -> ranking).
// Padrão: memória do servidor. Se as variáveis do Upstash Redis existirem, usa Redis.

export type VoteMap = Record<string, string[]>;

const KEY = "ranking:votes";
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

export const usingRedis = Boolean(url && token);

const g = globalThis as unknown as { __votes?: VoteMap };
const memory: VoteMap = (g.__votes ??= {});

async function redis(command: string[]): Promise<unknown> {
  const res = await fetch(url!, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis respondeu ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

export async function saveVote(voterId: string, ranking: string[]): Promise<void> {
  if (usingRedis) {
    await redis(["HSET", KEY, voterId, JSON.stringify(ranking)]);
  } else {
    memory[voterId] = ranking;
  }
}

export async function getVotes(): Promise<VoteMap> {
  if (!usingRedis) return { ...memory };
  const flat = ((await redis(["HGETALL", KEY])) as string[] | null) ?? [];
  const votes: VoteMap = {};
  for (let i = 0; i < flat.length; i += 2) {
    try {
      votes[flat[i]] = JSON.parse(flat[i + 1]);
    } catch {}
  }
  return votes;
}
