import BN from "bn.js";
import { getPresaleRemainingDepositQuota, PresaleHandler } from ".";
import { IPresaleRegistryWrapper } from "../accounts/presale_registry_wrapper";
import { IPresaleWrapper } from "../accounts/presale_wrapper";

export class FixedPricePresaleHandler implements PresaleHandler {
  public qPrice: BN;

  constructor(qPrice: BN) {
    this.qPrice = qPrice;
  }

  getRemainingDepositQuota(presaleWrapper: IPresaleWrapper): BN {
    return getPresaleRemainingDepositQuota(
      presaleWrapper.getPresaleMaximumRawCap(),
      presaleWrapper.getTotalDepositRawAmount()
    );
  }

  getTotalBaseTokenSold(presaleWrapper: IPresaleWrapper): BN {
    const presaleRegistries = presaleWrapper.getAllPresaleRegistries();
    return presaleRegistries.reduce((acc, registry) => {
      return acc.add(this.getRegistryTotalBaseTokenSold(registry));
    }, new BN(0));
  }

  getRegistryTotalBaseTokenSold(presaleRegistry: IPresaleRegistryWrapper): BN {
    const depositAmount = presaleRegistry.getTotalDepositRawAmount();
    const presaleSupply = presaleRegistry.getPresaleRawSupply();

    if (depositAmount.isZero() || presaleSupply.isZero()) {
      return new BN(0);
    }

    const qTotalDeposit = depositAmount.shln(64);
    return qTotalDeposit.div(this.qPrice);
  }

  canWithdraw(): boolean {
    return true;
  }
}
