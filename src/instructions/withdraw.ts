import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { AccountMeta, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { MEMO_PROGRAM_ID } from "..";
import { deriveEscrow } from "../pda";
import { getTokenProgramIdFromFlag } from "../token2022";
import { PresaleAccount, PresaleProgram, RemainingAccountInfo } from "../type";

export interface IWithdrawParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  presaleAccount: PresaleAccount;
  owner: PublicKey;
  amount: BN;
  transferHookRemainingAccountInfo: RemainingAccountInfo;
  transferHookRemainingAccounts: AccountMeta[];
}

export async function createWithdrawIx(params: IWithdrawParams) {
  const {
    presaleProgram,
    presaleAddress,
    presaleAccount,
    owner,
    amount,
    transferHookRemainingAccountInfo,
    transferHookRemainingAccounts,
  } = params;

  const escrow = deriveEscrow(presaleAddress, owner, presaleProgram.programId);
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

  const withdrawIx = await presaleProgram.methods
    .withdraw(amount, transferHookRemainingAccountInfo)
    .accountsPartial({
      presale: presaleAddress,
      owner: owner,
      escrow,
      quoteMint: presaleAccount.quoteMint,
      quoteTokenVault: presaleAccount.quoteTokenVault,
      ownerQuoteToken: ownerQuoteAta,
      tokenProgram: quoteTokenProgram,
      memoProgram: MEMO_PROGRAM_ID,
    })
    .remainingAccounts(transferHookRemainingAccounts)
    .instruction();

  return [createOwnerQuoteAtaIx, withdrawIx];
}
