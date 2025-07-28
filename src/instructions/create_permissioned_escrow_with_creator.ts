import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { PresaleProgram } from "../type";
import { deriveEscrow } from "../pda";

export interface ICreatePermissionedEscrowWithCreatorParams {
  presaleProgram: PresaleProgram;
  presaleAddress: PublicKey;
  owner: PublicKey;
  operator: PublicKey;
  payer: PublicKey;
}

export async function createPermissionedEscrowWithCreatorIx(
  params: ICreatePermissionedEscrowWithCreatorParams
) {
  const { presaleProgram, presaleAddress, owner, operator, payer } = params;

  const escrow = deriveEscrow(presaleAddress, owner, presaleProgram.programId);

  const initEscrowIx = await presaleProgram.methods
    .createPermissionedEscrowWithCreator()
    .accountsPartial({
      escrow,
      presale: presaleAddress,
      owner,
      operator,
      payer,
    })
    .instruction();

  return initEscrowIx;
}

export async function getOrCreatePermissionedEscrowWithCreatorIx(
  params: ICreatePermissionedEscrowWithCreatorParams
): Promise<TransactionInstruction | null> {
  const { presaleProgram, presaleAddress, owner } = params;

  const escrow = deriveEscrow(presaleAddress, owner, presaleProgram.programId);
  const escrowState = await presaleProgram.account.escrow.fetchNullable(escrow);

  if (!escrowState) {
    return createPermissionedEscrowWithCreatorIx(params);
  }
}
