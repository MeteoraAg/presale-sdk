import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { MEMO_PROGRAM_ID } from "..";
import { derivePresaleAuthority } from "../pda";
import { getTokenProgramIdFromFlag } from "../token2022";
import {
  PresaleAccount,
  PresaleProgram,
  TransferHookAccountInfo,
} from "../type";

export interface IPerformUnsoldBaseTokenActionParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  presaleAccount: PresaleAccount;
  creator: PublicKey;
  transferHookAccountInfo: TransferHookAccountInfo;
}

export async function createPerformUnsoldBaseTokenActionIx(
  params: IPerformUnsoldBaseTokenActionParams
) {
  const {
    presaleProgram,
    presaleAddress,
    presaleAccount,
    creator,
    transferHookAccountInfo,
  } = params;

  const { slices, extraAccountMetas } = transferHookAccountInfo;

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
    .performUnsoldBaseTokenAction({ slices })
    .accountsPartial({
      presale: presaleAddress,
      baseTokenVault: presaleAccount.baseTokenVault,
      baseMint: presaleAccount.baseMint,
      presaleAuthority: derivePresaleAuthority(presaleProgram.programId),
      creatorBaseToken: creatorBaseTokenAta,
      tokenProgram: baseTokenProgram,
      memoProgram: MEMO_PROGRAM_ID,
    })
    .remainingAccounts([...extraAccountMetas])
    .instruction();

  return [createCreatorBaseTokenAtaIx, performUnsoldBaseTokenActionIx];
}
