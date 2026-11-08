import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { createSetAuthorityInstruction, AuthorityType, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { RPC_ENDPOINT, FEE_WALLET, FEES } from "./config";

const connection = new Connection(RPC_ENDPOINT, "confirmed");
type Which = "mint" | "freeze";

export async function revokeAuthority(payer: PublicKey, mint: PublicKey, which: Which) {
  const fee = which === "mint" ? FEES.revokeMint : FEES.revokeFreeze;
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: payer, toPubkey: FEE_WALLET, lamports: fee }),
    createSetAuthorityInstruction(mint, payer,
      which === "mint" ? AuthorityType.MintTokens : AuthorityType.FreezeAccount,
      null, [], TOKEN_PROGRAM_ID),
  );
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;
  const signed = await (window as any).solana.signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(sig, "confirmed");
  return sig;
}
