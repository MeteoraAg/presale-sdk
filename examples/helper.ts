import {
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToCheckedInstruction,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

export async function createMintAndMintToIxs(
  connection: Connection,
  mintAuthority: Keypair,
  decimals: number,
  amount: number
) {
  const mintKeypair = Keypair.generate();

  const createAccountIx = SystemProgram.createAccount({
    fromPubkey: mintAuthority.publicKey,
    newAccountPubkey: mintKeypair.publicKey,
    space: MINT_SIZE,
    lamports: await connection.getMinimumBalanceForRentExemption(MINT_SIZE),
    programId: TOKEN_PROGRAM_ID,
  });

  const initMintIx = createInitializeMint2Instruction(
    mintKeypair.publicKey,
    decimals,
    mintAuthority.publicKey,
    null,
    TOKEN_PROGRAM_ID
  );

  const mintAuthorityAta = getAssociatedTokenAddressSync(
    mintKeypair.publicKey,
    mintAuthority.publicKey,
    true,
    TOKEN_PROGRAM_ID
  );

  const createMintAuthorityAtaIx =
    createAssociatedTokenAccountIdempotentInstruction(
      mintAuthority.publicKey,
      mintAuthorityAta,
      mintAuthority.publicKey,
      mintKeypair.publicKey,
      TOKEN_PROGRAM_ID
    );

  const mintIx = createMintToCheckedInstruction(
    mintKeypair.publicKey,
    mintAuthorityAta,
    mintAuthority.publicKey,
    BigInt(amount) * BigInt(10 ** decimals),
    decimals,
    [],
    TOKEN_PROGRAM_ID
  );

  return {
    instructions: [
      createAccountIx,
      initMintIx,
      createMintAuthorityAtaIx,
      mintIx,
    ],
    mintKeypair,
  };
}

// TODO: Mint metadata
export async function createMintAndMintTo(
  connection: Connection,
  mintAuthority: Keypair,
  decimals: number,
  amount: number
) {
  const { instructions, mintKeypair } = await createMintAndMintToIxs(
    connection,
    mintAuthority,
    decimals,
    amount
  );

  const latestBlockhashInfo = await connection.getLatestBlockhash();
  const transaction = new Transaction({
    ...latestBlockhashInfo,
    feePayer: mintAuthority.publicKey,
  }).add(...instructions);

  transaction.sign(mintAuthority, mintKeypair);

  console.log("Creating mint with keypair:", mintKeypair.publicKey.toBase58());
  const txSig = await connection.sendRawTransaction(transaction.serialize());

  await connection.confirmTransaction(
    {
      signature: txSig,
      ...latestBlockhashInfo,
    },
    "finalized"
  );

  return mintKeypair.publicKey;
}
