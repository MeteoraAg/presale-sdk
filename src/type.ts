import { IdlAccounts, IdlTypes, Program, BN } from "@coral-xyz/anchor";
import type { Presale as PresaleTypes } from "./idl/presale";
import { AccountMeta } from "@solana/web3.js";

export type PresaleProgram = Program<PresaleTypes>;
export type PresaleAccount = IdlAccounts<PresaleTypes>["presale"];
export type RemainingAccountInfo =
  IdlTypes<PresaleTypes>["remainingAccountsInfo"];

export enum UnsoldTokenAction {
  Refund = 0,
  Burn = 1,
}

export enum Rounding {
  Up,
  Down,
}

export enum WhitelistMode {
  Permissionless,
  PermissionWithMerkleProof,
  PermissionWithAuthority,
}

export enum PresaleMode {
  FixedPrice,
  Prorata,
  Fcfs,
}

export enum AccountsType {
  TransferHookBase = 0,
  TransferHookQuote = 1,
}

export interface MerkleProofResponse {
  merkle_root_config: string;
  proof: number[][];
}

export enum PresaleProgress {
  NotStarted,
  Ongoing,
  Completed,
  Failed,
}

export interface TransferHookAccountInfo {
  slices: { accountTypes: AccountsType; length: number }[];
  extraAccountMetas: AccountMeta[];
}
