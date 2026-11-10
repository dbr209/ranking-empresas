// Armazenamento dos votos: um voto por votante (voterId -> ranking).
// Ordem de escolha:
//   1. Upstash Redis, se as variáveis de ambiente existirem (serve para Vercel).
//   2. SQLite (arquivo), se o servidor puder gravar em disco (Render, Railway, VPS, local).
//   3. Memória do servidor, como último recurso (some ao reiniciar).
//
// O SQLite usa o módulo embutido do Node ("node:sqlite", Node 22.13 ou mais novo),
// então não precisa instalar nenhum pacote.

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export type VoteMap = Record<string, string[]>;

const KEY = "ranking:votes";
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const useRedis = Boolean(url && token);

type Statement = { run(...args: unknown[]): unknown; all(...args: unknown[]): unknown[] };
type Db = { exec(sql: string): void; prepare(sql: string): Statement };

const g = globalThis as unknown as { __votes?: VoteMap; __db?: Db | null };
const memory: VoteMap = (g.__votes ??= {});

function openSqlite(): Db | null {
  try {
    // getBuiltinModule evita que o bundler do Next tente empacotar o módulo.
    const sqlite = (process as unknown as {
      getBuiltinModule?: (id: string) => { DatabaseSync: new (path: string) => Db } | undefined;
    }).getBuiltinModule?.("node:sqlite");
    if (!sqlite) return null;

    const file = process.env.DB_PATH ?? join(process.cwd(), "data", "votes.db");
    mkdirSync(dirname(file), { recursive: true });
    const db = new sqlite.DatabaseSync(file);
    db.exec(
      `PRAGMA journal_mode = WAL;
       CREATE TABLE IF NOT EXISTS votes (
         voter_id   TEXT PRIMARY KEY,
         ranking    TEXT NOT NULL,
         updated_at INTEGER NOT NULL
       );`
    );
    return db;
  } catch {
    // Disco somente leitura (ex.: Vercel) ou Node antigo: cai para a memória.
    return null;
  }
}

function sqlite(): Db | null {
  if (g.__db === undefined) g.__db = openSqlite();
  return g.__db;
}

export type Backend = "redis" | "sqlite" | "memory";

export function backend(): Backend {
  if (useRedis) return "redis";
  return sqlite() ? "sqlite" : "memory";
}

/** true quando os votos sobrevivem a reinícios do servidor. */
export function isPersistent(): boolean {
  return backend() !== "memory";
}

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
  const b = backend();
  if (b === "redis") {
    await redis(["HSET", KEY, voterId, JSON.stringify(ranking)]);
  } else if (b === "sqlite") {
    sqlite()!
      .prepare(
        `INSERT INTO votes (voter_id, ranking, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(voter_id) DO UPDATE SET ranking = excluded.ranking, updated_at = excluded.updated_at`
      )
      .run(voterId, JSON.stringify(ranking), Date.now());
  } else {
    memory[voterId] = ranking;
  }
}

export async function getVotes(): Promise<VoteMap> {
  const b = backend();
  const votes: VoteMap = {};

  if (b === "redis") {
    const flat = ((await redis(["HGETALL", KEY])) as string[] | null) ?? [];
    for (let i = 0; i < flat.length; i += 2) {
      try {
        votes[flat[i]] = JSON.parse(flat[i + 1]);
      } catch {}
    }
    return votes;
  }

  if (b === "sqlite") {
    const rows = sqlite()!.prepare("SELECT voter_id, ranking FROM votes").all() as {
      voter_id: string;
      ranking: string;
    }[];
    for (const r of rows) {
      try {
        votes[r.voter_id] = JSON.parse(r.ranking);
      } catch {}
    }
    return votes;
  }

  return { ...memory };
}
