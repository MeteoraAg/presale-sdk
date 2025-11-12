import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import Presale from "../src/presale";
import { BN } from "bn.js";

async function showPresaleDetails(
  connection: Connection,
  presaleAddress: PublicKey
) {
  const presaleInstance = await Presale.create(connection, presaleAddress);
  const presaleWrapper = presaleInstance.getParsedPresale();

  console.log("================================");
  console.log("=== Presale Detailed Info ===");
  console.log("================================");
  const presaleAccount = presaleWrapper.getPresaleAccount();
  console.log("Owner:", presaleAccount.owner.toBase58());
  console.log("Presale Mint:", presaleAccount.baseMint.toBase58());
  console.log("Quote Mint:", presaleAccount.quoteMint.toBase58());
  console.log("PresaleMode", presaleWrapper.getPresaleModeName());
  console.log("WhitelistMode", presaleWrapper.getWhitelistModeName());
  console.log("Total Deposit Amount", presaleWrapper.getTotalDepositUiAmount());
  console.log(
    "Total Base Token Sold",
    presaleWrapper.getUiTotalBaseTokenSold()
  );
  console.log(
    "Remaining Deposit Quota:",
    presaleWrapper.getRemainingDepositUiQuota()
  );
  console.log("Presale Minimum Cap:", presaleWrapper.getPresaleMinimumUiCap());
  console.log("Presale Maximum Cap:", presaleWrapper.getPresaleMaximumUiCap());
  console.log("Can Deposit:", presaleWrapper.canDeposit());
  console.log("Can Claim:", presaleWrapper.canClaim());
  console.log("Can Withdraw:", presaleWrapper.canWithdraw());
  console.log(
    "Can Withdraw Remaining Quote:",
    presaleWrapper.canWithdrawRemainingQuote()
  );
  console.log(
    "Can Creator Collect Fee:",
    presaleWrapper.canCreatorCollectFee()
  );
  console.log("Can Creator Withdraw:", presaleWrapper.canCreatorWithdraw());
  console.log(
    "Presale Progress Percentage:",
    presaleWrapper.getPresaleProgressPercentage()
  );
  console.log(
    "Immediate release percentage:",
    presaleWrapper.getImmediateReleasePercentage()
  );
  console.log(
    "Immediate release amount",
    presaleWrapper.getImmediateReleaseUiAmount()
  );
  const presaleTimings = presaleWrapper.getTimings();
  console.log("Presale Start Time:", presaleTimings.presaleStartTime);
  console.log("Presale End Time:", presaleTimings.presaleEndTime);
  console.log("Immediate Release Time:", presaleTimings.immediateReleaseTime);
  console.log("Lock Start Time:", presaleTimings.lockStartTime);
  console.log("Lock End Time:", presaleTimings.lockEndTime);
  console.log("Vesting Start Time:", presaleTimings.vestingStartTime);
  console.log("Vesting End Time:", presaleTimings.vestingEndTime);
  console.log("Subject to early end:", presaleTimings.subjectToEarlyEnd);

  const presaleRegistries = presaleWrapper.getAllPresaleRegistries();
  console.log("Total Registries:", presaleRegistries.length);

  console.log("================================");
  console.log("=== Presale Registries ===");
  console.log("================================");

  for (const registry of presaleRegistries) {
    console.log("Registry index:", registry.getRegistryIndex());
    console.log("Total Deposit Amount:", registry.getTotalDepositUiAmount());
    console.log("Presale supply", registry.getPresaleUiSupply());
    console.log(
      "Buyer Minimum Deposit Cap:",
      registry.getBuyerMinimumUiDepositCap()
    );
    console.log(
      "Buyer Maximum Deposit Cap:",
      registry.getBuyerMaximumUiDepositCap()
    );
    console.log(
      "Total Deposit Fee:",
      registry.getTotalDepositFeeUiAmount().toString()
    );
    console.log("Deposit Fee (bps):", registry.getDepositFeeBps());
    console.log("Deposit Fee (%):", registry.getDepositFeePercentage());
    console.log("Token Price:", registry.getTokenPrice());
    console.log(
      "Total escrow:",
      registry.getPresaleRegistry().totalEscrow.toString()
    );
    console.log("Total sold token", registry.getTotalBaseTokenSoldUiAmount());

    const escrows = await presaleInstance.getEscrowsByPresaleRegistry(
      new BN(registry.getRegistryIndex())
    );
    console.log("Escrows", escrows);
  }
}

const connection = new Connection(clusterApiUrl("devnet"));

const presaleAddress = new PublicKey(
  "AYb7uKV5n1qXoZticLPTiHjpXsHmCyw56uvwqchQYu5a"
);

showPresaleDetails(connection, presaleAddress);
