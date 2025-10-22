import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  IdlLockedVestingArgs,
  IdlPresaleArgs,
  PresaleMode,
  PresaleProgram,
  UnsoldTokenAction,
  WhitelistMode,
} from "../../type";

export * from "./initialize_fcfs_presale";
export * from "./initialize_fixed_price_presale";
export * from "./initialize_prorata_presale";

export const INITIALIZE_PRESALE_PARAMS_PADDING: number[] = new Array(4).fill(
  new BN(0)
);

export function toIdlPresaleParams(
  args: Omit<IPresaleArgs, "presaleMode">,
  presaleMode: PresaleMode
): IdlPresaleArgs {
  return {
    ...args,
    disableEarlierPresaleEndOnceCapReached: Number(
      args.disableEarlierPresaleEndOnceCapReached
    ),
    presaleMode,
    padding: new Array(4).fill(new BN(0)),
  };
}

export function toIdlLockedVestingParams(
  lockedVestingArgs?: ILockedVestingArgs
): IdlLockedVestingArgs {
  const padding = new Array(4).fill(new BN(0));
  return lockedVestingArgs
    ? {
        ...lockedVestingArgs,
        immediatelyReleaseBps: lockedVestingArgs.immediateReleaseBps.toNumber(),
        padding,
      }
    : {
        immediatelyReleaseBps: 0,
        lockDuration: new BN(0),
        vestDuration: new BN(0),
        padding,
        immediateReleaseTimestamp: new BN(0),
      };
}

export interface IPresaleArgs {
  presaleMaximumCap: BN;
  presaleMinimumCap: BN;
  presaleStartTime: BN;
  presaleEndTime: BN;
  whitelistMode: WhitelistMode;
  presaleMode: PresaleMode;
  unsoldTokenAction: UnsoldTokenAction;
  disableEarlierPresaleEndOnceCapReached: boolean;
}

export interface ILockedVestingArgs {
  immediateReleaseBps: BN;
  lockDuration: BN;
  vestDuration: BN;
  immediateReleaseTimestamp: BN;
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
  presaleRegistries: IPresaleRegistryArgs[];
}
