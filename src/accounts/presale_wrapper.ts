import BN from "bn.js";
import Decimal from "decimal.js";
import { PresaleAccount, PresaleMode, PresaleProgress, U64_MAX } from "../type";
import {
  IPresaleRegistryWrapper,
  PresaleRegistryWrapper,
} from "./presale_registry_wrapper";

function getPresaleRemainingDepositQuota(presaleAccount: PresaleAccount): BN {
  const { presaleMaximumCap, totalDeposit } = presaleAccount;
  return presaleMaximumCap.sub(totalDeposit);
}

function getLamportPriceDynamic(presaleSupply: BN, totalDeposit: BN): Decimal {
  if (totalDeposit.isZero()) {
    return new Decimal(0);
  }

  const presaleSupplyDecimal = new Decimal(presaleSupply.toString());
  const totalDepositDecimal = new Decimal(totalDeposit.toString());

  return totalDepositDecimal.div(presaleSupplyDecimal);
}

function calculateQuoteTokenWithoutSurplus(amount: BN, qPrice: BN): BN {
  const baseTokenAmount = amount.shln(64).div(qPrice);
  const { div: quoteTokenAmount, mod } = baseTokenAmount
    .mul(qPrice)
    .divmod(new BN(2).pow(new BN(64)));

  return mod.isZero() ? quoteTokenAmount : quoteTokenAmount.add(new BN(1));
}

interface IPresaleHandler {
  getRemainingDepositQuota(presaleAccount: PresaleAccount): BN;
  getTotalBasedTokenSold(
    presaleRegistry: IPresaleRegistryWrapper,
    qPrice: BN
  ): BN;
  canWithdraw(): boolean;
  getLamportPrice(presaleSupply: BN, totalDeposit: BN, qPrice: BN): Decimal;
  suggestDepositAmount(
    maxAmount: BN,
    remainingDepositAmount: BN,
    qPrice: BN
  ): BN;
  suggestWithdrawAmount(maxAmount: BN, qPrice: BN): BN;
}

class ProrataHandler implements IPresaleHandler {
  getRemainingDepositQuota(_presaleAccount: PresaleAccount): BN {
    return U64_MAX;
  }

  getTotalBasedTokenSold(
    presaleRegistry: IPresaleRegistryWrapper,
    _qPrice: BN
  ): BN {
    if (presaleRegistry.getPresaleRegistry().totalDeposit.isZero()) {
      return new BN(0);
    }

    return presaleRegistry.getPresaleRegistry().presaleSupply;
  }

  canWithdraw(): boolean {
    return true;
  }

  getLamportPrice(presaleSupply: BN, totalDeposit: BN, _qPrice: BN): Decimal {
    return getLamportPriceDynamic(presaleSupply, totalDeposit);
  }

  suggestDepositAmount(
    maxAmount: BN,
    remainingDepositAmount: BN,
    _qPrice: BN
  ): BN {
    return BN.min(maxAmount, remainingDepositAmount);
  }

  suggestWithdrawAmount(maxAmount: BN, _qPrice: BN): BN {
    return maxAmount;
  }
}

class FixedPricePresaleHandler implements IPresaleHandler {
  getRemainingDepositQuota(presaleAccount: PresaleAccount): BN {
    return getPresaleRemainingDepositQuota(presaleAccount);
  }

  getTotalBasedTokenSold(
    presaleRegistry: IPresaleRegistryWrapper,
    qPrice: BN
  ): BN {
    const rawPresaleRegistry = presaleRegistry.getPresaleRegistry();

    if (rawPresaleRegistry.totalDeposit.isZero()) {
      return new BN(0);
    }

    return rawPresaleRegistry.totalDeposit.shln(64).div(qPrice);
  }

  canWithdraw(): boolean {
    return true;
  }

  getLamportPrice(_presaleSupply: BN, _totalDeposit: BN, qPrice: BN): Decimal {
    const qPriceDecimal = new Decimal(qPrice.toString());
    return qPriceDecimal.div(new Decimal(2).pow(64));
  }

  suggestDepositAmount(
    maxAmount: BN,
    remainingDepositAmount: BN,
    qPrice: BN
  ): BN {
    const depositAmount = BN.min(maxAmount, remainingDepositAmount);
    return calculateQuoteTokenWithoutSurplus(depositAmount, qPrice);
  }

  suggestWithdrawAmount(maxAmount: BN, qPrice: BN): BN {
    return calculateQuoteTokenWithoutSurplus(maxAmount, qPrice);
  }
}

class FcfsHandler implements IPresaleHandler {
  getRemainingDepositQuota(presaleAccount: PresaleAccount): BN {
    return getPresaleRemainingDepositQuota(presaleAccount);
  }

  getTotalBasedTokenSold(
    presaleRegistry: IPresaleRegistryWrapper,
    _qPrice: BN
  ): BN {
    if (presaleRegistry.getPresaleRegistry().totalDeposit.isZero()) {
      return new BN(0);
    }

    return presaleRegistry.getPresaleRegistry().presaleSupply;
  }

  canWithdraw(): boolean {
    return false;
  }

  getLamportPrice(presaleSupply: BN, totalDeposit: BN, qPrice: BN): Decimal {
    return getLamportPriceDynamic(presaleSupply, totalDeposit);
  }

  suggestDepositAmount(
    maxAmount: BN,
    remainingDepositAmount: BN,
    _qPrice: BN
  ): BN {
    return BN.min(maxAmount, remainingDepositAmount);
  }

  suggestWithdrawAmount(_maxAmount: BN, _qPrice: BN): BN {
    return new BN(0);
  }
}

export function getPresaleHandler(presaleMode: number): IPresaleHandler {
  switch (presaleMode) {
    case PresaleMode.FixedPrice:
      return new FixedPricePresaleHandler();
    case PresaleMode.Prorata:
      return new ProrataHandler();
    case PresaleMode.Fcfs:
      return new FcfsHandler();
    default:
      throw new Error("Unsupported presale type");
  }
}

export interface IPresaleWrapper {
  getPresaleAccount(): PresaleAccount;
  getTotalBaseTokenSold(): BN;
  getUiTotalBaseTokenSold(): number;
  getPresaleProgressState(): PresaleProgress;
  getPresaleProgressPercentage(): number;
  canDeposit(): boolean;
  canWithdraw(): boolean;
  canWithdrawRemainingQuote(): boolean;
  canClaim(): boolean;
  canCreatorWithdraw(): boolean;
  getCreatorWithdrawableToken(): {
    amount: BN;
    uiAmount: number;
    isBaseToken: boolean;
  };
  getRemainingDepositQuota(): BN;
  getRemainingDepositUiQuota(): number;
  getTotalDepositAmount(): BN;
  getTotalDepositUiAmount(): number;
  getAverageTokenPrice(): number;
  getRemainingDepositAmount(): BN;

  getPresaleRegistries(): IPresaleRegistryWrapper[];
  getPresaleRegistryByIndex(index: BN): IPresaleRegistryWrapper | null;
  getTokenPriceByRegistry(registryIndex: BN): number;
  getTotalBaseTokenSoldByRegistry(registryIndex: BN): BN;
  getUiTotalBaseTokenSoldByRegistry(registryIndex: BN): number;
}

export class PresaleWrapper implements IPresaleWrapper {
  public presaleAccount: PresaleAccount;
  public baseDecimals: number;
  public quoteDecimals: number;

  constructor(
    presaleAccount: PresaleAccount,
    baseDecimals: number,
    quoteDecimals: number
  ) {
    this.presaleAccount = presaleAccount;
    this.baseDecimals = baseDecimals;
    this.quoteDecimals = quoteDecimals;
  }

  public getPresaleAccount(): PresaleAccount {
    return this.presaleAccount;
  }

  public getTotalBaseTokenSold(): BN {
    const { presaleMode, fixedPricePresaleQPrice } = this.presaleAccount;
    const presaleHandler = getPresaleHandler(presaleMode);
    const presaleRegistries = this.getPresaleRegistries();

    const totalBaseTokenSold = presaleRegistries.reduce((acc, registry) => {
      const tokenSold = presaleHandler.getTotalBasedTokenSold(
        registry,
        fixedPricePresaleQPrice
      );
      return acc.add(tokenSold);
    }, new BN(0));

    return totalBaseTokenSold;
  }

  public getUiTotalBaseTokenSold(): number {
    const totalBaseTokenSold = this.getTotalBaseTokenSold();
    return new Decimal(totalBaseTokenSold.toString())
      .div(new Decimal(10).pow(this.baseDecimals))
      .toNumber();
  }

  public getPresaleProgressPercentage() {
    const totalDeposit = Math.min(
      this.presaleAccount.totalDeposit.toNumber(),
      this.presaleAccount.presaleMaximumCap.toNumber()
    );

    return (
      (totalDeposit * 100.0) / this.presaleAccount.presaleMaximumCap.toNumber()
    );
  }

  public getPresaleProgressState(): PresaleProgress {
    return getPresaleProgressState(this.presaleAccount);
  }

  public canDeposit(): boolean {
    return this.getPresaleProgressState() == PresaleProgress.Ongoing;
  }

  public canWithdraw(): boolean {
    const isPresaleModeSupportWithdraw = getPresaleHandler(
      this.presaleAccount.presaleMode
    ).canWithdraw();

    return isPresaleModeSupportWithdraw
      ? this.getPresaleProgressState() == PresaleProgress.Ongoing
      : false;
  }

  public canWithdrawRemainingQuote(): boolean {
    const presaleProgress = this.getPresaleProgressState();
    const { presaleMode } = this.presaleAccount;
    return (
      (presaleProgress === PresaleProgress.Completed &&
        presaleMode === PresaleMode.Prorata) ||
      presaleProgress === PresaleProgress.Failed
    );
  }

  public canClaim(): boolean {
    if (this.getPresaleProgressState() != PresaleProgress.Completed) {
      return false;
    }

    const currentTime = Date.now() / 1000; // Convert to seconds
    const { vestingStartTime, immediateReleaseBps } = this.presaleAccount;

    if (immediateReleaseBps > 0) {
      return true;
    }

    return currentTime >= vestingStartTime.toNumber();
  }

  public canCreatorWithdraw(): boolean {
    const presaleProgress = this.getPresaleProgressState();
    const { hasCreatorWithdrawn } = this.presaleAccount;
    return (
      (presaleProgress === PresaleProgress.Completed ||
        presaleProgress === PresaleProgress.Failed) &&
      hasCreatorWithdrawn != 1
    );
  }

  public getCreatorWithdrawableToken(): {
    amount: BN;
    uiAmount: number;
    isBaseToken: boolean;
  } {
    const presaleProgress = this.getPresaleProgressState();
    const { totalDeposit, presaleSupply, presaleMaximumCap } =
      this.presaleAccount;
    switch (presaleProgress) {
      case PresaleProgress.Completed: {
        return {
          amount: BN.min(totalDeposit, presaleMaximumCap),
          uiAmount: new Decimal(totalDeposit.toString())
            .div(new Decimal(10).pow(this.quoteDecimals))
            .toNumber(),
          isBaseToken: false,
        };
      }
      case PresaleProgress.Failed: {
        return {
          amount: presaleSupply,
          uiAmount: new Decimal(presaleSupply.toString())
            .div(new Decimal(10).pow(this.baseDecimals))
            .toNumber(),
          isBaseToken: true,
        };
      }
      default: {
        return {
          amount: new BN(0),
          uiAmount: 0,
          isBaseToken: false,
        };
      }
    }
  }

  public getRemainingDepositQuota(): BN {
    return getPresaleHandler(
      this.presaleAccount.presaleMode
    ).getRemainingDepositQuota(this.presaleAccount);
  }

  public getRemainingDepositUiQuota(): number {
    const remainingDepositQuota = this.getRemainingDepositQuota();
    return new Decimal(remainingDepositQuota.toString())
      .div(new Decimal(10).pow(this.quoteDecimals))
      .toNumber();
  }

  public getTotalDepositAmount(): BN {
    return this.presaleAccount.totalDeposit;
  }

  public getTotalDepositUiAmount(): number {
    const totalDeposit = this.getTotalDepositAmount();
    return new Decimal(totalDeposit.toString())
      .div(new Decimal(10).pow(this.quoteDecimals))
      .toNumber();
  }

  public getTokenPriceByRegistry(registryIndex: BN): number {
    const presaleRegistry = this.getPresaleRegistryByIndex(registryIndex);

    if (!presaleRegistry) {
      return 0;
    }

    const { presaleMode, fixedPricePresaleQPrice } = this.presaleAccount;
    const { presaleSupply, totalDeposit } =
      presaleRegistry.getPresaleRegistry();

    const presaleHandler = getPresaleHandler(presaleMode);
    const lamportPrice = presaleHandler.getLamportPrice(
      presaleSupply,
      totalDeposit,
      fixedPricePresaleQPrice
    );

    return new Decimal(lamportPrice)
      .mul(new Decimal(10).pow(this.baseDecimals - this.quoteDecimals))
      .toNumber();
  }

  // When the presale mode is dynamic price, the aggregated token price will be weighted (presale supply) average price
  public getAverageTokenPrice(): number {
    const { presaleMode, fixedPricePresaleQPrice } = this.presaleAccount;
    if (presaleMode === PresaleMode.FixedPrice) {
      return new Decimal(fixedPricePresaleQPrice.toString())
        .div(new Decimal(2).pow(64))
        .mul(new Decimal(10).pow(this.baseDecimals - this.quoteDecimals))
        .toNumber();
    }

    if (this.presaleAccount.totalDeposit.isZero()) {
      return 0;
    }

    const presaleRegistries = this.getPresaleRegistries();

    let totalWeightedTokenPrice = new Decimal(0);
    let totalEffectivePresaleSupply = new BN(0);

    for (const registry of presaleRegistries) {
      const rawPresaleRegistry = registry.getPresaleRegistry();

      totalEffectivePresaleSupply = totalEffectivePresaleSupply.add(
        rawPresaleRegistry.presaleSupply
      );

      const tokenPrice = this.getTokenPriceByRegistry(registry.registryIndex());
      const weightedTokenPrice = new Decimal(tokenPrice).mul(
        new Decimal(rawPresaleRegistry.presaleSupply.toString())
      );
      totalWeightedTokenPrice = totalWeightedTokenPrice.add(weightedTokenPrice);
    }

    return totalWeightedTokenPrice
      .div(new Decimal(totalEffectivePresaleSupply.toString()))
      .mul(new Decimal(10).pow(this.baseDecimals - this.quoteDecimals))
      .toNumber();
  }

  public getPresaleRegistryByIndex(index: BN): IPresaleRegistryWrapper | null {
    const presaleRegistries = this.getPresaleRegistries();
    return presaleRegistries.find((registry) =>
      registry.registryIndex().eq(index)
    );
  }

  public getPresaleRegistries(): IPresaleRegistryWrapper[] {
    const presaleRegistryWrappers = this.presaleAccount.presaleRegistries.map(
      (registry, idx) => {
        return new PresaleRegistryWrapper(registry, new BN(idx));
      }
    );

    return presaleRegistryWrappers.filter((wrapper) => !wrapper.uninitialize());
  }

  public getTotalBaseTokenSoldByRegistry(registryIndex: BN): BN {
    const presaleRegistry = this.getPresaleRegistryByIndex(registryIndex);

    if (!presaleRegistry) {
      return new BN(0);
    }

    const { presaleMode, fixedPricePresaleQPrice } = this.presaleAccount;
    const presaleHandler = getPresaleHandler(presaleMode);
    return presaleHandler.getTotalBasedTokenSold(
      presaleRegistry,
      fixedPricePresaleQPrice
    );
  }

  public getUiTotalBaseTokenSoldByRegistry(registryIndex: BN): number {
    const totalBaseTokenSold =
      this.getTotalBaseTokenSoldByRegistry(registryIndex);

    return new Decimal(totalBaseTokenSold.toString())
      .div(new Decimal(10).pow(this.baseDecimals))
      .toNumber();
  }

  public getRemainingDepositAmount(): BN {
    const { presaleMaximumCap, totalDeposit } = this.presaleAccount;
    return BN.max(presaleMaximumCap.sub(totalDeposit), new BN(0));
  }
}

export function getPresaleProgressState(
  presaleAccount: PresaleAccount
): PresaleProgress {
  const currentTime = Math.floor(Date.now() / 1000); // Convert to seconds

  if (currentTime < presaleAccount.presaleStartTime.toNumber()) {
    return PresaleProgress.NotStarted;
  } else if (currentTime <= presaleAccount.presaleEndTime.toNumber()) {
    return PresaleProgress.Ongoing;
  }

  if (presaleAccount.totalDeposit.gte(presaleAccount.presaleMinimumCap)) {
    return PresaleProgress.Completed;
  } else {
    return PresaleProgress.Failed;
  }
}
