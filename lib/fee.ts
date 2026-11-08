import { SystemProgram, TransactionInstruction, PublicKey } from "@solana/web3.js";
import { FEE_WALLET, FEES, FeeKey } from "./config";

export function feeInstruction(payer: PublicKey, fee: FeeKey): TransactionInstruction {
  return SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: FEE_WALLET,
    lamports: FEES[fee],
  });
}

export function feeSol(fee: FeeKey): number {
  return FEES[fee] / 1_000_000_000;
}
