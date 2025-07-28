import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { AccountMeta, PublicKey } from "@solana/web3.js";
import { MEMO_PROGRAM_ID } from "..";
import { derivePresaleAuthority } from "../pda";
import { getTokenProgramIdFromFlag } from "../token2022";
import { PresaleAccount, PresaleProgram, RemainingAccountInfo } from "../type";

export interface IPerformUnsoldBaseTokenActionParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  presaleAccount: PresaleAccount;
  creator: PublicKey;
  transferHookRemainingAccountInfo: RemainingAccountInfo;
  transferHookRemainingAccounts: AccountMeta[];
}

export async function createPerformUnsoldBaseTokenActionIx(
  params: IPerformUnsoldBaseTokenActionParams
) {
  const {
    presaleProgram,
    presaleAddress,
    presaleAccount,
    creator,
    transferHookRemainingAccountInfo,
    transferHookRemainingAccounts,
  } = params;

  const baseTokenProgram = getTokenProgramIdFromFlag(
    presaleAccount.baseTokenProgramFlag
  );

  const creatorBaseTokenAta = getAssociatedTokenAddressSync(
    presaleAccount.baseMint,
    creator,
    true,
    baseTokenProgram
  );

  const createCreatorBaseTokenAtaIx =
    createAssociatedTokenAccountIdempotentInstruction(
      creator,
      creatorBaseTokenAta,
      creator,
      presaleAccount.baseMint,
      baseTokenProgram
    );

  const performUnsoldBaseTokenActionIx = await presaleProgram.methods
    .performUnsoldBaseTokenAction(transferHookRemainingAccountInfo)
    .accountsPartial({
      presale: presaleAddress,
      baseTokenVault: presaleAccount.baseTokenVault,
      baseMint: presaleAccount.baseMint,
      presaleAuthority: derivePresaleAuthority(presaleProgram.programId),
      creatorBaseToken: creatorBaseTokenAta,
      tokenProgram: baseTokenProgram,
      memoProgram: MEMO_PROGRAM_ID,
    })
    .remainingAccounts(transferHookRemainingAccounts)
    .instruction();

  return [createCreatorBaseTokenAtaIx, performUnsoldBaseTokenActionIx];
}
