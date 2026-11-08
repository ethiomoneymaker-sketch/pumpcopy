import { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { RPC_ENDPOINT, FEE_WALLET, FEES } from "./config";

const connection = new Connection(RPC_ENDPOINT, "confirmed");

async function payFee(payer: PublicKey, lamports: number) {
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: payer, toPubkey: FEE_WALLET, lamports }));
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash; tx.feePayer = payer;
  const s = await (window as any).solana.signTransaction(tx);
  await connection.confirmTransaction(await connection.sendRawTransaction(s.serialize()));
}

export async function addLiquidity(
  payer: PublicKey, tokenMint: PublicKey,
  tokenAmount: string, solAmount: number, decimals: number
): Promise<string> {
  const { Raydium, TxVersion } = await import("@raydium-io/raydium-sdk");
  const raydium = await Raydium.load({
    connection, owner: payer as any, cluster: "devnet", disableLoadToken: true,
  });

  await payFee(payer, FEES.addLiquidity);

  const { execute } = await raydium.cpmm.createPool({
    programId: new PublicKey("CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C"),
    mintA: { address: "So11111111111111111111111111111111111111112", decimals: 9 },
    mintB: { address: tokenMint.toBase58(), decimals },
    mintAAmount: BigInt(solAmount * LAMPORTS_PER_SOL),
    mintBAmount: BigInt(tokenAmount) * BigInt(10 ** decimals),
    startTime: BigInt(0), feeConfig: undefined, associatedOnly: false,
    ownerInfo: { useSOLBalance: true }, txVersion: TxVersion.V0,
  });
  const { txId } = await execute({ sendAndConfirm: true });
  return txId;
}

export async function removeLiquidity(payer: PublicKey, poolId: PublicKey): Promise<string> {
  const { Raydium, TxVersion } = await import("@raydium-io/raydium-sdk");
  const raydium = await Raydium.load({ connection, owner: payer as any, cluster: "devnet" });
  await payFee(payer, FEES.removeLiquidity);
  const { execute } = await raydium.cpmm.removeLiquidity({
    poolInfo: await raydium.cpmm.getPoolInfoFromRpc(poolId.toBase58()),
    lpAmount: 0, slippage: 0.01, txVersion: TxVersion.V0,
  });
  const { txId } = await execute({ sendAndConfirm: true });
  return txId;
}
