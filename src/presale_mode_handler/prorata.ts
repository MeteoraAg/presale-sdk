import BN from "bn.js";
import {
  getBaseTokenSoldByDynamicPrice,
  getPresaleRemainingDepositQuota,
  PresaleHandler,
} from ".";
import { IPresaleRegistryWrapper } from "../accounts/presale_registry_wrapper";
import { IPresaleWrapper } from "../accounts/presale_wrapper";

export class ProrataHandler implements PresaleHandler {
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
    return true;
  }
}
