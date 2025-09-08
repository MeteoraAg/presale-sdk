import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import BN from "bn.js";
import express from "express";
import fs from "fs";
import os from "os";
import { WhitelistedWallet } from "../../libs/merkle_tree";
import { PRESALE_PROGRAM_ID } from "../../src";
import { getOrCreatePermissionedEscrowWithCreatorIx } from "../../src/instructions";
import { createDepositIx } from "../../src/instructions/deposit";
import Presale from "../../src/presale";
import { PartialSignedTransactionResponse } from "../../src/type";

const connection = new Connection(clusterApiUrl("devnet"));

async function depositWithAuthority(
  connection: Connection,
  keypair: Keypair,
  presaleAddress: PublicKey
) {
  const presaleInstance = await Presale.create(
    connection,
    presaleAddress,
    PRESALE_PROGRAM_ID
  );

  const presaleWrapper = await presaleInstance.getParsedPresale();
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
      depositTx.partialSign(keypair);

      const txSig = await connection.sendRawTransaction(
        depositTx.serialize({
          verifySignatures: true,
          requireAllSignatures: true,
        })
      );

      console.log("Transaction sent:", txSig);
      await connection.confirmTransaction(txSig, "finalized");
    })
  );

  process.exit(process.exitCode);
}

async function startAuthSignServer(
  presaleAddress: PublicKey,
  whitelistedAddresses: WhitelistedWallet[],
  operatorKeypair: Keypair,
  app: express.Express
) {
  const presaleInstance = await Presale.create(
    connection,
    presaleAddress,
    PRESALE_PROGRAM_ID
  );

  app.get(
    "/auth-sign/:presaleAddress/:registryIndex/:userAddress",
    async (req, res) => {
      const { presaleAddress, userAddress, registryIndex } = req.params;
      console.log(
        `Fetching auth sign for presale: ${presaleAddress}, user: ${userAddress}, registryIndex: ${registryIndex}`
      );

      const parsedPresaleAddress = new PublicKey(presaleAddress);

      if (!presaleInstance.presaleAddress.equals(parsedPresaleAddress)) {
        return res.status(404).send("Presale not found");
      }

      const parsedUserAddress = new PublicKey(userAddress);
      const whitelisted = whitelistedAddresses.find(
        (wallet) =>
          wallet.account.equals(parsedUserAddress) &&
          wallet.registryIndex.eq(new BN(registryIndex))
      );

      if (!whitelisted) {
        return res.status(404).send("User not found");
      }

      const initEscrowIx = await getOrCreatePermissionedEscrowWithCreatorIx({
        presaleAddress: parsedPresaleAddress,
        presaleProgram: presaleInstance.program,
        presaleAccount: presaleInstance.presaleAccount,
        owner: parsedUserAddress,
        operator: operatorKeypair.publicKey,
        payer: parsedUserAddress,
        registryIndex: whitelisted.registryIndex,
        depositCap: whitelisted.depositCap,
      });

      if (!initEscrowIx) {
        return res.status(400).send("Escrow already exists");
      }

      if (!req.query.amount) {
        return res.status(400).send("Amount is required");
      }

      let amount: BN;

      try {
        amount = new BN(req.query.amount as string);
      } catch (error) {
        return res.status(400).send("Invalid amount format");
      }

      const depositIxs = await createDepositIx({
        presaleAccount: presaleInstance.presaleAccount,
        presaleProgram: presaleInstance.program,
        presaleAddress: parsedPresaleAddress,
        owner: parsedUserAddress,
        amount,
        transferHookAccountInfo: presaleInstance.quoteTransferHookAccountInfo,
        registryIndex: whitelisted.registryIndex,
      });

      const latestBlockhashInfo = await connection.getLatestBlockhash();

      const depositTx = new Transaction({
        ...latestBlockhashInfo,
        feePayer: parsedUserAddress,
      }).add(initEscrowIx, ...depositIxs);

      depositTx.partialSign(operatorKeypair);

      const serializedTx = depositTx.serialize({
        requireAllSignatures: false,
        verifySignatures: true,
      });

      const response: PartialSignedTransactionResponse = {
        serialized_transaction: Array.from(serializedTx),
      };

      return res.status(200).json(response);
    }
  );

  app.listen(8080, () => {
    console.log("Auth sign server is running on port 8080");
  });
}

const creatorKeypairFilepath = `${os.homedir()}/.config/solana/id.json`;
const creatorKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(creatorKeypairFilepath, "utf-8")))
);

const operatorKeypairFilepath = `${os.homedir()}/.config/solana/operator.json`;
const operatorKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(operatorKeypairFilepath, "utf-8")))
);

const presaleAddress = new PublicKey(
  "DpRrSp5tMv31cpa19bNHELGtFH6tymNGNBvLPCHxFezt"
);
const whitelistedAddresses: WhitelistedWallet[] = [
  {
    account: creatorKeypair.publicKey,
    depositCap: new BN(1000000000),
    registryIndex: new BN(0),
  },
];

const app = express();

startAuthSignServer(
  presaleAddress,
  whitelistedAddresses,
  operatorKeypair,
  app
).then(() => {
  return depositWithAuthority(connection, creatorKeypair, presaleAddress);
});
