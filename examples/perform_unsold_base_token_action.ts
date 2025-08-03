import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import os from "os";
import { PRESALE_PROGRAM_ID } from "../src";
import Presale from "../src/presale";

const connection = new Connection(clusterApiUrl("devnet"));

async function performUnsoldBaseTokenAction(
  connection: Connection,
  presaleAddress: PublicKey,
  user: Keypair
) {
  const presaleInstance = await Presale.create(
    connection,
    presaleAddress,
    PRESALE_PROGRAM_ID
  );

  const unsoldBaseTokenActionTx =
    await presaleInstance.performUnsoldBaseTokenAction(user.publicKey);

  unsoldBaseTokenActionTx.sign(user);

  const txSig = await connection.sendRawTransaction(
    unsoldBaseTokenActionTx.serialize()
  );

  console.log("Perform unsold base token action transaction sent:", txSig);

  await connection.confirmTransaction(
    {
      signature: txSig,
      lastValidBlockHeight: unsoldBaseTokenActionTx.lastValidBlockHeight,
      blockhash: unsoldBaseTokenActionTx.recentBlockhash,
    },
    "finalized"
  );
}

const keypairFilepath = `${os.homedir()}/.config/solana/id.json`;
const keypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(keypairFilepath, "utf-8")))
);

const presaleAddress = new PublicKey(
  "GStMrk5xbeYXM2fvoHUCd6qyyFyegZRfnADsQec1xviA"
);

performUnsoldBaseTokenAction(connection, presaleAddress, keypair);
