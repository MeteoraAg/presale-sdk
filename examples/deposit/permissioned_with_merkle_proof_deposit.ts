import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import express from "express";
import fs from "fs";
import os from "os";
import { PRESALE_PROGRAM_ID } from "../../src";
import Presale from "../../src/presale";
import { WhitelistedWallet } from "../../libs/merkle_tree";

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
  whitelistAddresses: WhitelistedWallet[],
  app: express.Express
) {
  const presaleInstance = await Presale.create(
    connection,
    presaleAddress,
    PRESALE_PROGRAM_ID
  );

  const merkleProofs = await presaleInstance.createMerkleProofResponse({
    addresses: whitelistAddresses,
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

const userKeypairFilepath = `${os.homedir()}/.config/solana/id2.json`;
const userKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(userKeypairFilepath, "utf-8")))
);

const whitelistedAddresses: WhitelistedWallet[] = [
  {
    address: keypair.publicKey,
    depositCap: new BN(100_000_000),
    registryIndex: new BN(0),
  },
  {
    address: userKeypair.publicKey,
    depositCap: new BN(50_000_000),
    registryIndex: new BN(1),
  },
];

const app = express();

startMerkleProofServer(presaleAddress, whitelistedAddresses, app).then(() => {
  return depositWithMerkleProof(connection, keypair, presaleAddress);
});
