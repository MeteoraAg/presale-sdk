import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { AccountMeta, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { deriveEscrow } from "../pda";
import { getTokenProgramIdFromFlag } from "../token2022";
import { PresaleAccount, PresaleProgram, RemainingAccountInfo } from "../type";

export interface IDepositParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  presaleAccount: PresaleAccount;
  owner: PublicKey;
  amount: BN;
  transferHookRemainingAccountInfo: RemainingAccountInfo;
  transferHookRemainingAccounts: AccountMeta[];
}

export async function createDepositIx(params: IDepositParams) {
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

  const ownerQuoteToken = getAssociatedTokenAddressSync(
    presaleAccount.quoteMint,
    owner,
    true,
    quoteTokenProgram
  );

  const createOwnerQuoteTokenIx =
    createAssociatedTokenAccountIdempotentInstruction(
      owner,
      ownerQuoteToken,
      owner,
      presaleAccount.quoteMint,
      quoteTokenProgram
    );

  const depositIx = await presaleProgram.methods
    .deposit(amount, transferHookRemainingAccountInfo)
    .accountsPartial({
      presale: presaleAddress,
      payer: owner,
      escrow,
      payerQuoteToken: ownerQuoteToken,
      quoteMint: presaleAccount.quoteMint,
      tokenProgram: quoteTokenProgram,
    })
    .remainingAccounts(transferHookRemainingAccounts)
    .instruction();

  return [createOwnerQuoteTokenIx, depositIx];
}
