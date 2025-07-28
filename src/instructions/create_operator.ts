import { PublicKey } from "@solana/web3.js";
import { deriveOperator } from "../pda";
import { PresaleProgram } from "../type";

export interface ICreateOperatorParams {
  presaleProgram: PresaleProgram;
  operator: PublicKey;
  creator: PublicKey;
}

export async function createOperatorIx(params: ICreateOperatorParams) {
  const { presaleProgram, operator, creator } = params;

  const operatorAddress = deriveOperator(
    creator,
    operator,
    presaleProgram.programId
  );

  const initOperatorIx = await presaleProgram.methods
    .createOperator()
    .accountsPartial({
      operator: operatorAddress,
      creator,
      operatorOwner: operator,
    })
    .instruction();

  return initOperatorIx;
}
