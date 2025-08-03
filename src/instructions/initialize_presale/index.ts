import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { PresaleMode, PresaleProgram, WhitelistMode } from "../../type";

export * from "./initialize_fcfs_presale";
export * from "./initialize_fixed_price_presale";
export * from "./initialize_prorata_presale";

export interface ITokenomicArgs {
  presalePoolSupply: BN;
}

export interface IPresaleArgs {
  presaleMaximumCap: BN;
  presaleMinimumCap: BN;
  buyerMinimumDepositCap: BN;
  buyerMaximumDepositCap: BN;
  presaleStartTime: BN;
  presaleEndTime: BN;
  whitelistMode: WhitelistMode;
  presaleMode: PresaleMode;
}

export interface ILockedVestingArgs {
  lockDuration: BN;
  vestDuration: BN;
}

export interface ICreateInitializePresaleIxParams {
  program: PresaleProgram;
  tokenomicArgs: ITokenomicArgs;
  presaleArgs: Omit<IPresaleArgs, "presaleMode">;
  lockedVestingArgs?: ILockedVestingArgs;
  basePubkey: PublicKey;
  baseMintPubkey: PublicKey;
  quoteMintPubkey: PublicKey;
  creatorPubkey: PublicKey;
  feePayerPubkey: PublicKey;
}
