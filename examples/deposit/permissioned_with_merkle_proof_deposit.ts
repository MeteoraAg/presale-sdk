import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import express from "express";
import fs from "fs";
import os from "os";
import { WhitelistedWallet } from "../../libs/merkle_tree";
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

  const presaleWrapper = presaleInstance.getParsedPresale();
  const presaleRegistries = presaleWrapper.getAllPresaleRegistries();

  const depositTxs = await Promise.allSettled(
    presaleRegistries.map((reg) => {
      return presaleInstance.deposit({
        amount: new BN(10000000),
        owner: keypair.publicKey,
        registryIndex: new BN(reg.getRegistryIndex()),
      });
    })
  );

  const whitelistedDepositTxs = depositTxs
    .filter((res) => res.status === "fulfilled")
    .map((res) => res.value);

  await Promise.all(
    whitelistedDepositTxs.map(async (depositTx) => {
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
    })
  );

  process.exit(process.exitCode);
}

async function startMerkleProofServer(
  presaleAddress: PublicKey,
  whitelistWallets: WhitelistedWallet[],
  creator: Keypair,
  app: express.Express
) {
  const presaleInstance = await Presale.create(
    connection,
    presaleAddress,
    PRESALE_PROGRAM_ID
  );

  const merkleProofs = await presaleInstance.createMerkleProofResponse({
    whitelistWallets,
    creator: creator.publicKey,
  });

  app.get(
    "/merkle-proof/:presaleAddress/:registryIndex/:userAddress",
    (req, res) => {
      const { presaleAddress, userAddress, registryIndex } = req.params;
      console.log(
        `Fetching Merkle proof for presale: ${presaleAddress}, user: ${userAddress}, registryIndex: ${registryIndex}`
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
    }
  );

  app.listen(8080, () => {
    console.log("Merkle proof server is running on port 8080");
  });
}

const keypairFilepath = `${os.homedir()}/.config/solana/id.json`;
const rawKeypair = fs.readFileSync(keypairFilepath, "utf-8");
const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(rawKeypair)));

const presaleAddress = new PublicKey(
  "H7pDwguN8f2mxg8gtyBwbKopW5ENRFMnWxYHGAG1hM6L"
);
const whitelistedAddresses: WhitelistedWallet[] = [
  {
    account: keypair.publicKey,
    registryIndex: new BN(0),
    depositCap: new BN(1000000000),
  },
];

const app = express();

startMerkleProofServer(presaleAddress, whitelistedAddresses, keypair, app).then(
  () => {
    return depositWithMerkleProof(connection, keypair, presaleAddress);
  }
);
