import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  PresaleMode,
  PresaleProgram,
  PresaleRegistryArgs,
  UnsoldTokenAction,
  WhitelistMode,
} from "../../type";

export * from "./initialize_fcfs_presale";
export * from "./initialize_fixed_price_presale";
export * from "./initialize_prorata_presale";

export type IPresaleRegistryArgsWithoutPadding = Omit<
  PresaleRegistryArgs,
  "padding"
>;

export interface IPresaleArgs {
  presaleMaximumCap: BN;
  presaleMinimumCap: BN;
  presaleStartTime: BN;
  presaleEndTime: BN;
  whitelistMode: WhitelistMode;
  unsoldTokenAction: UnsoldTokenAction;
  presaleMode: PresaleMode;
}

export interface ILockedVestingArgs {
  lockDuration: BN;
  vestDuration: BN;
}

export interface ICreateInitializePresaleIxParams {
  program: PresaleProgram;
  presaleArgs: Omit<IPresaleArgs, "presaleMode">;
  lockedVestingArgs?: ILockedVestingArgs;
  presaleRegistries: IPresaleRegistryArgsWithoutPadding[];
  basePubkey: PublicKey;
  baseMintPubkey: PublicKey;
  quoteMintPubkey: PublicKey;
  creatorPubkey: PublicKey;
  feePayerPubkey: PublicKey;
}
