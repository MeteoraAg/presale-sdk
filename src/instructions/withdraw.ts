import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { MEMO_PROGRAM_ID } from "..";
import { deriveEscrow } from "../pda";
import { getTokenProgramIdFromFlag } from "../token2022";
import {
  PresaleAccount,
  PresaleProgram,
  TransferHookAccountInfo,
} from "../type";

export interface IWithdrawParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  presaleAccount: PresaleAccount;
  owner: PublicKey;
  amount: BN;
  transferHookAccountInfo: TransferHookAccountInfo;
  registryIndex: BN;
}

export async function createWithdrawIx(params: IWithdrawParams) {
  const {
    presaleProgram,
    presaleAddress,
    presaleAccount,
    owner,
    amount,
    transferHookAccountInfo,
    registryIndex,
  } = params;

  const { slices, extraAccountMetas } = transferHookAccountInfo;

  const escrow = deriveEscrow(
    presaleAddress,
    owner,
    registryIndex,
    presaleProgram.programId
  );
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
    .withdraw(amount, { slices })
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
    .remainingAccounts([...extraAccountMetas])
    .instruction();

  return [createOwnerQuoteAtaIx, withdrawIx];
}
