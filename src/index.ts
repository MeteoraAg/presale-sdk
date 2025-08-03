import { PublicKey } from "@solana/web3.js";
import * as PresaleIDL from "./idl/presale.json";

export * from "./pda";
export * from "./presale";
export * from "./instructions";

export const PRESALE_PROGRAM_ID = new PublicKey(PresaleIDL.address);
export const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);
export const METAPLEX_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);
