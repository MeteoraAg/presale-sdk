import BN from "bn.js";
import { PresaleAccount, PresaleMode, PresaleRegistry } from "../type";
import { FixedPricePresaleHandler } from "./fixed_price";
import { ProrataHandler } from "./prorata";
import { FcfsHandler } from "./fcfs";
import { IPresaleWrapper } from "../accounts/presale_wrapper";
import { IPresaleRegistryWrapper } from "../accounts/presale_registry_wrapper";

export function getPresaleRemainingDepositQuota(
  presaleMaximumCap: BN,
  totalDeposit: BN
): BN {
  return BN.max(presaleMaximumCap.sub(totalDeposit), new BN(0));
}

export function getBaseTokenSoldByDynamicPrice(
  totalDeposit: BN,
  presaleSupply: BN
): BN {
  if (totalDeposit.isZero() || presaleSupply.isZero()) {
    return new BN(0);
  }

  return presaleSupply;
}

export interface PresaleHandler {
  getRemainingDepositQuota(presaleWrapper: IPresaleWrapper): BN;
  getTotalBaseTokenSold(presaleWrapper: IPresaleWrapper): BN;
  getRegistryTotalBaseTokenSold(presaleRegistry: IPresaleRegistryWrapper): BN;
  canWithdraw(): boolean;
}

export function getPresaleHandler(
  presaleMode: PresaleMode,
  qPrice: BN
): PresaleHandler {
  switch (presaleMode) {
    case PresaleMode.FixedPrice:
      return new FixedPricePresaleHandler(qPrice);
    case PresaleMode.Prorata:
      return new ProrataHandler();
    case PresaleMode.Fcfs:
      return new FcfsHandler();
    default:
      throw new Error("Unsupported presale type");
  }
}
