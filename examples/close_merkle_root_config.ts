import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import os from "os";
import { PRESALE_PROGRAM_ID } from "../src";
import Presale from "../src/presale";
import BN from "bn.js";

const connection = new Connection(clusterApiUrl("devnet"));

async function closeMerkleRootConfig(
  connection: Connection,
  presaleAddress: PublicKey,
  version: BN,
  creator: Keypair
) {
  const presaleInstance = await Presale.create(
    connection,
    presaleAddress,
    PRESALE_PROGRAM_ID
  );

  const closeMerkleRootConfigTx = await presaleInstance.closeMerkleRootConfig({
    version,
    creator: creator.publicKey,
  });

  closeMerkleRootConfigTx.sign(creator);

  const txSig = await connection.sendRawTransaction(
    closeMerkleRootConfigTx.serialize()
  );
  console.log("Close merkle root config transaction sent:", txSig);

  await connection.confirmTransaction(
    {
      signature: txSig,
      lastValidBlockHeight: closeMerkleRootConfigTx.lastValidBlockHeight,
      blockhash: closeMerkleRootConfigTx.recentBlockhash,
    },
    "finalized"
  );
}

const keypairFilepath = `${os.homedir()}/.config/solana/id.json`;
const keypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(keypairFilepath, "utf-8")))
);

const presaleAddress = new PublicKey(
  "59Av19ft9HjpitcN2VoEXvMiA8nrTh7WvNHVtZRhdaoi"
);

const version = new BN(0);
closeMerkleRootConfig(connection, presaleAddress, version, keypair);
