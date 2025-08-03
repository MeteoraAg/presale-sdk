import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import express from "express";
import fs from "fs";
import os from "os";
import { PRESALE_PROGRAM_ID } from "../../src";
import Presale from "../../src/presale";

const connection = new Connection(clusterApiUrl("devnet"));

async function depositWithMerkleProof(
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
    amount: new BN(10000000),
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

  process.exit(process.exitCode);
}

async function startMerkleProofServer(
  presaleAddress: PublicKey,
  whitelistAddresses: PublicKey[],
  creator: Keypair,
  app: express.Express
) {
  const presaleInstance = await Presale.create(
    connection,
    presaleAddress,
    PRESALE_PROGRAM_ID
  );

  const merkleProofs = await presaleInstance.createMerkleProofResponse({
    addresses: whitelistAddresses,
    creator: creator.publicKey,
  });

  app.get("/merkle-proof/:presaleAddress/:userAddress", (req, res) => {
    const { presaleAddress, userAddress } = req.params;
    console.log(
      `Fetching Merkle proof for presale: ${presaleAddress}, user: ${userAddress}`
    );

    const parsedPresaleAddress = new PublicKey(presaleAddress);

    if (!presaleInstance.presaleAddress.equals(parsedPresaleAddress)) {
      return res.status(404).send("Presale not found");
    }

    const parsedUserAddress = new PublicKey(userAddress);
    const proof = merkleProofs[parsedUserAddress.toBase58()];

    if (!proof) {
      return res.status(404).send("User not found");
    }

    res.json(proof);
  });

  app.listen(8080, () => {
    console.log("Merkle proof server is running on port 8080");
  });
}

const keypairFilepath = `${os.homedir()}/.config/solana/id.json`;
const rawKeypair = fs.readFileSync(keypairFilepath, "utf-8");
const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(rawKeypair)));

const presaleAddress = new PublicKey(
  "CkG4awAGBdHBQkVsJgSensJmFrt3KarMcCSLjNsXfRHN"
);
const whitelistedAddresses: PublicKey[] = [keypair.publicKey];

const app = express();

startMerkleProofServer(presaleAddress, whitelistedAddresses, keypair, app).then(
  () => {
    return depositWithMerkleProof(connection, keypair, presaleAddress);
  }
);
