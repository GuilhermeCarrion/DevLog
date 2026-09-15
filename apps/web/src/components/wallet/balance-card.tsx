"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useMe } from "@/hooks/use-auth";
import { formatBRL } from "@/lib/calc";

// Cartão de saldo (estilo cartão de crédito), com as cores do sistema.
// Saldo = total guardado (all-time, pagos). O olho mostra/oculta o valor.
export function BalanceCard({ value }: { value: number | undefined }) {
  const { data: me } = useMe();
  const [hidden, setHidden] = useState(false);

  // Lembra a preferência de mostrar/ocultar por navegador
  useEffect(() => {
    try {
      setHidden(localStorage.getItem("wallet:hideBalance") === "1");
    } catch {
      /* ignore */
    }
  }, []);
  function toggle() {
    setHidden((h) => {
      const next = !h;
      try {
        localStorage.setItem("wallet:hideBalance", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  // Separa reais e centavos para dar o mesmo destaque do cartão de referência
  const [reais, cents] = formatBRL(value ?? 0).split(",");

  return (
    <div
      className="relative flex aspect-[1.586/1] w-full flex-col justify-between overflow-hidden rounded-2xl p-5 text-white shadow-lg"
      style={{
        background:
          "radial-gradient(120% 120% at 85% 15%, #6f9a24 0%, #35471a 42%, #16181d 78%)",
      }}
    >
      {/* brilho lima no canto */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-30 blur-2xl"
        style={{ background: "#a3e635" }}
      />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-white/70">Saldo guardado</p>
          <p className="mt-1 font-mono text-3xl font-semibold">
            {hidden ? (
              <span className="tracking-widest">R$ ••••••</span>
            ) : (
              <>
                {reais}
                <span className="text-white/50">,{cents}</span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={toggle}
          title={hidden ? "Mostrar saldo" : "Ocultar saldo"}
          className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
        >
          {hidden ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>

      {/* chip */}
      <svg width="42" height="32" viewBox="0 0 42 32" className="opacity-70">
        <rect
          x="1"
          y="1"
          width="40"
          height="30"
          rx="5"
          fill="none"
          stroke="rgba(255,255,255,0.5)"
        />
        <path
          d="M14 1v30M28 1v30M1 11h13M28 11h13M1 21h13M28 21h13"
          stroke="rgba(255,255,255,0.4)"
        />
      </svg>

      <div className="flex items-end justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-white/60">
            Titular
          </p>
          <p className="truncate text-sm font-semibold uppercase">
            {me?.name ?? "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm tracking-widest text-white/80">
            4688 •••• 3493
          </p>
          <p className="text-[10px] text-white/60">Validade 03/2026</p>
        </div>
      </div>
    </div>
  );
}
