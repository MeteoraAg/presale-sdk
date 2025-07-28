import { PublicKey } from "@solana/web3.js";
import { PresaleProgram } from "../type";
import { deriveMerkleProofMetadata } from "../pda";

export interface ICloseMerkleProofMetadataParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  owner: PublicKey;
}

export async function createCloseMerkleProofMetadataIx(
  params: ICloseMerkleProofMetadataParams
) {
  const { presaleProgram, presaleAddress, owner } = params;

  const merkleProofMetadata = deriveMerkleProofMetadata(
    presaleAddress,
    presaleProgram.programId
  );

  const closeMerkleProofMetadataIx = await presaleProgram.methods
    .closeMerkleProofMetadata()
    .accountsPartial({
      merkleProofMetadata,
      presale: presaleAddress,
      owner,
      rentReceiver: owner,
    })
    .instruction();

  return closeMerkleProofMetadataIx;
}
