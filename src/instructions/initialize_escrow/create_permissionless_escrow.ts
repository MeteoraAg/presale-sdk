import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { deriveEscrow } from "../../pda";
import { PresaleProgram } from "../../type";

export interface ICreatePermissionlessEscrowParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  owner: PublicKey;
  payer: PublicKey;
}

export async function createPermissionlessEscrowIx(
  params: ICreatePermissionlessEscrowParams
) {
  const { presaleProgram, presaleAddress, owner, payer } = params;

  const escrow = deriveEscrow(presaleAddress, owner, presaleProgram.programId);

  const initEscrowIx = await presaleProgram.methods
    .createPermissionlessEscrow()
    .accountsPartial({
      escrow,
      presale: presaleAddress,
      owner,
      payer,
    })
    .instruction();

  return initEscrowIx;
}

export async function getOrCreatePermissionlessEscrowIx(
  params: ICreatePermissionlessEscrowParams
): Promise<TransactionInstruction | null> {
  const { presaleProgram, presaleAddress, owner } = params;

  const escrow = deriveEscrow(presaleAddress, owner, presaleProgram.programId);
  const escrowState = await presaleProgram.account.escrow.fetchNullable(escrow);

  if (!escrowState) {
    return createPermissionlessEscrowIx(params);
  }
}
