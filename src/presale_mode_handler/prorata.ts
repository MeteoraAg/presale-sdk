import BN from "bn.js";
import {
  getBaseTokenSoldByDynamicPrice,
  getPresaleRemainingDepositQuota,
  PresaleHandler,
} from ".";
import { IPresaleRegistryWrapper } from "../accounts/presale_registry_wrapper";
import { IPresaleWrapper } from "../accounts/presale_wrapper";
import { U64_MAX } from "../type";

export class ProrataHandler implements PresaleHandler {
  getRemainingDepositQuota(presaleWrapper: IPresaleWrapper): BN {
    return U64_MAX;
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

  suggestDepositAmount(maxAmount: BN, remainingDepositAmount: BN): BN {
    return BN.min(maxAmount, remainingDepositAmount);
  }

  suggestWithdrawAmount(maxAmount: BN): BN {
    return maxAmount;
  }

  earlierEndOnceCapReached(): boolean {
    return false;
  }
}
