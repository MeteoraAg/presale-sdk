import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import os from "os";
import Presale from "../src/presale";
import { BN } from "bn.js";
import { getOnChainTimestamp } from "../src";

async function showEscrowDetails(
  connection: Connection,
  presaleAddress: PublicKey,
  ownerAddress: PublicKey
) {
  const presaleInstance = await Presale.create(connection, presaleAddress);
  const presaleWrapper = presaleInstance.getParsedPresale();
  const escrows = await presaleInstance.getPresaleEscrowByOwner(ownerAddress);

  for (const escrow of escrows) {
    console.log("Escrow raw details:", escrow.getEscrowAccount());

    console.log("Deposited amount:", escrow.getDepositUiAmount());
    console.log(
      "Remaining deposit amount:",
      escrow.getRemainingDepositUiAmount(presaleWrapper)
    );
    console.log(
      "Can withdraw remaining quote amount:",
      escrow.canWithdrawRemainingQuoteAmount(presaleWrapper)
    );
    console.log(
      "Withdrawable remaining quote amount:",
      escrow.getWithdrawableRemainingQuoteUiAmount(presaleWrapper)
    );
    console.log(
      "Total claimable amount:",
      escrow.getTotalClaimableUiAmount(presaleWrapper)
    );
    console.log(
      "Pending claimable amount:",
      escrow.getPendingClaimableUiAmount(
        presaleWrapper,
        await getOnChainTimestamp(connection).then((ts) => Number(ts))
      )
    );
    console.log("Claimed amount", escrow.getClaimedUiAmount());
    console.log("Individual cap:", escrow.getIndividualDepositUiCap());
    console.log(
      "Suggested deposit amount:",
      escrow.suggestDepositAmount(presaleWrapper, new BN(333_333)).toString()
    );
  }
}

const connection = new Connection(clusterApiUrl("devnet"));
const keypairFilepath = `${os.homedir()}/.config/solana/id.json`;
const keypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(keypairFilepath, "utf-8")))
);

const presaleAddress = new PublicKey(
  "59Av19ft9HjpitcN2VoEXvMiA8nrTh7WvNHVtZRhdaoi"
);

showEscrowDetails(connection, presaleAddress, keypair.publicKey);
