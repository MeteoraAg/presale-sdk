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
import { getSlicesAndExtraAccountMetasForTransferHook } from "../../token2022";
import { PresaleMode } from "../../type";

/**
 * Creates a transaction instruction to initialize a prorata presale on the Solana blockchain.
 *
 * This function derives necessary addresses, fetches mint account information, and constructs
 * the instruction for initializing a presale with prorata mode, including tokenomics, presale parameters,
 * and optional locked vesting parameters. It also handles associated token accounts and transfer hook slices.
 *
 * @param params - The parameters required to create the initialize presale instruction.
 * @param params.program - The Anchor program instance.
 * @param params.tokenomicArgs - Arguments specifying the tokenomics of the presale.
 * @param params.presaleArgs - Arguments specifying the presale parameters.
 * @param params.lockedVestingArgs - Optional arguments for locked vesting parameters.
 * @param params.baseMintPubkey - Public key of the base token mint.
 * @param params.quoteMintPubkey - Public key of the quote token mint.
 * @param params.creatorPubkey - Public key of the presale creator.
 * @param params.feePayerPubkey - Public key of the fee payer.
 * @param params.basePubkey - Public key of the base account.
 * @returns A promise that resolves to the transaction instruction for initializing the prorata presale.
 */
export async function createInitializeProrataPresaleIx(
  params: ICreateInitializePresaleIxParams
): Promise<TransactionInstruction> {
  const {
    program,
    tokenomicArgs,
    presaleArgs,
    lockedVestingArgs,
    baseMintPubkey,
    quoteMintPubkey,
    creatorPubkey,
    feePayerPubkey,
    basePubkey,
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
    await getSlicesAndExtraAccountMetasForTransferHook(
      program.provider.connection,
      {
        mintAddress: baseMintPubkey,
        mintAccountInfo: baseMintAccount,
      },
      {
        mintAddress: quoteMintPubkey,
        mintAccountInfo: quoteMintAccount,
      }
    );

  const initializePresaleIx = await program.methods
    .initializePresale(
      // @ts-expect-error
      {
        tokenomic: {
          ...tokenomicArgs,
          padding: new Array(4).fill(new BN(0)),
        },
        presaleParams: {
          ...presaleArgs,
          presaleMode: PresaleMode.Prorata,
          padding: new Array(4).fill(new BN(0)),
        },
        lockedVestingParams: lockedVestingArgs ?? {
          ...lockedVestingArgs,
          padding: new Array(4).fill(new BN(0)),
        },
        padding: new Array(4).fill(new BN(0)),
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
