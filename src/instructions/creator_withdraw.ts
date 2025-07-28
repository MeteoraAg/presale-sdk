import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  AccountMeta,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import invariant from "tiny-invariant";
import { derivePresaleAuthority, MEMO_PROGRAM_ID } from "..";
import { getPresaleProgressState } from "../info_processor";
import { getTokenProgramIdFromFlag } from "../token2022";
import {
  PresaleAccount,
  PresaleProgram,
  PresaleProgress,
  RemainingAccountInfo,
} from "../type";

export interface ICreatorWithdrawParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  presaleAccount: PresaleAccount;
  creator: PublicKey;
  transferHookRemainingAccountInfo: RemainingAccountInfo;
  transferHookRemainingAccounts: AccountMeta[];
}

export async function createCreatorWithdrawIx(params: ICreatorWithdrawParams) {
  const {
    presaleProgram,
    presaleAddress,
    creator,
    presaleAccount,
    transferHookRemainingAccounts,
    transferHookRemainingAccountInfo,
  } = params;

  const presaleProgress = getPresaleProgressState(presaleAccount);
  const baseTokenProgram = getTokenProgramIdFromFlag(
    presaleAccount.baseTokenProgramFlag
  );
  const quoteTokenProgram = getTokenProgramIdFromFlag(
    presaleAccount.quoteTokenProgramFlag
  );

  let tokenProgramId: PublicKey;
  let ownerToken: PublicKey;
  let initOwnerTokenAtaIx: TransactionInstruction;

  const remainingAccounts: AccountMeta[] = [];

  invariant(
    presaleProgress === PresaleProgress.Completed ||
      presaleProgress === PresaleProgress.Failed
  );

  switch (presaleProgress) {
    case PresaleProgress.Completed: {
      ownerToken = getAssociatedTokenAddressSync(
        presaleAccount.quoteMint,
        creator,
        true,
        quoteTokenProgram
      );

      tokenProgramId = quoteTokenProgram;

      initOwnerTokenAtaIx = createAssociatedTokenAccountIdempotentInstruction(
        creator,
        ownerToken,
        creator,
        presaleAccount.quoteMint,
        quoteTokenProgram
      );

      remainingAccounts.push({
        pubkey: presaleAccount.quoteTokenVault,
        isWritable: true,
        isSigner: false,
      });

      remainingAccounts.push({
        pubkey: presaleAccount.quoteMint,
        isWritable: false,
        isSigner: false,
      });
      break;
    }
    case PresaleProgress.Failed: {
      ownerToken = getAssociatedTokenAddressSync(
        presaleAccount.baseMint,
        creator,
        true,
        baseTokenProgram
      );

      tokenProgramId = baseTokenProgram;

      initOwnerTokenAtaIx = createAssociatedTokenAccountIdempotentInstruction(
        creator,
        ownerToken,
        creator,
        presaleAccount.baseMint,
        baseTokenProgram
      );

      remainingAccounts.push({
        pubkey: presaleAccount.baseTokenVault,
        isWritable: true,
        isSigner: false,
      });

      remainingAccounts.push({
        pubkey: presaleAccount.baseMint,
        isWritable: false,
        isSigner: false,
      });
      break;
    }
  }

  const withdrawIx = await presaleProgram.methods
    .creatorWithdraw(transferHookRemainingAccountInfo)
    .accountsPartial({
      presale: presaleAddress,
      owner: creator,
      ownerToken,
      tokenProgram: tokenProgramId,
      memoProgram: MEMO_PROGRAM_ID,
      presaleAuthority: derivePresaleAuthority(presaleProgram.programId),
    })
    .remainingAccounts([...remainingAccounts, ...transferHookRemainingAccounts])
    .instruction();

  return [initOwnerTokenAtaIx, withdrawIx];
}
