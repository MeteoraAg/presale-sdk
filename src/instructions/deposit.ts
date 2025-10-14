import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { deriveEscrow } from "../pda";
import { getTokenProgramIdFromFlag } from "../token2022";
import {
  PresaleAccount,
  PresaleProgram,
  TransferHookAccountInfo,
} from "../type";
import { wrapSOLInstruction } from "../token";

export interface IDepositParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  presaleAccount: PresaleAccount;
  owner: PublicKey;
  amount: BN;
  transferHookAccountInfo: TransferHookAccountInfo;
  registryIndex?: BN;
}

export async function createDepositIx(params: IDepositParams) {
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
    .deposit(amount, {
      slices,
    })
    .accountsPartial({
      presale: presaleAddress,
      payer: owner,
      escrow,
      payerQuoteToken: ownerQuoteToken,
      quoteMint: presaleAccount.quoteMint,
      tokenProgram: quoteTokenProgram,
    })
    .remainingAccounts(extraAccountMetas)
    .instruction();

  if (presaleAccount.quoteMint.equals(NATIVE_MINT)) {
    const wrapSolIx = await wrapSOLInstruction(
      owner,
      ownerQuoteToken,
      BigInt(amount.toString())
    );
    return [createOwnerQuoteTokenIx, ...wrapSolIx, depositIx];
  } else {
    return [createOwnerQuoteTokenIx, depositIx];
  }
}
