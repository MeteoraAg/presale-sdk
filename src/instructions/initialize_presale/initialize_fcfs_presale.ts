import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { SystemProgram, TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";
import { ICreateInitializePresaleIxParams } from ".";
import {
  derivePresale,
  derivePresaleAuthority,
  derivePresaleVault,
  deriveQuoteTokenVault,
} from "../../pda";
import { getSliceAndExtraAccountMetasForTransferHook } from "../../token2022";
import { AccountsType, PresaleMode } from "../../type";

/**
 * Creates a transaction instruction to initialize a First-Come-First-Serve (FCFS) presale on the Solana blockchain.
 *
 * This function prepares all necessary accounts, derives addresses, and constructs the instruction
 * for initializing a presale with specified tokenomics, presale parameters, and optional locked vesting parameters.
 * It supports transfer hooks and handles associated token accounts for both base and quote tokens.
 *
 * @param params - The parameters required to initialize the FCFS presale.
 * @param params.program - The Anchor program instance for the presale.
 * @param params.tokenomicArgs - The tokenomics configuration for the presale.
 * @param params.presaleArgs - The presale parameters, such as timing and limits.
 * @param params.lockedVestingArgs - Optional locked vesting parameters for the presale.
 * @param params.baseMintPubkey - The public key of the base token mint.
 * @param params.quoteMintPubkey - The public key of the quote token mint.
 * @param params.creatorPubkey - The public key of the presale creator.
 * @param params.feePayerPubkey - The public key of the fee payer.
 * @param params.basePubkey - The public key of the base account.
 *
 * @returns A Promise that resolves to a TransactionInstruction for initializing the FCFS presale.
 */
export async function createInitializeFcfsPresaleIx(
  params: ICreateInitializePresaleIxParams
): Promise<TransactionInstruction> {
  const {
    program,
    presaleArgs,
    lockedVestingArgs,
    baseMintPubkey,
    quoteMintPubkey,
    creatorPubkey,
    feePayerPubkey,
    basePubkey,
    presaleRegistriesArgs,
  } = params;

  const presale = derivePresale(
    baseMintPubkey,
    quoteMintPubkey,
    basePubkey,
    program.programId
  );

  const [baseMintAccount, quoteMintAccount] =
    await program.provider.connection.getMultipleAccountsInfo([
      baseMintPubkey,
      quoteMintPubkey,
    ]);

  const baseTokenProgram = baseMintAccount.owner;
  const quoteTokenProgram = quoteMintAccount.owner;

  const presaleAuthority = derivePresaleAuthority(program.programId);
  const presaleVault = derivePresaleVault(presale, program.programId);
  const quoteTokenVault = deriveQuoteTokenVault(presale, program.programId);

  const payerPresaleToken = getAssociatedTokenAddressSync(
    baseMintPubkey,
    feePayerPubkey,
    true,
    baseTokenProgram
  );

  const { slices, extraAccountMetas } =
    await getSliceAndExtraAccountMetasForTransferHook(
      program.provider.connection,
      baseMintPubkey,
      baseMintAccount,
      AccountsType.TransferHookBase
    );

  const initializePresaleIx = await program.methods
    .initializePresale(
      // @ts-expect-error
      {
        presaleParams: {
          ...presaleArgs,
          presaleMode: PresaleMode.Fcfs,
          padding: new Array(4).fill(new BN(0)),
        },
        lockedVestingParams: lockedVestingArgs
          ? {
              ...lockedVestingArgs,
              padding: new Array(4).fill(new BN(0)),
            }
          : {
              immediatelyReleaseBps: 0,
              lockDuration: new BN(0),
              vestDuration: new BN(0),
              padding: new Array(4).fill(new BN(0)),
            },
      },
      {
        slices,
      }
    )
    .accountsPartial({
      presale,
      presaleMint: baseMintPubkey,
      quoteTokenMint: quoteMintPubkey,
      presaleVault,
      payerPresaleToken,
      quoteTokenProgram,
      quoteTokenVault,
      baseTokenProgram,
      base: basePubkey,
      creator: creatorPubkey,
      payer: feePayerPubkey,
      presaleAuthority,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts(extraAccountMetas)
    .instruction();

  return initializePresaleIx;
}
