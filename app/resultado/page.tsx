"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Row } from "@/lib/rank";

type Data = { total: number; rows: Row[]; persistent: boolean };

export default function ResultPage() {
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/votes")
        .then((r) => r.json())
        .then((d) => alive && (setData(d), setFailed(false)))
        .catch(() => alive && setFailed(true));
    load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const n = data?.total ?? 0;

  return (
    <main>
      <h1>Ranking geral</h1>
      <p className="sub">
        {!data ? "Carregando…" : n === 0 ? "Ainda não há votos." : `${n} ${n === 1 ? "pessoa votou" : "pessoas votaram"}. Atualiza sozinho.`}
      </p>
      <nav>
        <Link href="/">Meu ranking</Link>
        <Link href="/resultado" className="on">Ranking geral</Link>
      </nav>

      <ol>
        {data?.rows.map((r, i) => (
          <li key={r.name}>
            <span className="pos">{i + 1}</span>
            <div className="rw">
              <div className="top">
                <span>{r.name}</span>
                <span className="meta">
                  {r.avg === null ? "sem votos" : `posição média ${r.avg.toFixed(2).replace(".", ",")} · ${r.firsts} × 1º`}
                </span>
              </div>
              <div className="bar">
                <i style={{ width: r.avg === null ? "0%" : `${((10 - r.avg) / 9) * 100}%` }} />
              </div>
            </div>
          </li>
        ))}
      </ol>
      {failed && <p className="note">Sem conexão com o servidor. Tentando de novo…</p>}
      {data && !data.persistent && (
        <p className="note">Votos guardados só na memória do servidor: podem zerar quando ele reiniciar.</p>
      )}
    </main>
  );
}
