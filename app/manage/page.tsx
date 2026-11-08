"use client";
import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { revokeAuthority } from "@/lib/revoke";
import { boost, cloneTrending } from "@/lib/boost";
import { addLiquidity } from "@/lib/liquidity";

export default function Manage() {
  const { publicKey, connected } = useWallet();
  const [mint, setMint] = useState("");
  const [tokenAmount, setTokenAmount] = useState("1000000");
  const [solAmount, setSolAmount] = useState("1");
  const [log, setLog] = useState<string[]>([]);

  const push = (s: string) => setLog(l => [s, ...l]);
  const guard = () => { if (!publicKey || !connected) throw new Error("connect wallet first"); return publicKey; };
  const guardMint = () => { try { return new PublicKey(mint); } catch { throw new Error("bad mint address"); } };

  return (
    <main className="mx-auto max-w-xl p-6 space-y-4">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">manage token</h1>
        <div className="flex gap-2 items-center">
          <Link className="text-sm underline opacity-80" href="/">launch</Link>
          <WalletMultiButton />
        </div>
      </header>
      <input className="input" placeholder="Mint address" value={mint} onChange={e => setMint(e.target.value)} />

      <div className="grid grid-cols-2 gap-2">
        <button className="btn" onClick={async () => { try { push("revoke mint → " + await revokeAuthority(guard(), guardMint(), "mint")); } catch (e) { push(String(e)); } }}>Revoke Mint (0.1)</button>
        <button className="btn" onClick={async () => { try { push("revoke freeze → " + await revokeAuthority(guard(), guardMint(), "freeze")); } catch (e) { push(String(e)); } }}>Revoke Freeze (0.1)</button>
        <button className="btn" onClick={async () => { try { push("boost → " + await boost(guard(), guardMint())); } catch (e) { push(String(e)); } }}>Boost (0.35)</button>
        <button className="btn" onClick={async () => { try { const r = await cloneTrending(guard(), guardMint()); push("cloned → " + r.mint); } catch (e) { push(String(e)); } }}>Clone Trending (0.5)</button>
      </div>

      <div className="card space-y-2">
        <div className="text-sm font-semibold">Add Liquidity (Raydium, 0.3 SOL fee)</div>
        <input className="input" placeholder="token amount" value={tokenAmount} onChange={e => setTokenAmount(e.target.value)} />
        <input className="input" placeholder="SOL amount" value={solAmount} onChange={e => setSolAmount(e.target.value)} />
        <button className="btn" onClick={async () => {
          try {
            const sig = await addLiquidity(guard(), guardMint(), tokenAmount, Number(solAmount), 9);
            push("pool tx → " + sig);
          } catch (e) { push(String(e)); }
        }}>Create Pool</button>
      </div>

      <div className="card text-xs whitespace-pre-wrap">{log.join("\n") || "—"}</div>
    </main>
  );
}
