import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import {
  MINT_SIZE, TOKEN_PROGRAM_ID, getMinimumBalanceForRentExemptMint,
  createInitializeMintInstruction, createAssociatedTokenAccountInstruction,
  createMintToInstruction, getAssociatedTokenAddress,
  createSetAuthorityInstruction, AuthorityType,
} from "@solana/spl-token";
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import { RPC_ENDPOINT, FEE_WALLET, FEES } from "./config";

export type TokenForm = {
  name: string; symbol: string; decimals: number; supply: string;
  description: string; image: File | null;
  revokeFreeze: boolean; revokeMint: boolean; revokeUpdate: boolean;
};

const connection = new Connection(RPC_ENDPOINT, "confirmed");

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("image upload failed");
  return (await res.json()).uri;
}

async function buildMetadataUri(form: TokenForm, imageUri: string): Promise<string> {
  const res = await fetch("/api/metadata", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: form.name, symbol: form.symbol, description: form.description, image: imageUri,
    }),
  });
  if (!res.ok) throw new Error("metadata upload failed");
  return (await res.json()).uri;
}

export async function createToken(payer: PublicKey, form: TokenForm): Promise<{ mint: string }> {
  const mintKeypair = Keypair.generate();
  const lamports = await getMinimumBalanceForRentExemptMint(connection);
  const ata = await getAssociatedTokenAddress(mintKeypair.publicKey, payer);

  let feeLamports = FEES.create;
  if (form.revokeFreeze) feeLamports += FEES.revokeFreeze;
  if (form.revokeMint)   feeLamports += FEES.revokeMint;
  if (form.revokeUpdate) feeLamports += FEES.revokeUpdate;

  const tx = new Transaction();

  tx.add(SystemProgram.transfer({ fromPubkey: payer, toPubkey: FEE_WALLET, lamports: feeLamports }));

  tx.add(SystemProgram.createAccount({
    fromPubkey: payer, newAccountPubkey: mintKeypair.publicKey,
    space: MINT_SIZE, lamports, programId: TOKEN_PROGRAM_ID,
  }));
  tx.add(createInitializeMintInstruction(
    mintKeypair.publicKey, form.decimals, payer, payer, TOKEN_PROGRAM_ID));

  tx.add(createAssociatedTokenAccountInstruction(payer, ata, payer, mintKeypair.publicKey));

  tx.add(createMintToInstruction(
    mintKeypair.publicKey, ata, payer,
    BigInt(form.supply) * BigInt(10 ** form.decimals)));

  const imageUri = form.image ? await uploadImage(form.image) : "";
  const metadataUri = await buildMetadataUri(form, imageUri);
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID,
  );
  tx.add(createCreateMetadataAccountV3Instruction(
    { metadata: metadataPda, mint: mintKeypair.publicKey,
      mintAuthority: payer, payer, updateAuthority: payer },
    { createMetadataAccountArgsV3: {
        data: { name: form.name, symbol: form.symbol, uri: metadataUri,
          sellerFeeBasisPoints: 0, creators: null, collection: null, uses: null },
        isMutable: !form.revokeUpdate, collectionDetails: null } },
  ));

  if (form.revokeMint) tx.add(createSetAuthorityInstruction(
    mintKeypair.publicKey, payer, AuthorityType.MintTokens, null));
  if (form.revokeFreeze) tx.add(createSetAuthorityInstruction(
    mintKeypair.publicKey, payer, AuthorityType.FreezeAccount, null));

  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;
  tx.partialSign(mintKeypair);

  const signed = await (window as any).solana.signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(sig, "confirmed");
  return { mint: mintKeypair.publicKey.toBase58() };
}
