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
  const escrow = await presaleInstance.getPresaleEscrowByOwner(ownerAddress);

  console.log("Escrow raw details:", escrow.getEscrowAccount());

  const depositedAmount = escrow.getDepositUiAmount();
  const remainingDepositAmount =
    escrow.getRemainingDepositUiAmount(presaleWrapper);
  const canWithdrawRemainingQuoteAmount =
    escrow.canWithdrawRemainingQuoteAmount(presaleWrapper);
  const withdrawableRemainingQuoteAmount =
    escrow.getWithdrawableRemainingQuoteUiAmount(presaleWrapper);
  const totalClaimableAmount = escrow.getTotalClaimableUiAmount(presaleWrapper);
  const pendingClaimableAmount =
    escrow.getPendingClaimableUiAmount(presaleWrapper);

  console.log("Deposited amount:", depositedAmount);
  console.log("Remaining deposit amount:", remainingDepositAmount);
  console.log(
    "Can withdraw remaining quote amount:",
    canWithdrawRemainingQuoteAmount
  );
  console.log(
    "Withdrawable remaining quote amount:",
    withdrawableRemainingQuoteAmount
  );
  console.log("Total claimable amount:", totalClaimableAmount);
  console.log("Pending claimable amount:", pendingClaimableAmount);
}

const connection = new Connection(clusterApiUrl("devnet"));
const keypairFilepath = `${os.homedir()}/.config/solana/id.json`;
const keypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(keypairFilepath, "utf-8")))
);

const presaleAddress = new PublicKey(
  "GStMrk5xbeYXM2fvoHUCd6qyyFyegZRfnADsQec1xviA"
);

showEscrowDetails(connection, presaleAddress, keypair.publicKey);
