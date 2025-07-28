import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { deriveEscrow, deriveMerkleProofMetadata } from "../pda";
import { MerkleProofResponse, PresaleProgram } from "../type";

export interface ICreatePermissionedEscrowWithMerkleProofParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  owner: PublicKey;
  payer: PublicKey;
  merkleRootConfig: PublicKey;
  proof: number[][];
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
  } = params;

  const escrow = deriveEscrow(presaleAddress, owner, presaleProgram.programId);

  const initEscrowIx = await presaleProgram.methods
    .createPermissionedEscrowWithMerkleProof(proof)
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
    "proof" | "merkleRootConfig"
  >
) {
  const { owner, payer, presaleProgram, presaleAddress } = params;
  const merkleProofMetadata = deriveMerkleProofMetadata(
    this.presaleAddress,
    this.program.programId
  );

  const merkleProofMetadataState =
    await this.program.account.merkleProofMetadata.fetch(merkleProofMetadata);

  let baseUrl = merkleProofMetadataState.proofUrl;
  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, baseUrl.length - 1);
  }
  const fullUrl = `${baseUrl}/${this.presaleAddress.toBase58()}/${owner.toBase58()}`;

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
  });
}

export async function getOrCreatePermissionedEscrowWithMerkleProofIx(
  params: Omit<
    ICreatePermissionedEscrowWithMerkleProofParams,
    "proof" | "merkleRootConfig"
  >
): Promise<TransactionInstruction | null> {
  const { owner, payer, presaleAddress, presaleProgram } = params;

  const escrow = deriveEscrow(presaleAddress, owner, presaleProgram.programId);
  const escrowAccount = await presaleProgram.account.escrow.fetchNullable(
    escrow
  );

  if (!escrowAccount) {
    return autoFetchProofAndCreatePermissionedEscrowWithMerkleProofIx({
      owner,
      payer,
      presaleAddress,
      presaleProgram,
    });
  }
}
