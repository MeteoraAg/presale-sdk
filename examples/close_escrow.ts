import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import os from "os";
import { PRESALE_PROGRAM_ID } from "../src";
import Presale from "../src/presale";

const connection = new Connection(clusterApiUrl("devnet"));

async function closeEscrow(
  connection: Connection,
  presaleAddress: PublicKey,
  user: Keypair
) {
  const presaleInstance = await Presale.create(
    connection,
    presaleAddress,
    PRESALE_PROGRAM_ID
  );

  const closeEscrowTx = await presaleInstance.closeEscrow({
    owner: user.publicKey,
  });

  closeEscrowTx.sign(user);

  const txSig = await connection.sendRawTransaction(closeEscrowTx.serialize());
  console.log("Close escrow transaction sent:", txSig);

  await connection.confirmTransaction(
    {
      signature: txSig,
      lastValidBlockHeight: closeEscrowTx.lastValidBlockHeight,
      blockhash: closeEscrowTx.recentBlockhash,
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

closeEscrow(connection, presaleAddress, keypair);
