import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  PresaleMode,
  PresaleProgram,
  UnsoldTokenAction,
  WhitelistMode,
} from "../../type";

export * from "./initialize_fcfs_presale";
export * from "./initialize_fixed_price_presale";
export * from "./initialize_prorata_presale";

export interface IPresaleArgs {
  presaleMaximumCap: BN;
  presaleMinimumCap: BN;
  presaleStartTime: BN;
  presaleEndTime: BN;
  whitelistMode: WhitelistMode;
  presaleMode: PresaleMode;
  unsoldTokenAction: UnsoldTokenAction;
}

export interface ILockedVestingArgs {
  immediateReleaseBps: BN;
  lockDuration: BN;
  vestDuration: BN;
}

export interface IPresaleRegistryArgs {
  buyerMinimumDepositCap: BN;
  buyerMaximumDepositCap: BN;
  presaleSupply: BN;
  depositFeeBps: BN;
}

export interface ICreateInitializePresaleIxParams {
  program: PresaleProgram;
  presaleArgs: Omit<IPresaleArgs, "presaleMode">;
  lockedVestingArgs?: ILockedVestingArgs;
  basePubkey: PublicKey;
  baseMintPubkey: PublicKey;
  quoteMintPubkey: PublicKey;
  creatorPubkey: PublicKey;
  feePayerPubkey: PublicKey;
  presaleRegistriesArgs: IPresaleRegistryArgs[];
}
