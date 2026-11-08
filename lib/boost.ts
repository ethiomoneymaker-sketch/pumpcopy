import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { RPC_ENDPOINT, FEE_WALLET, FEES } from "./config";

const connection = new Connection(RPC_ENDPOINT, "confirmed");

export async function boost(payer: PublicKey, mint: PublicKey): Promise<string> {
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: payer, toPubkey: FEE_WALLET, lamports: FEES.boost }));
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash; tx.feePayer = payer;
  const signed = await (window as any).solana.signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(sig, "confirmed");
  return sig;
}

export async function cloneTrending(
  payer: PublicKey, sourceMint: PublicKey
): Promise<{ mint: string }> {
  const { createToken } = await import("./createToken");
  const { Metadata, PROGRAM_ID } = await import("@metaplex-foundation/mpl-token-metadata");
  const conn = new Connection(RPC_ENDPOINT, "confirmed");
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), PROGRAM_ID.toBuffer(), sourceMint.toBuffer()], PROGRAM_ID);
  const acct = await conn.getAccountInfo(pda);
  if (!acct) throw new Error("source token has no metadata");
  const md = Metadata.deserialize(acct.data)[0];
  const off = await (await fetch(md.data.uri)).json();

  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: payer, toPubkey: FEE_WALLET, lamports: FEES.copyTrending }));
  const { blockhash } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash; tx.feePayer = payer;
  const s = await (window as any).solana.signTransaction(tx);
  await conn.confirmTransaction(await conn.sendRawTransaction(s.serialize()));

  return createToken(payer, {
    name: md.data.name, symbol: md.data.symbol, decimals: 9, supply: "1000000000",
    description: off.description ?? "", image: null,
    revokeFreeze: true, revokeMint: true, revokeUpdate: true,
  });
}
