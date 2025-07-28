import { PublicKey } from "@solana/web3.js";
import { PresaleProgram } from "../type";
import { deriveFixedPricePresaleExtraArgs, derivePresale } from "../pda";

export interface ICreateCloseFixedPriceArgsParams {
  presaleProgram: PresaleProgram;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  base: PublicKey;
  owner: PublicKey;
}

export async function createCloseFixedPriceArgsIx(
  params: ICreateCloseFixedPriceArgsParams
) {
  const { presaleProgram, baseMint, quoteMint, base, owner } = params;
  const presale = derivePresale(
    baseMint,
    quoteMint,
    base,
    presaleProgram.programId
  );
  const fixedPricePresaleArgs = deriveFixedPricePresaleExtraArgs(
    presale,
    presaleProgram.programId
  );

  const closeFixedPricePresaleArgsIx = await presaleProgram.methods
    .closeFixedPricePresaleArgs()
    .accountsPartial({
      owner,
      fixedPricePresaleArgs,
    })
    .instruction();

  return closeFixedPricePresaleArgsIx;
}
