"use client";
import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { feeSol } from "@/lib/fee";
import { createToken } from "@/lib/createToken";

export type TokenForm = {
  name: string; symbol: string; decimals: number; supply: string;
  description: string; image: File | null;
  revokeFreeze: boolean; revokeMint: boolean; revokeUpdate: boolean;
};

const initial: TokenForm = {
  name: "", symbol: "", decimals: 9, supply: "1000000",
  description: "", image: null,
  revokeFreeze: false, revokeMint: false, revokeUpdate: false,
};

export default function Home() {
  const { publicKey, connected } = useWallet();
  const [form, setForm] = useState<TokenForm>(initial);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ mint: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const revokeCount = Number(form.revokeFreeze) + Number(form.revokeMint) + Number(form.revokeUpdate);
  const totalFee = feeSol("create") + revokeCount * 0.1;

  async function launch() {
    if (!publicKey || !connected) return;
    setBusy(true); setErr(null);
    try {
      const { mint } = await createToken(publicKey, form);
      setResult({ mint });
    } catch (e) { setErr(String(e)); }
    finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-xl p-6 space-y-4">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">pumpcopy ⚡</h1>
        <div className="flex gap-2 items-center">
          <Link className="text-sm underline opacity-80" href="/manage">manage</Link>
          <WalletMultiButton />
        </div>
      </header>

      <p className="text-sm opacity-70">Launch your own coin fast. No coding required.</p>

      <input className="input" placeholder="Token name"
        value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <input className="input" placeholder="Symbol (max 8)" maxLength={8}
        value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })} />
      <select className="input" value={form.decimals}
        onChange={e => setForm({ ...form, decimals: Number(e.target.value) })}>
        <option value={0}>0 — whitelist / NFT-style</option>
        <option value={5}>5 — utility</option>
        <option value={9}>9 — meme (default)</option>
      </select>
      <input className="input" placeholder="Supply" value={form.supply}
        onChange={e => setForm({ ...form, supply: e.target.value })} />
      <textarea className="input" placeholder="Description" value={form.description}
        onChange={e => setForm({ ...form, description: e.target.value })} />
      <input className="input" type="file" accept="image/png,image/jpeg"
        onChange={e => setForm({ ...form, image: e.target.files?.[0] ?? null })} />

      <fieldset className="card">
        <legend className="px-1 text-sm">Optional authority revokes (+0.1 SOL each)</legend>
        {(["revokeFreeze", "revokeMint", "revokeUpdate"] as const).map(k => (
          <label key={k} className="block text-sm">
            <input type="checkbox" checked={form[k]}
              onChange={e => setForm({ ...form, [k]: e.target.checked })} /> {k}
          </label>
        ))}
      </fieldset>

      <div className="card text-sm">
        <div>Creation fee: <b>{feeSol("create")} SOL</b></div>
        {revokeCount > 0 && <div>Revoke add-ons: {revokeCount} × 0.1 SOL</div>}
        <div>Total: <b>{totalFee.toFixed(2)} SOL</b> → fee wallet</div>
      </div>

      <button className="btn w-full" disabled={!connected || busy} onClick={launch}>
        {busy ? "Minting…" : "Create Token"}
      </button>

      {result && (
        <div className="card text-sm">
          Minted: <code className="break-all">{result.mint}</code><br />
          <a className="underline" target="_blank" rel="noreferrer"
             href={`https://solscan.io/token/${result.mint}`}>View on Solscan ↗</a>
        </div>
      )}
      {err && <div className="card text-sm text-red-400 break-all">{err}</div>}
    </main>
  );
}
