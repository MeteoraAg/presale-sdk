import { PublicKey } from "@solana/web3.js";
import { deriveEscrow } from "../pda";
import { PresaleProgram } from "../type";

export interface IRefreshEscrowParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  owner: PublicKey;
}

export async function createRefreshEscrowIx(params: IRefreshEscrowParams) {
  const { presaleProgram, presaleAddress, owner } = params;

  const escrow = deriveEscrow(presaleAddress, owner, presaleProgram.programId);

  const refreshEscrowIx = await presaleProgram.methods
    .refreshEscrow()
    .accountsPartial({
      escrow,
      presale: presaleAddress,
    })
    .instruction();

  return refreshEscrowIx;
}
