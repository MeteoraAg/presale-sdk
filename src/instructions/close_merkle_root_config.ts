import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { deriveMerkleRootConfig } from "../pda";
import { PresaleProgram } from "../type";

export interface ICloseMerkleRootConfigParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  version: BN;
  creator: PublicKey;
}

export async function closeMerkleRootConfigIx(
  params: ICloseMerkleRootConfigParams
) {
  const { presaleProgram, version, presaleAddress, creator } = params;

  const merkleRootConfig = deriveMerkleRootConfig(
    presaleAddress,
    presaleProgram.programId,
    version
  );

  const closeMerkleRootConfigIx = await presaleProgram.methods
    .closeMerkleRootConfig()
    .accountsPartial({
      presale: presaleAddress,
      merkleRootConfig,
      creator,
    })
    .instruction();

  return closeMerkleRootConfigIx;
}
