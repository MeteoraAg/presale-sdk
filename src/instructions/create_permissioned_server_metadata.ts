import { PublicKey } from "@solana/web3.js";
import { PresaleProgram } from "../type";
import { derivePermissionedServerMetadata } from "../pda";

export interface ICreatePermissionedServerMetadataParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  owner: PublicKey;
  serverUrl: string;
}

export async function createInitializePermissionedServerMetadataIx(
  params: ICreatePermissionedServerMetadataParams
) {
  const { presaleProgram, presaleAddress, owner, serverUrl } = params;

  const permissionedServerMetadataProof = derivePermissionedServerMetadata(
    presaleAddress,
    presaleProgram.programId
  );

  const createPermissionedServerMetadataIx = await presaleProgram.methods
    .createPermissionedServerMetadata(serverUrl)
    .accountsPartial({
      permissionedServerMetadata: permissionedServerMetadataProof,
      presale: presaleAddress,
      owner,
    })
    .instruction();

  return createPermissionedServerMetadataIx;
}
