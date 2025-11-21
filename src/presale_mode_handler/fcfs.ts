import BN from "bn.js";
import {
  getBaseTokenSoldByDynamicPrice,
  getSchemaFromRawData,
  PresaleHandler,
} from ".";
import { IPresaleRegistryWrapper } from "../accounts/presale_registry_wrapper";
import { IPresaleWrapper } from "../accounts/presale_wrapper";
import { seq, struct, u8 } from "@solana/buffer-layout";
import { u128 } from "@solana/buffer-layout-utils";

interface ISchema {
  disableEarlierPresaleEndOnceCapReached: number;
  padding0: number[];
  padding1: bigint[];
}

const SCHEMA_DATA = struct<ISchema>([
  u8("disableEarlierPresaleEndOnceCapReached"),
  seq(u8(), 15, "padding0"),
  seq(u128(), 2, "padding1"),
]);

export class FcfsHandler implements PresaleHandler {
  private disableEarlierPresaleEndOnceCapReached: boolean;

  constructor(presaleModRawData: BN[]) {
    const decoded = getSchemaFromRawData(SCHEMA_DATA, presaleModRawData);

    this.disableEarlierPresaleEndOnceCapReached =
      decoded.disableEarlierPresaleEndOnceCapReached == 1;
  }

  getRemainingDepositQuota(presaleWrapper: IPresaleWrapper): BN {
    const globalRemainingQuota = presaleWrapper
      .getPresaleMaximumRawCap()
      .sub(presaleWrapper.getTotalDepositRawAmount());

    return globalRemainingQuota;
  }

  getRegistryRemainingDepositQuota(
    presaleWrapper: IPresaleWrapper,
    registryIndex: BN
  ): BN {
    const globalRemainingQuota = this.getRemainingDepositQuota(presaleWrapper);
    const presaleRegistry = presaleWrapper.getPresaleRegistry(registryIndex);
    return BN.min(
      globalRemainingQuota,
      presaleRegistry.getBuyerMaximumRawDepositCap()
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

  earlierEndOnceCapReached(): boolean {
    return !this.disableEarlierPresaleEndOnceCapReached;
  }
}
