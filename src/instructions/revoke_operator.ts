import { PublicKey } from "@solana/web3.js";
import { deriveOperator } from "../pda";
import { PresaleProgram } from "../type";

export interface IRevokeOperatorParams {
  presaleProgram: PresaleProgram;
  operator: PublicKey;
  creator: PublicKey;
}

export async function createRevokeOperatorIx(params: IRevokeOperatorParams) {
  const { presaleProgram, operator, creator } = params;

  const operatorAddress = deriveOperator(
    creator,
    operator,
    presaleProgram.programId
  );

  const revokeOperatorIx = await presaleProgram.methods
    .revokeOperator()
    .accountsPartial({
      operator: operatorAddress,
      creator,
    })
    .instruction();

  return revokeOperatorIx;
}
