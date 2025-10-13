import { BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { ICreateInitializePresaleIxParams } from ".";
import {
  deriveFixedPricePresaleExtraArgs,
  derivePresale,
  derivePresaleAuthority,
  derivePresaleVault,
  deriveQuoteTokenVault,
} from "../../pda";
import { getSliceAndExtraAccountMetasForTransferHook } from "../../token2022";
import {
  AccountsType,
  PresaleMode,
  PresaleProgram,
  UnsoldTokenAction,
} from "../../type";

interface ICreateInitializeFixedPricePresaleArgsIxParams {
  program: PresaleProgram;
  baseMintPubkey: PublicKey;
  quoteMintPubkey: PublicKey;
  basePubkey: PublicKey;
  ownerPubkey: PublicKey;
  feePayerPubkey: PublicKey;
  qPrice: BN;
}

/**
 * Creates a `TransactionInstruction` to initialize a fixed price presale with the provided parameters.
 *
 * This function derives the necessary presale and extra argument accounts, then constructs
 * the instruction using the Anchor program's method for initializing fixed price presale arguments.
 *
 * @param params - The parameters required to create the instruction, including program instance,
 *                 mint public keys, base account, owner, unsold token action, fee payer, and price.
 * @returns A promise that resolves to the constructed `TransactionInstruction`.
 */
export async function createInitializeFixedPricePresaleArgsIx(
  params: ICreateInitializeFixedPricePresaleArgsIxParams
): Promise<TransactionInstruction> {
  const {
    program,
    baseMintPubkey,
    quoteMintPubkey,
    basePubkey,
    ownerPubkey,
    feePayerPubkey,
    qPrice,
  } = params;

  const presale = derivePresale(
    baseMintPubkey,
    quoteMintPubkey,
    basePubkey,
    program.programId
  );

  const fixedPricePresaleParams = deriveFixedPricePresaleExtraArgs(
    presale,
    program.programId
  );

  const ix = await program.methods
    .initializeFixedPricePresaleArgs({
      presale,
      padding0: 0,
      qPrice,
      padding1: new Array(8).fill(new BN(0)),
    })
    .accountsPartial({
      fixedPricePresaleParams,
      owner: ownerPubkey,
      payer: feePayerPubkey,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  return ix;
}

export async function createInitializeFixedPricePresaleIx(
  presaleParams: ICreateInitializePresaleIxParams,
  fixedPriceParams: ICreateInitializeFixedPricePresaleArgsIxParams
): Promise<TransactionInstruction[]> {
  const {
    program,
    presaleRegistries,
    presaleArgs,
    lockedVestingArgs,
    baseMintPubkey,
    quoteMintPubkey,
    creatorPubkey,
    feePayerPubkey,
    basePubkey,
  } = presaleParams;

  const createFixedPricePresaleArgsIx =
    await createInitializeFixedPricePresaleArgsIx(fixedPriceParams);

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
          presaleMode: PresaleMode.FixedPrice,
          padding: new Array(4).fill(new BN(0)),
        },
        presaleRegistries: presaleRegistries.map((registry) => {
          return {
            ...registry,
            padding: new Array(4).fill(new BN(0)),
          };
        }),
        lockedVestingParams: lockedVestingArgs
          ? {
              ...lockedVestingArgs,
              padding: new Array(4).fill(new BN(0)),
            }
          : {
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
    .remainingAccounts([
      {
        pubkey: deriveFixedPricePresaleExtraArgs(presale, program.programId),
        isWritable: true,
        isSigner: false,
      },
      ...extraAccountMetas,
    ])
    .instruction();

  return [createFixedPricePresaleArgsIx, initializePresaleIx];
}
