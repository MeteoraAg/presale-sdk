import { PublicKey } from "@solana/web3.js";
import * as PresaleIDL from "./idl/presale.json";

export * from "./pda";
export * from "./presale";
export * from "./info_processor";

export const PRESALE_PROGRAM_ID = new PublicKey(PresaleIDL.address);
export const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);
