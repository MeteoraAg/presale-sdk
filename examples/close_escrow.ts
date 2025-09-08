import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import os from "os";
import { PRESALE_PROGRAM_ID } from "../src";
import Presale from "../src/presale";
import { BN } from "bn.js";

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

  const escrows = await presaleInstance.getPresaleEscrowByOwner(user.publicKey);

  const closeEscrowTxs = await Promise.all(
    escrows.map(async (escrow) => {
      const escrowAccount = escrow.getEscrowAccount();
      return presaleInstance.closeEscrow({
        owner: escrowAccount.owner,
        registryIndex: new BN(escrowAccount.registryIndex),
      });
    })
  );

  await Promise.all(
    closeEscrowTxs.map(async (closeEscrowTx) => {
      closeEscrowTx.sign(user);

      const txSig = await connection.sendRawTransaction(
        closeEscrowTx.serialize()
      );
      console.log("Close escrow transaction sent:", txSig);

      await connection.confirmTransaction(
        {
          signature: txSig,
          lastValidBlockHeight: closeEscrowTx.lastValidBlockHeight,
          blockhash: closeEscrowTx.recentBlockhash,
        },
        "finalized"
      );
    })
  );
}

const keypairFilepath = `${os.homedir()}/.config/solana/id.json`;
const keypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(keypairFilepath, "utf-8")))
);

const presaleAddress = new PublicKey(
  "DpRrSp5tMv31cpa19bNHELGtFH6tymNGNBvLPCHxFezt"
);

closeEscrow(connection, presaleAddress, keypair);
