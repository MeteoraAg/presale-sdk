import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export function derivePresale(
  mint: PublicKey,
  quote: PublicKey,
  base: PublicKey,
  programId: PublicKey
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("presale"),
      base.toBuffer(),
      mint.toBuffer(),
      quote.toBuffer(),
    ],
    programId
  )[0];
}

export function derivePresaleAuthority(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("presale_authority")],
    programId
  )[0];
}

export function deriveFixedPricePresaleExtraArgs(
  presale: PublicKey,
  programId: PublicKey
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("fixed_price_param"), presale.toBuffer()],
    programId
  )[0];
}

export function derivePresaleVault(
  presale: PublicKey,
  programId: PublicKey
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("base_vault"), presale.toBuffer()],
    programId
  )[0];
}

export function deriveQuoteTokenVault(
  presale: PublicKey,
  programId: PublicKey
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("quote_vault"), presale.toBuffer()],
    programId
  )[0];
}

export function deriveMerkleRootConfig(
  presale: PublicKey,
  programId: PublicKey,
  version: BN
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("merkle_root_config"),
      presale.toBuffer(),
      version.toArrayLike(Buffer, "le", 8),
    ],
    programId
  )[0];
}

export function deriveEscrow(
  presale: PublicKey,
  owner: PublicKey,
  programId: PublicKey
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), presale.toBuffer(), owner.toBuffer()],
    programId
  )[0];
}

export function deriveOperator(
  creator: PublicKey,
  operator: PublicKey,
  programId: PublicKey
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("operator"), creator.toBuffer(), operator.toBuffer()],
    programId
  )[0];
}

export function deriveMerkleProofMetadata(
  presale: PublicKey,
  programId: PublicKey
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("merkle_proof"), presale.toBuffer()],
    programId
  )[0];
}
