import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { MEMO_PROGRAM_ID } from "..";
import { deriveEscrow } from "../pda";
import { getTokenProgramIdFromFlag } from "../token2022";
import {
  PresaleAccount,
  PresaleProgram,
  TransferHookAccountInfo,
} from "../type";
import { createRefreshEscrowIx } from "./refresh_escrow";
import BN from "bn.js";

export interface IClaimParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  presaleAccount: PresaleAccount;
  owner: PublicKey;
  transferHookAccountInfo: TransferHookAccountInfo;
  registryIndex: BN;
}

export async function createClaimIx(params: IClaimParams) {
  const {
    presaleProgram,
    presaleAddress,
    presaleAccount,
    owner,
    transferHookAccountInfo,
    registryIndex,
  } = params;

  const { slices, extraAccountMetas } = transferHookAccountInfo;

  const baseTokenProgram = getTokenProgramIdFromFlag(
    presaleAccount.baseTokenProgramFlag
  );

  const ownerBaseTokenAta = getAssociatedTokenAddressSync(
    presaleAccount.baseMint,
    owner,
    true,
    baseTokenProgram
  );

  const createOwnerBaseTokenAtaIx =
    createAssociatedTokenAccountIdempotentInstruction(
      owner,
      ownerBaseTokenAta,
      owner,
      presaleAccount.baseMint,
      baseTokenProgram
    );

  const escrow = deriveEscrow(
    presaleAddress,
    owner,
    registryIndex,
    presaleProgram.programId
  );

  const claimIx = await presaleProgram.methods
    .claim({
      slices,
    })
    .accountsPartial({
      presale: presaleAddress,
      escrow,
      baseMint: presaleAccount.baseMint,
      baseTokenVault: presaleAccount.baseTokenVault,
      owner,
      ownerBaseToken: ownerBaseTokenAta,
      tokenProgram: baseTokenProgram,
      memoProgram: MEMO_PROGRAM_ID,
    })
    .remainingAccounts(extraAccountMetas)
    .instruction();

  return [
    createOwnerBaseTokenAtaIx,
    await createRefreshEscrowIx({
      presaleProgram,
      presaleAddress,
      owner,
      registryIndex,
    }),
    claimIx,
  ];
}
