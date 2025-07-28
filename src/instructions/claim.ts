import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { AccountMeta, PublicKey } from "@solana/web3.js";
import { MEMO_PROGRAM_ID } from "..";
import { deriveEscrow } from "../pda";
import { getTokenProgramIdFromFlag } from "../token2022";
import { PresaleAccount, PresaleProgram, RemainingAccountInfo } from "../type";
import { createRefreshEscrowIx } from "./refresh_escrow";

export interface IClaimParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  presaleAccount: PresaleAccount;
  owner: PublicKey;
  transferHookRemainingAccountInfo: RemainingAccountInfo;
  transferHookRemainingAccounts: AccountMeta[];
}

export async function createClaimIx(params: IClaimParams) {
  const {
    presaleProgram,
    presaleAddress,
    presaleAccount,
    owner,
    transferHookRemainingAccountInfo,
    transferHookRemainingAccounts,
  } = params;

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

  const escrow = deriveEscrow(presaleAddress, owner, presaleProgram.programId);

  const claimIx = await presaleProgram.methods
    .claim(transferHookRemainingAccountInfo)
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
    .remainingAccounts(transferHookRemainingAccounts)
    .instruction();

  return [
    createOwnerBaseTokenAtaIx,
    await createRefreshEscrowIx({
      presaleProgram,
      presaleAddress,
      owner,
    }),
    claimIx,
  ];
}
