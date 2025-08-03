import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import fs from "fs";
import os from "os";
import { PRESALE_PROGRAM_ID } from "../src";
import Presale from "../src/presale";

const connection = new Connection(clusterApiUrl("devnet"));

async function withdraw(
  connection: Connection,
  presaleAddress: PublicKey,
  amount: BN,
  user: Keypair
) {
  const presaleInstance = await Presale.create(
    connection,
    presaleAddress,
    PRESALE_PROGRAM_ID
  );

  const withdrawTx = await presaleInstance.withdraw({
    amount,
    owner: user.publicKey,
  });

  withdrawTx.sign(user);

  const txSig = await connection.sendRawTransaction(withdrawTx.serialize());
  console.log("Withdraw transaction sent:", txSig);

  await connection.confirmTransaction(
    {
      signature: txSig,
      lastValidBlockHeight: withdrawTx.lastValidBlockHeight,
      blockhash: withdrawTx.recentBlockhash,
    },
    "finalized"
  );
}

const keypairFilepath = `${os.homedir()}/.config/solana/id.json`;
const keypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(keypairFilepath, "utf-8")))
);

const presaleAddress = new PublicKey(
  "5tDHssKGhvNVSzMThrp7jsJmNp9BJrkXJpEhVW4HoPmx"
);

const amount = new BN(1000000);

withdraw(connection, presaleAddress, amount, keypair);
