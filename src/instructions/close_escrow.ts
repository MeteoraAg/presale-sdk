import { PublicKey } from "@solana/web3.js";
import { PresaleProgram } from "../type";
import { deriveEscrow } from "../pda";
import BN from "bn.js";

export interface ICloseEscrowParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  owner: PublicKey;
  registryIndex: BN;
}

export async function createCloseEscrowIx(params: ICloseEscrowParams) {
  const { presaleProgram, presaleAddress, owner, registryIndex } = params;

  const escrow = deriveEscrow(
    presaleAddress,
    owner,
    registryIndex,
    presaleProgram.programId
  );

  const closeEscrowIx = await presaleProgram.methods
    .closeEscrow()
    .accountsPartial({
      escrow,
      presale: presaleAddress,
      owner,
      rentReceiver: owner,
    })
    .instruction();

  return closeEscrowIx;
}
