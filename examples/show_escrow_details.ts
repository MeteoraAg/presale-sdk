import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import os from "os";
import Presale from "../src/presale";

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
      escrow.getPendingClaimableUiAmount(presaleWrapper)
    );
    console.log("Claimed amount", escrow.getClaimedUiAmount());
    console.log("Individual cap:", escrow.getIndividualDepositUiCap());
  }
}

const connection = new Connection(clusterApiUrl("devnet"));
const keypairFilepath = `${os.homedir()}/.config/solana/id.json`;
const keypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(keypairFilepath, "utf-8")))
);

const presaleAddress = new PublicKey(
  "H7pDwguN8f2mxg8gtyBwbKopW5ENRFMnWxYHGAG1hM6L"
);

showEscrowDetails(connection, presaleAddress, keypair.publicKey);
