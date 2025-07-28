import {
  addExtraAccountMetasForExecute,
  calculateFee,
  createTransferCheckedInstruction,
  getEpochFee,
  getTransferFeeConfig,
  getTransferHook,
  MAX_FEE_BASIS_POINTS,
  Mint,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TransferFee,
  unpackMint,
} from "@solana/spl-token";
import {
  AccountInfo,
  AccountMeta,
  Connection,
  PublicKey,
} from "@solana/web3.js";
import BN from "bn.js";
import { AccountsType } from "./type";

interface MintAddressWithAccountInfo {
  mintAddress: PublicKey;
  mintAccountInfo: AccountInfo<Buffer>;
}

interface GetSlicesAndExtraAccountMetasForTransferHookResponse {
  slices: { accountTypes: AccountsType; length: number }[];
  extraAccountMetas: AccountMeta[];
}

export async function getSlicesAndExtraAccountMetasForTransferHook(
  connection: Connection,
  baseMintAddressWithAccountInfo: MintAddressWithAccountInfo,
  quoteMintAddressWithAccountInfo: MintAddressWithAccountInfo
): Promise<GetSlicesAndExtraAccountMetasForTransferHookResponse> {
  const slices = [];
  const extraAccountMetas = [];

  const [baseMintTransferHookAccounts, quoteMintTransferHookAccounts] =
    await Promise.all([
      getExtraAccountMetasForTransferHook(
        connection,
        baseMintAddressWithAccountInfo.mintAddress,
        baseMintAddressWithAccountInfo.mintAccountInfo
      ),
      getExtraAccountMetasForTransferHook(
        connection,
        quoteMintAddressWithAccountInfo.mintAddress,
        quoteMintAddressWithAccountInfo.mintAccountInfo
      ),
    ]);

  if (baseMintTransferHookAccounts.length > 0) {
    slices.push({
      accountTypes: AccountsType.TransferHookBase,
      length: baseMintTransferHookAccounts.length,
    });
    extraAccountMetas.push(...baseMintTransferHookAccounts);
  }

  if (quoteMintTransferHookAccounts.length > 0) {
    slices.push({
      accountTypes: AccountsType.TransferHookQuote,
      length: quoteMintTransferHookAccounts.length,
    });
    extraAccountMetas.push(...quoteMintTransferHookAccounts);
  }

  return {
    slices,
    extraAccountMetas,
  };
}

export async function getExtraAccountMetasForTransferHook(
  connection: Connection,
  mintAddress: PublicKey,
  mintAccountInfo: AccountInfo<Buffer>
) {
  if (
    ![TOKEN_PROGRAM_ID.toBase58(), TOKEN_2022_PROGRAM_ID.toBase58()].includes(
      mintAccountInfo.owner.toBase58()
    )
  ) {
    return [];
  }

  const mintState = unpackMint(
    mintAddress,
    mintAccountInfo,
    mintAccountInfo.owner
  );

  if (mintAccountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
    return [];
  }

  const transferHook = getTransferHook(mintState);

  if (!transferHook || transferHook.programId.equals(PublicKey.default)) {
    return [];
  } else {
    // We just need the instruction, therefore we do not need source and destination key
    const instruction = createTransferCheckedInstruction(
      PublicKey.default,
      mintAddress,
      PublicKey.default,
      PublicKey.default,
      BigInt(0),
      mintState.decimals,
      [],
      mintAccountInfo.owner
    );

    await addExtraAccountMetasForExecute(
      connection,
      instruction,
      transferHook.programId,
      PublicKey.default,
      mintAddress,
      PublicKey.default,
      PublicKey.default,
      BigInt(0)
    );

    const transferHookAccounts = instruction.keys.slice(4);

    if (transferHookAccounts.length == 0) {
      transferHookAccounts.push({
        pubkey: transferHook.programId,
        isSigner: false,
        isWritable: false,
      });
    }

    return transferHookAccounts;
  }
}

function calculatePreFeeAmount(transferFee: TransferFee, postFeeAmount: BN) {
  if (postFeeAmount.isZero()) {
    return new BN(0);
  }

  if (transferFee.transferFeeBasisPoints === 0) {
    return postFeeAmount;
  }

  const maximumFee = new BN(transferFee.maximumFee.toString());

  if (transferFee.transferFeeBasisPoints === MAX_FEE_BASIS_POINTS) {
    return postFeeAmount.add(maximumFee);
  }

  const ONE_IN_BASIS_POINTS = new BN(MAX_FEE_BASIS_POINTS);
  const numerator = postFeeAmount.mul(ONE_IN_BASIS_POINTS);
  const denominator = ONE_IN_BASIS_POINTS.sub(
    new BN(transferFee.transferFeeBasisPoints)
  );

  const rawPreFeeAmount = numerator
    .add(denominator)
    .sub(new BN(1))
    .div(denominator);

  if (rawPreFeeAmount.sub(postFeeAmount).gte(maximumFee)) {
    return postFeeAmount.add(maximumFee);
  }

  return rawPreFeeAmount;
}

function calculateInverseFee(transferFee: TransferFee, postFeeAmount: BN) {
  const preFeeAmount = calculatePreFeeAmount(transferFee, postFeeAmount);
  return new BN(
    calculateFee(transferFee, BigInt(preFeeAmount.toString())).toString()
  );
}

interface TransferFeeIncludedAmount {
  amount: BN;
  transferFee: BN;
}

export function calculateTransferFeeIncludedAmount(
  transferFeeExcludedAmount: BN,
  mint: Mint,
  currentEpoch: number
): TransferFeeIncludedAmount {
  if (transferFeeExcludedAmount.isZero()) {
    return {
      amount: new BN(0),
      transferFee: new BN(0),
    };
  }

  const transferFeeConfig = getTransferFeeConfig(mint);

  if (transferFeeConfig === null) {
    return {
      amount: transferFeeExcludedAmount,
      transferFee: new BN(0),
    };
  }

  const epochFee = getEpochFee(transferFeeConfig, BigInt(currentEpoch));

  const transferFee =
    epochFee.transferFeeBasisPoints == MAX_FEE_BASIS_POINTS
      ? new BN(epochFee.maximumFee.toString())
      : calculateInverseFee(epochFee, transferFeeExcludedAmount);

  const transferFeeIncludedAmount = transferFeeExcludedAmount.add(transferFee);

  return {
    amount: transferFeeIncludedAmount,
    transferFee,
  };
}

interface TransferFeeExcludedAmount {
  amount: BN;
  transferFee: BN;
}

export function calculateTransferFeeExcludedAmount(
  transferFeeIncludedAmount: BN,
  mint: Mint,
  currentEpoch: number
): TransferFeeExcludedAmount {
  const transferFeeConfig = getTransferFeeConfig(mint);
  if (transferFeeConfig === null) {
    return {
      amount: transferFeeIncludedAmount,
      transferFee: new BN(0),
    };
  }

  const transferFeeIncludedAmountN = BigInt(
    transferFeeIncludedAmount.toString()
  );

  const transferFee = calculateFee(
    getEpochFee(transferFeeConfig, BigInt(currentEpoch)),
    transferFeeIncludedAmountN
  );

  const transferFeeExcludedAmount = new BN(
    (transferFeeIncludedAmountN - transferFee).toString()
  );

  return {
    amount: transferFeeExcludedAmount,
    transferFee: new BN(transferFee.toString()),
  };
}

export function getTokenProgramIdFromFlag(flag: number) {
  if (flag === 0) {
    return TOKEN_PROGRAM_ID;
  } else if (flag === 1) {
    return TOKEN_2022_PROGRAM_ID;
  } else {
    throw new Error("Invalid token program flag");
  }
}
