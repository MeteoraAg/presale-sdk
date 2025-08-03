import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import os from "os";
import { PRESALE_PROGRAM_ID } from "../src";
import Presale from "../src/presale";

const connection = new Connection(clusterApiUrl("devnet"));

async function claim(
  connection: Connection,
  presaleAddress: PublicKey,
  user: Keypair
) {
  const presaleInstance = await Presale.create(
    connection,
    presaleAddress,
    PRESALE_PROGRAM_ID
  );

  const claimTx = await presaleInstance.claim({
    owner: user.publicKey,
  });

  claimTx.sign(user);
  const txSig = await connection.sendRawTransaction(claimTx.serialize());

  console.log("Claim transaction sent:", txSig);

  await connection.confirmTransaction(
    {
      signature: txSig,
      lastValidBlockHeight: claimTx.lastValidBlockHeight,
      blockhash: claimTx.recentBlockhash,
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

claim(connection, presaleAddress, keypair);
