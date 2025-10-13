import { IdlAccounts, IdlTypes, Program } from "@coral-xyz/anchor";
import { AccountMeta, PublicKey } from "@solana/web3.js";
import type { Presale as PresaleTypes } from "./idl/presale";
import BN from "bn.js";

export type PresaleProgram = Program<PresaleTypes>;
export type RemainingAccountsSlice =
  IdlTypes<PresaleTypes>["remainingAccountsSlice"];
export type PresaleAccount = IdlAccounts<PresaleTypes>["presale"];
export type EscrowAccount = IdlAccounts<PresaleTypes>["escrow"];
export type PresaleRegistryArgs = IdlTypes<PresaleTypes>["presaleRegistryArgs"];
export type PresaleRegistry = IdlTypes<PresaleTypes>["presaleRegistry"];

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
  registry_index: number;
  deposit_cap: string;
  proof: number[][];
}

export interface PartialSignedTransactionResponse {
  serialized_transaction: number[];
}

export enum PresaleProgress {
  NotStarted,
  Ongoing,
  Completed,
  Failed,
}

export interface TransferHookAccountInfo {
  slices: RemainingAccountsSlice[];
  extraAccountMetas: AccountMeta[];
}

export const U64_MAX = new BN("18446744073709551615");
