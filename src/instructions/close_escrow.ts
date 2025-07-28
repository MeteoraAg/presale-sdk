import { PublicKey } from "@solana/web3.js";
import { PresaleProgram } from "../type";
import { deriveEscrow } from "../pda";

export interface ICloseEscrowParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  owner: PublicKey;
}

export async function createCloseEscrowIx(params: ICloseEscrowParams) {
  const { presaleProgram, presaleAddress, owner } = params;

  const escrow = deriveEscrow(presaleAddress, owner, presaleProgram.programId);

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
