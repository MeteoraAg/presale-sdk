import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  PartialSignedTransactionResponse,
  PresaleAccount,
  PresaleProgram,
} from "../../type";
import {
  deriveEscrow,
  deriveOperator,
  derivePermissionedServerMetadata,
} from "../../pda";
import BN from "bn.js";

export interface ICreatePermissionedEscrowWithCreatorParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  presaleAccount: PresaleAccount;
  owner: PublicKey;
  operator: PublicKey;
  payer: PublicKey;
  registryIndex: BN;
  depositCap: BN;
}

export async function createPermissionedEscrowWithCreatorIx(
  params: ICreatePermissionedEscrowWithCreatorParams
) {
  const {
    presaleProgram,
    presaleAddress,
    presaleAccount,
    owner,
    operator,
    payer,
    registryIndex,
    depositCap,
  } = params;

  const escrow = deriveEscrow(
    presaleAddress,
    owner,
    registryIndex,
    presaleProgram.programId
  );

  const operatorPda = deriveOperator(
    presaleAccount.owner,
    operator,
    presaleProgram.programId
  );

  const initEscrowIx = await presaleProgram.methods
    .createPermissionedEscrowWithCreator({
      registryIndex: registryIndex.toNumber(),
      depositCap,
      padding: new Array(32).fill(0),
    })
    .accountsPartial({
      escrow,
      presale: presaleAddress,
      owner,
      operator: operatorPda,
      operatorOwner: operator,
      payer,
    })
    .instruction();

  return initEscrowIx;
}

export async function getOrCreatePermissionedEscrowWithCreatorIx(
  params: ICreatePermissionedEscrowWithCreatorParams
): Promise<TransactionInstruction | null> {
  const { presaleProgram, presaleAddress, owner, registryIndex } = params;

  const escrow = deriveEscrow(
    presaleAddress,
    owner,
    registryIndex,
    presaleProgram.programId
  );
  const escrowState = await presaleProgram.account.escrow.fetchNullable(escrow);

  if (!escrowState) {
    return createPermissionedEscrowWithCreatorIx(params);
  }
}

export async function fetchPartialSignedInitEscrowAndDepositTransactionFromOperator(
  params: Omit<
    ICreatePermissionedEscrowWithCreatorParams,
    "operator" | "payer" | "depositCap"
  > & {
    amount: BN;
  }
) {
  const { presaleProgram, presaleAddress, owner, amount, registryIndex } =
    params;

  const permissionedServerMetadata = derivePermissionedServerMetadata(
    presaleAddress,
    presaleProgram.programId
  );

  const permissionedServerMetadataState =
    await presaleProgram.account.permissionedServerMetadata.fetch(
      permissionedServerMetadata
    );

  let baseUrl = permissionedServerMetadataState.serverUrl;
  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, baseUrl.length - 1);
  }
  const fullUrl = `${baseUrl}/${presaleAddress.toBase58()}/${registryIndex.toNumber()}/${owner.toBase58()}?amount=${amount.toString()}`;

  const response = await fetch(fullUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch partial signed transaction from ${fullUrl}: ${
        response.statusText
      } ${await response.text()}`
    );
  }

  const parsedResponse =
    (await response.json()) as PartialSignedTransactionResponse;

  return Transaction.from(parsedResponse.serialized_transaction);
}
