import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import Presale from "../src/presale";
import { PRESALE_PROGRAM_ID } from "../src";
import fs from "fs";
import os from "os";

const connection = new Connection(clusterApiUrl("devnet"));

async function revokeOperator(
  connection: Connection,
  operatorAddress: PublicKey,
  creator: Keypair
) {
  const revokeOperatorTx = await Presale.revokeOperator({
    operator: operatorAddress,
    creator: creator.publicKey,
    connection,
    programId: PRESALE_PROGRAM_ID,
  });

  revokeOperatorTx.sign(creator);
  const txSig = await connection.sendRawTransaction(
    revokeOperatorTx.serialize()
  );

  console.log("Revoke operator transaction sent:", txSig);
  await connection.confirmTransaction(
    {
      signature: txSig,
      lastValidBlockHeight: revokeOperatorTx.lastValidBlockHeight,
      blockhash: revokeOperatorTx.recentBlockhash,
    },
    "finalized"
  );
}

const operatorAddress = new PublicKey(
  "FXBXnxEEfwZJA1xnyJzKEhhJXmussKXKRdq5cAh19dbC"
);

const creatorKeypairFilepath = `${os.homedir()}/.config/solana/id.json`;
const creatorKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(creatorKeypairFilepath, "utf-8")))
);

revokeOperator(connection, operatorAddress, creatorKeypair);
