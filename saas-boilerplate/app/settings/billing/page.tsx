"use client";

import { useState } from "react";

export default function BillingPage() {
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);

  async function goToCheckout() {
    setLoading("checkout");
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
    setLoading(null);
  }

  async function openPortal() {
    setLoading("portal");
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
    setLoading(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Facturation</h1>
      <div className="flex gap-3">
        <button
          onClick={goToCheckout}
          disabled={loading !== null}
          className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          S'abonner
        </button>
        <button
          onClick={openPortal}
          disabled={loading !== null}
          className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100 disabled:opacity-50"
        >
          Gérer mon abonnement
        </button>
      </div>
    </div>
  );
}
