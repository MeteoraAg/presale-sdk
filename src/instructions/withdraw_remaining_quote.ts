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

export interface IWithdrawRemainingQuoteParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  presaleAccount: PresaleAccount;
  owner: PublicKey;
  transferHookAccountInfo: TransferHookAccountInfo;
}

export async function createWithdrawRemainingQuoteIx(
  params: IWithdrawRemainingQuoteParams
) {
  const {
    presaleProgram,
    presaleAddress,
    presaleAccount,
    owner,
    transferHookAccountInfo,
  } = params;

  const { slices, extraAccountMetas } = transferHookAccountInfo;

  const quoteTokenProgram = getTokenProgramIdFromFlag(
    presaleAccount.quoteTokenProgramFlag
  );

  const ownerQuoteAta = getAssociatedTokenAddressSync(
    presaleAccount.quoteMint,
    owner,
    true,
    quoteTokenProgram
  );

  const createOwnerQuoteAtaIx =
    createAssociatedTokenAccountIdempotentInstruction(
      owner,
      ownerQuoteAta,
      owner,
      presaleAccount.quoteMint,
      quoteTokenProgram
    );

  const escrow = deriveEscrow(presaleAddress, owner, presaleProgram.programId);

  const withdrawRemainingQuoteIx = await presaleProgram.methods
    .withdrawRemainingQuote({ slices })
    .accountsPartial({
      presale: presaleAddress,
      owner: owner,
      quoteMint: presaleAccount.quoteMint,
      quoteTokenVault: presaleAccount.quoteTokenVault,
      ownerQuoteToken: ownerQuoteAta,
      tokenProgram: quoteTokenProgram,
      escrow,
      memoProgram: MEMO_PROGRAM_ID,
    })
    .remainingAccounts([...extraAccountMetas])
    .instruction();

  return [createOwnerQuoteAtaIx, withdrawRemainingQuoteIx];
}
