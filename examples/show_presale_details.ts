import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import Presale from "../src/presale";

async function showPresaleDetails(
  connection: Connection,
  presaleAddress: PublicKey
) {
  const presaleInstance = await Presale.create(connection, presaleAddress);
  const presaleWrapper = presaleInstance.getParsedPresale();

  const canDeposit = presaleWrapper.canDeposit();
  const canClaim = presaleWrapper.canClaim();
  const canWithdraw = presaleWrapper.canWithdraw();
  const canWithdrawRemainingQuoteAmount =
    presaleWrapper.canWithdrawRemainingQuote();
  const canCreatorWithdraw = presaleWrapper.canCreatorWithdraw();

  const presaleProgress = presaleWrapper.getPresaleProgressPercentage();
  const remainingDepositQuota = presaleWrapper.getRemainingDepositUiQuota();
  const totalDepositAmount = presaleWrapper.getTotalDepositUiAmount();
  const totalBaseTokenSold = presaleWrapper.getUiTotalBaseTokenSold();
  const averageTokenPrice = presaleWrapper.getAverageTokenPrice();

  console.log("Presale Details:", presaleWrapper.getPresaleAccount());
  console.log("Can Deposit:", canDeposit);
  console.log("Can Claim:", canClaim);
  console.log("Can Withdraw:", canWithdraw);
  console.log(
    "Can Withdraw Remaining Quote Amount:",
    canWithdrawRemainingQuoteAmount
  );
  console.log("Can Creator Withdraw:", canCreatorWithdraw);
  console.log("Presale Progress Percentage:", presaleProgress);
  console.log("Remaining Deposit Quota:", remainingDepositQuota);
  console.log("Total Deposit Amount:", totalDepositAmount);
  console.log("Total Base Token Sold:", totalBaseTokenSold);
  console.log("Average Token Price:", averageTokenPrice);
  console.log(
    "Presale progress state:",
    presaleWrapper.getPresaleProgressState()
  );

  const presaleRegistries = presaleWrapper.getPresaleRegistries();
  for (const registry of presaleRegistries) {
    console.log("Presale registry details:", registry.getPresaleRegistry());
    console.log(
      "Remaining deposit amount:",
      registry.getRemainingDepositAmount(
        presaleWrapper.getRemainingDepositAmount(),
        presaleWrapper.getTotalDepositAmount()
      )
    );
  }
}

const connection = new Connection(clusterApiUrl("devnet"));

const presaleAddress = new PublicKey(
  "GStMrk5xbeYXM2fvoHUCd6qyyFyegZRfnADsQec1xviA"
);

showPresaleDetails(connection, presaleAddress);
