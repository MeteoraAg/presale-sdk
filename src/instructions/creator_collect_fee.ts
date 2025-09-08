import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { getTokenProgramIdFromFlag } from "../token2022";
import {
  PresaleAccount,
  PresaleProgram,
  TransferHookAccountInfo,
} from "../type";
import { derivePresaleAuthority, MEMO_PROGRAM_ID } from "..";

export interface ICreatorCollectFeeParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  presaleAccount: PresaleAccount;
  quoteTransferHookAccountInfo: TransferHookAccountInfo;
}

export async function createCreatorCollectFeeIx(
  params: ICreatorCollectFeeParams
) {
  const {
    presaleProgram,
    presaleAddress,
    presaleAccount,
    quoteTransferHookAccountInfo,
  } = params;

  const quoteTokenProgram = getTokenProgramIdFromFlag(
    presaleAccount.quoteTokenProgramFlag
  );

  const ownerQuoteTokenAddress = getAssociatedTokenAddressSync(
    presaleAccount.quoteMint,
    presaleAccount.owner,
    true,
    quoteTokenProgram
  );

  const initOwnerQuoteTokenAtaIx =
    createAssociatedTokenAccountIdempotentInstruction(
      presaleAccount.owner,
      ownerQuoteTokenAddress,
      presaleAccount.owner,
      presaleAccount.quoteMint,
      quoteTokenProgram
    );

  const collectFeeIx = await presaleProgram.methods
    .creatorCollectFee({
      slices: [...quoteTransferHookAccountInfo.slices],
    })
    .accountsPartial({
      presale: presaleAddress,
      owner: presaleAccount.owner,
      tokenProgram: quoteTokenProgram,
      quoteMint: presaleAccount.quoteMint,
      quoteTokenVault: presaleAccount.quoteTokenVault,
      feeReceivingAccount: ownerQuoteTokenAddress,
      memoProgram: MEMO_PROGRAM_ID,
      presaleAuthority: derivePresaleAuthority(presaleProgram.programId),
    })
    .remainingAccounts([...quoteTransferHookAccountInfo.extraAccountMetas])
    .instruction();

  return [initOwnerQuoteTokenAtaIx, collectFeeIx];
}
