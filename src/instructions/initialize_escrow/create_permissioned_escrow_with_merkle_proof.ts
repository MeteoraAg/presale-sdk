import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { deriveEscrow, derivePermissionedServerMetadata } from "../../pda";
import { MerkleProofResponse, PresaleProgram } from "../../type";
import BN from "bn.js";

export interface ICreatePermissionedEscrowWithMerkleProofParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  owner: PublicKey;
  payer: PublicKey;
  merkleRootConfig: PublicKey;
  proof: number[][];
  registryIndex: BN;
  depositCap: BN;
}

export async function createPermissionedEscrowWithMerkleProofIx(
  params: ICreatePermissionedEscrowWithMerkleProofParams
) {
  const {
    presaleProgram,
    presaleAddress,
    owner,
    proof,
    merkleRootConfig,
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

  const initEscrowIx = await presaleProgram.methods
    .createPermissionedEscrowWithMerkleProof({
      registryIndex: registryIndex.toNumber(),
      depositCap,
      proof,
      padding: new Array(32).fill(0),
    })
    .accountsPartial({
      presale: presaleAddress,
      merkleRootConfig,
      payer,
      escrow,
      owner,
    })
    .instruction();

  return initEscrowIx;
}

export async function autoFetchProofAndCreatePermissionedEscrowWithMerkleProofIx(
  params: Omit<
    ICreatePermissionedEscrowWithMerkleProofParams,
    "proof" | "merkleRootConfig" | "depositCap"
  >
) {
  const { owner, payer, presaleProgram, presaleAddress, registryIndex } =
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
  const fullUrl = `${baseUrl}/${presaleAddress.toBase58()}/${registryIndex.toNumber()}/${owner.toBase58()}`;

  const response = await fetch(fullUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Merkle proof from ${fullUrl}: ${
        response.statusText
      } ${await response.text()}`
    );
  }

  const merkleProofApiResponse = (await response.json()) as MerkleProofResponse;

  return createPermissionedEscrowWithMerkleProofIx({
    presaleProgram,
    presaleAddress,
    owner,
    payer,
    merkleRootConfig: new PublicKey(merkleProofApiResponse.merkle_root_config),
    proof: merkleProofApiResponse.proof,
    registryIndex,
    depositCap: new BN(merkleProofApiResponse.deposit_cap),
  });
}

export async function getOrCreatePermissionedEscrowWithMerkleProofIx(
  params: Omit<
    ICreatePermissionedEscrowWithMerkleProofParams,
    "proof" | "merkleRootConfig" | "depositCap"
  >
): Promise<TransactionInstruction | null> {
  const { owner, payer, presaleAddress, presaleProgram, registryIndex } =
    params;

  const escrow = deriveEscrow(
    presaleAddress,
    owner,
    registryIndex,
    presaleProgram.programId
  );
  const escrowAccount = await presaleProgram.account.escrow.fetchNullable(
    escrow
  );

  if (!escrowAccount) {
    return autoFetchProofAndCreatePermissionedEscrowWithMerkleProofIx({
      owner,
      payer,
      presaleAddress,
      presaleProgram,
      registryIndex,
    });
  }
}
