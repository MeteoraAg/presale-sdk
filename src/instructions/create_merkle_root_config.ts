import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { deriveMerkleRootConfig } from "../pda";
import { PresaleProgram } from "../type";

export interface ICreateMerkleRootConfigParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  root: Buffer;
  version: BN;
  creator: PublicKey;
}

export async function createMerkleRootConfigIx(
  params: ICreateMerkleRootConfigParams
) {
  const { presaleProgram, root, version, presaleAddress, creator } = params;

  const merkleRootConfig = deriveMerkleRootConfig(
    presaleAddress,
    presaleProgram.programId,
    version
  );

  const merkleRootConfigIx = await presaleProgram.methods
    .createMerkleRootConfig({
      root: Array.from(new Uint8Array(root)),
      version,
    })
    .accountsPartial({
      presale: presaleAddress,
      merkleRootConfig,
      creator,
    })
    .instruction();

  return merkleRootConfigIx;
}
