import { PublicKey } from "@solana/web3.js";
import { deriveEscrow } from "../pda";
import { PresaleProgram } from "../type";
import BN from "bn.js";

export interface IRefreshEscrowParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  owner: PublicKey;
  registryIndex: BN;
}

export async function createRefreshEscrowIx(params: IRefreshEscrowParams) {
  const { presaleProgram, presaleAddress, owner, registryIndex } = params;

  const escrow = deriveEscrow(
    presaleAddress,
    owner,
    registryIndex,
    presaleProgram.programId
  );

  const refreshEscrowIx = await presaleProgram.methods
    .refreshEscrow()
    .accountsPartial({
      escrow,
      presale: presaleAddress,
    })
    .instruction();

  return refreshEscrowIx;
}
