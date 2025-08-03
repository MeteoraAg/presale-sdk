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
import { getPresaleProgressState } from "../accounts/presale_wrapper";
import { getTokenProgramIdFromFlag } from "../token2022";
import {
  PresaleAccount,
  PresaleProgram,
  PresaleProgress,
  RemainingAccountsSlice,
  TransferHookAccountInfo,
} from "../type";

export interface ICreatorWithdrawParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  presaleAccount: PresaleAccount;
  creator: PublicKey;
  baseTransferHookAccountInfo: TransferHookAccountInfo;
  quoteTransferHookAccountInfo: TransferHookAccountInfo;
}

export async function createCreatorWithdrawIx(params: ICreatorWithdrawParams) {
  const {
    presaleProgram,
    presaleAddress,
    creator,
    presaleAccount,
    baseTransferHookAccountInfo,
    quoteTransferHookAccountInfo,
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
  let slices: RemainingAccountsSlice[] = [];
  let extraAccountMetas: AccountMeta[] = [];

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

      slices = quoteTransferHookAccountInfo.slices;
      extraAccountMetas = quoteTransferHookAccountInfo.extraAccountMetas;
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

      slices = baseTransferHookAccountInfo.slices;
      extraAccountMetas = baseTransferHookAccountInfo.extraAccountMetas;
      break;
    }
  }

  const withdrawIx = await presaleProgram.methods
    .creatorWithdraw({ slices })
    .accountsPartial({
      presale: presaleAddress,
      owner: creator,
      ownerToken,
      tokenProgram: tokenProgramId,
      memoProgram: MEMO_PROGRAM_ID,
      presaleAuthority: derivePresaleAuthority(presaleProgram.programId),
    })
    .remainingAccounts([...remainingAccounts, ...extraAccountMetas])
    .instruction();

  return [initOwnerTokenAtaIx, withdrawIx];
}
