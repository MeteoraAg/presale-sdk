import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import fs from "fs";
import os from "os";
import { PRESALE_PROGRAM_ID } from "../../src";
import Presale from "../../src/presale";

const connection = new Connection(clusterApiUrl("devnet"));

async function deposit(
  connection: Connection,
  keypair: Keypair,
  presaleAddress: PublicKey
) {
  const presaleInstance = await Presale.create(
    connection,
    presaleAddress,
    PRESALE_PROGRAM_ID
  );

  const depositTx = await presaleInstance.deposit({
    amount: new BN(500000000),
    owner: keypair.publicKey,
  });

  depositTx.sign(keypair);

  const txSig = await connection.sendRawTransaction(depositTx.serialize());

  console.log("Transaction sent:", txSig);
  await connection.confirmTransaction(
    {
      signature: txSig,
      lastValidBlockHeight: depositTx.lastValidBlockHeight,
      blockhash: depositTx.recentBlockhash,
    },
    "finalized"
  );
}

const keypairFilepath = `${os.homedir()}/.config/solana/id.json`;
const rawKeypair = fs.readFileSync(keypairFilepath, "utf-8");
const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(rawKeypair)));

const presaleAddress = new PublicKey(
  "CMhi9fJgwkk4wkicpFn8ULAv9ca9UWSQypfLGFgqMLzF"
);

deposit(connection, keypair, presaleAddress);
