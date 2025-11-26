import BN from "bn.js";
import { getSchemaFromRawData, PresaleHandler } from ".";
import { IPresaleRegistryWrapper } from "../accounts/presale_registry_wrapper";
import { IPresaleWrapper } from "../accounts/presale_wrapper";
import { seq, struct, u8 } from "@solana/buffer-layout";
import { u128 } from "@solana/buffer-layout-utils";

function calculateQuoteTokenWithoutSurplus(amount: BN, qPrice: BN): BN {
  const baseTokenAmount = amount.shln(64).div(qPrice);
  const { div: quoteTokenAmount, mod } = baseTokenAmount
    .mul(qPrice)
    .divmod(new BN(2).pow(new BN(64)));

  return mod.isZero() ? quoteTokenAmount : quoteTokenAmount.add(new BN(1));
}

interface ISchema {
  qPrice: bigint;
  disableWithdraw: number;
  disableEarlierPresaleEndOnceCapReached: number;
  padding0: number[];
  padding1: bigint;
}

const SCHEMA_DATA = struct<ISchema>([
  u128("qPrice"),
  u8("disableWithdraw"),
  u8("disableEarlierPresaleEndOnceCapReached"),
  seq(u8(), 14, "padding0"),
  u128("padding1"),
]);

export class FixedPricePresaleHandler implements PresaleHandler {
  public qPrice: BN;
  private disableWithdraw: boolean;
  private disableEarlierPresaleEndOnceCapReached: boolean;

  constructor(presaleModRawData: BN[]) {
    const decoded = getSchemaFromRawData(SCHEMA_DATA, presaleModRawData);

    this.qPrice = new BN(decoded.qPrice.toString());
    this.disableWithdraw = decoded.disableWithdraw == 1;
    this.disableEarlierPresaleEndOnceCapReached =
      decoded.disableEarlierPresaleEndOnceCapReached == 1;
  }

  getRemainingDepositQuota(presaleWrapper: IPresaleWrapper): BN {
    const totalRegistryRemainingQuota = presaleWrapper
      .getAllPresaleRegistries()
      .reduce((acc, registry) => {
        const registryRemainingQuota = this.getRegistryRemainingDepositQuota(
          presaleWrapper,
          new BN(registry.getRegistryIndex())
        );
        return acc.add(registryRemainingQuota);
      }, new BN(0));
    return totalRegistryRemainingQuota;
  }

  getRegistryRemainingDepositQuota(
    presaleWrapper: IPresaleWrapper,
    registryIndex: BN
  ): BN {
    const presaleRegistry = presaleWrapper.getPresaleRegistry(registryIndex);
    const globalRemainingQuota = presaleWrapper
      .getPresaleMaximumRawCap()
      .sub(presaleWrapper.getTotalDepositRawAmount());

    const totalBaseTokenSold =
      this.getRegistryTotalBaseTokenSold(presaleRegistry);

    const remainingBaseToken = presaleRegistry
      .getPresaleRawSupply()
      .sub(totalBaseTokenSold);

    const { div, mod } = remainingBaseToken
      .mul(this.qPrice)
      .divmod(new BN(2).pow(new BN(64)));

    const remainingQuoteToken = mod.isZero() ? div : div.add(new BN(1));
    return BN.min(globalRemainingQuota, remainingQuoteToken);
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
    const totalTokenSold = qTotalDeposit.div(this.qPrice);
    return BN.min(totalTokenSold, presaleSupply);
  }

  canWithdraw(): boolean {
    return !this.disableWithdraw;
  }

  suggestDepositAmount(maxAmount: BN, remainingDepositAmount: BN): BN {
    const depositAmount = BN.min(maxAmount, remainingDepositAmount);
    return calculateQuoteTokenWithoutSurplus(depositAmount, this.qPrice);
  }

  suggestWithdrawAmount(maxAmount: BN): BN {
    return calculateQuoteTokenWithoutSurplus(maxAmount, this.qPrice);
  }

  earlierEndOnceCapReached(): boolean {
    return !this.disableEarlierPresaleEndOnceCapReached;
  }
}
