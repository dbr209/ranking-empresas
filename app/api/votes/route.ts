import { NextResponse } from "next/server";
import { COMPANIES } from "@/lib/companies";
import { computeRanking } from "@/lib/rank";
import { getVotes, isPersistent, saveVote } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const votes = await getVotes();
  const voterId = new URL(req.url).searchParams.get("voterId");
  return NextResponse.json({
    ...computeRanking(votes),
    mine: voterId ? votes[voterId] ?? null : null,
    persistent: isPersistent(),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const voterId = body?.voterId;
  const ranking = body?.ranking;

  const validId = typeof voterId === "string" && voterId.length >= 8 && voterId.length <= 64;
  const validRanking =
    Array.isArray(ranking) &&
    ranking.length === COMPANIES.length &&
    new Set(ranking).size === COMPANIES.length &&
    ranking.every((r) => typeof r === "string" && COMPANIES.includes(r));

  if (!validId || !validRanking) {
    return NextResponse.json({ error: "Voto inválido." }, { status: 400 });
  }
  await saveVote(voterId, ranking);
  return NextResponse.json({ ok: true });
}
