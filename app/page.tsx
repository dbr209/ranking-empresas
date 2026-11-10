"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COMPANIES } from "@/lib/companies";

function getVoterId(): string {
  let id = localStorage.getItem("voterId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("voterId", id);
  }
  return id;
}

export default function VotePage() {
  const [order, setOrder] = useState<string[]>(COMPANIES);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [already, setAlready] = useState(false);

  useEffect(() => {
    fetch(`/api/votes?voterId=${getVoterId()}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.mine)) {
          setOrder(d.mine);
          setAlready(true);
        }
      })
      .catch(() => {});
  }, []);

  function move(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    setStatus("idle");
  }

  async function send() {
    setStatus("sending");
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId: getVoterId(), ranking: order }),
      });
      setStatus(res.ok ? "done" : "error");
      if (res.ok) setAlready(true);
    } catch {
      setStatus("error");
    }
  }

  return (
    <main>
      <h1>Ranking de empresas</h1>
      <p className="sub">Coloque a sua preferida em 1º e a menos preferida em 10º.</p>
      <nav>
        <Link href="/" className="on">Meu ranking</Link>
        <Link href="/resultado">Ranking geral</Link>
      </nav>

      <ol>
        {order.map((name, i) => (
          <li key={name}>
            <span className="pos">{i + 1}</span>
            <span className="nm">{name}</span>
            <span className="mv">
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Subir ${name}`}>↑</button>
              <button onClick={() => move(i, 1)} disabled={i === order.length - 1} aria-label={`Descer ${name}`}>↓</button>
            </span>
          </li>
        ))}
      </ol>

      <button className="send" onClick={send} disabled={status === "sending"}>
        {status === "sending" ? "Enviando…" : already ? "Atualizar meu ranking" : "Enviar meu ranking"}
      </button>
      <p className="note" role="status">
        {status === "done" && "Ranking enviado. Veja o resultado em “Ranking geral”."}
        {status === "error" && "Não foi possível enviar. Tente de novo."}
        {status === "idle" && already && "Você já votou neste aparelho. Pode ajustar e reenviar."}
      </p>
    </main>
  );
}
