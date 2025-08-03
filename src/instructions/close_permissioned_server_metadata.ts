import { PublicKey } from "@solana/web3.js";
import { PresaleProgram } from "../type";
import { derivePermissionedServerMetadata } from "../pda";

export interface IClosePermissionedServerMetadataParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  owner: PublicKey;
}

export async function createClosePermissionedServerMetadataIx(
  params: IClosePermissionedServerMetadataParams
) {
  const { presaleProgram, presaleAddress, owner } = params;

  const permissionedServerMetadataProof = derivePermissionedServerMetadata(
    presaleAddress,
    presaleProgram.programId
  );

  const closePermissionedServerMetadataIx = await presaleProgram.methods
    .closePermissionedServerMetadata()
    .accountsPartial({
      permissionedServerMetadata: permissionedServerMetadataProof,
      presale: presaleAddress,
      owner,
      rentReceiver: owner,
    })
    .instruction();

  return closePermissionedServerMetadataIx;
}
