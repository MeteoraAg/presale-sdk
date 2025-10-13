import BN from "bn.js";
import {
  getBaseTokenSoldByDynamicPrice,
  getPresaleRemainingDepositQuota,
  PresaleHandler,
} from ".";
import { IPresaleRegistryWrapper } from "../accounts/presale_registry_wrapper";
import { IPresaleWrapper } from "../accounts/presale_wrapper";

export class FcfsHandler implements PresaleHandler {
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
    return getBaseTokenSoldByDynamicPrice(
      presaleRegistry.getTotalDepositRawAmount(),
      presaleRegistry.getPresaleRawSupply()
    );
  }

  canWithdraw(): boolean {
    return false;
  }

  suggestDepositAmount(maxAmount: BN, remainingDepositAmount: BN): BN {
    return BN.min(maxAmount, remainingDepositAmount);
  }

  suggestWithdrawAmount(_maxAmount: BN): BN {
    return new BN(0);
  }
}
