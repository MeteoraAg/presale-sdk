import BN from "bn.js";
import Decimal from "decimal.js";
import {
  PresaleAccount,
  PresaleMode,
  PresaleProgress,
  WhitelistMode,
} from "../type";
import {
  IPresaleRegistryWrapper,
  PresaleRegistryWrapper,
} from "./presale_registry_wrapper";
import { getPresaleHandler } from "../presale_mode_handler";

export interface IPresaleWrapper {
  getPresaleAccount(): PresaleAccount;
  getTotalBaseTokenSold(): BN;
  getUiTotalBaseTokenSold(): number;
  getPresaleProgressState(): PresaleProgress;
  getPresaleProgressPercentage(): number;
  getPresaleModeName(): "FixedPrice" | "Prorata" | "Fcfs";
  getWhitelistModeName():
    | "PermissionWithMerkleProof"
    | "PermissionWithAuthority"
    | "Permissionless";
  getCreatorWithdrawableToken(): {
    amount: BN;
    uiAmount: number;
    isBaseToken: boolean;
  };
  getRemainingDepositRawQuota(): BN;
  getRemainingDepositUiQuota(): number;
  getTotalDepositRawAmount(): BN;
  getTotalDepositUiAmount(): number;
  getPresaleMinimumRawCap(): BN;
  getPresaleMinimumUiCap(): number;
  getPresaleMaximumRawCap(): BN;
  getPresaleMaximumUiCap(): number;
  getAllPresaleRegistries(): IPresaleRegistryWrapper[];
  getWithdrawableRemainingRawQuoteAmount(): BN;
  getWithdrawableRemainingQuoteUiAmount(): number;
  getImmediateReleaseBps(): number;
  getImmediateReleasePercentage(): number;
  getImmediateReleaseRawAmount(): BN;
  getImmediateReleaseUiAmount(): number;
  getPresaleRegistry(registryIndex: BN): IPresaleRegistryWrapper | null;
  getAverageTokenPrice(): number;
  canDeposit(): boolean;
  canWithdraw(): boolean;
  canWithdrawRemainingQuote(): boolean;
  canClaim(): boolean;
  canCreatorWithdraw(): boolean;
  canCreatorCollectFee(): boolean;
}

export class PresaleWrapper implements IPresaleWrapper {
  public presaleAccount: PresaleAccount;
  public baseDecimals: number;
  public quoteDecimals: number;
  public baseLamportToUiMultiplierFactor: number;
  public quoteLamportToUiMultiplierFactor: number;

  constructor(
    presaleAccount: PresaleAccount,
    baseDecimals: number,
    quoteDecimals: number
  ) {
    this.presaleAccount = presaleAccount;
    this.baseDecimals = baseDecimals;
    this.quoteDecimals = quoteDecimals;

    this.baseLamportToUiMultiplierFactor = Math.pow(10, baseDecimals);
    this.quoteLamportToUiMultiplierFactor = Math.pow(10, quoteDecimals);
  }

  public getPresaleAccount(): PresaleAccount {
    return this.presaleAccount;
  }

  public getTotalBaseTokenSold(): BN {
    return getPresaleHandler(
      this.presaleAccount.presaleMode,
      this.presaleAccount.fixedPricePresaleQPrice
    ).getTotalBaseTokenSold(this);
  }

  public getUiTotalBaseTokenSold(): number {
    const totalBaseTokenSold = this.getTotalBaseTokenSold();
    return new Decimal(totalBaseTokenSold.toString())
      .div(new Decimal(this.baseLamportToUiMultiplierFactor))
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
    switch (this.presaleAccount.presaleMode) {
      case PresaleMode.Prorata: {
        return this.getPresaleProgressState() == PresaleProgress.Ongoing;
      }
      default: {
        const presaleProgress = this.getPresaleProgressState();
        return (
          presaleProgress == PresaleProgress.Ongoing &&
          this.presaleAccount.totalDeposit.lt(
            this.presaleAccount.presaleMaximumCap
          )
        );
      }
    }
  }

  public canWithdraw(): boolean {
    const isPresaleModeSupportWithdraw = getPresaleHandler(
      this.presaleAccount.presaleMode,
      this.presaleAccount.fixedPricePresaleQPrice
    ).canWithdraw();

    return isPresaleModeSupportWithdraw
      ? this.getPresaleProgressState() == PresaleProgress.Ongoing
      : false;
  }

  public canWithdrawRemainingQuote(): boolean {
    const presaleProgress = this.getPresaleProgressState();
    return (
      (presaleProgress === PresaleProgress.Completed &&
        this.presaleAccount.presaleMode === PresaleMode.Prorata) ||
      presaleProgress === PresaleProgress.Failed
    );
  }

  public canClaim(): boolean {
    if (this.getPresaleProgressState() != PresaleProgress.Completed) {
      return false;
    }

    const currentTime = Date.now() / 1000; // Convert to seconds
    const { vestingStartTime } = this.presaleAccount;

    return currentTime >= vestingStartTime.toNumber();
  }

  public canCreatorWithdraw(): boolean {
    const presaleProgress = this.getPresaleProgressState();
    return (
      (presaleProgress === PresaleProgress.Completed ||
        presaleProgress === PresaleProgress.Failed) &&
      this.presaleAccount.hasCreatorWithdrawn != 1
    );
  }

  public getCreatorWithdrawableToken(): {
    amount: BN;
    uiAmount: number;
    isBaseToken: boolean;
  } {
    const presaleProgress = this.getPresaleProgressState();
    switch (presaleProgress) {
      case PresaleProgress.Completed: {
        const withdrawableAmount = BN.min(
          this.presaleAccount.totalDeposit,
          this.presaleAccount.presaleMaximumCap
        );
        return {
          amount: withdrawableAmount,
          uiAmount: new Decimal(withdrawableAmount.toString())
            .div(new Decimal(this.quoteLamportToUiMultiplierFactor))
            .toNumber(),
          isBaseToken: false,
        };
      }
      case PresaleProgress.Failed: {
        return {
          amount: this.presaleAccount.presaleSupply,
          uiAmount: new Decimal(this.presaleAccount.presaleSupply.toString())
            .div(new Decimal(this.baseLamportToUiMultiplierFactor))
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

  public getRemainingDepositRawQuota(): BN {
    return getPresaleHandler(
      this.presaleAccount.presaleMode,
      this.presaleAccount.fixedPricePresaleQPrice
    ).getRemainingDepositQuota(this);
  }

  public getRemainingDepositUiQuota(): number {
    const remainingDepositQuota = this.getRemainingDepositRawQuota();
    return new Decimal(remainingDepositQuota.toString())
      .div(new Decimal(10).pow(this.quoteDecimals))
      .toNumber();
  }

  public getTotalDepositRawAmount(): BN {
    return this.presaleAccount.totalDeposit;
  }

  public getTotalDepositUiAmount(): number {
    const totalDeposit = this.getTotalDepositRawAmount();
    return new Decimal(totalDeposit.toString())
      .div(new Decimal(10).pow(this.quoteDecimals))
      .toNumber();
  }

  public getAllPresaleRegistries(): IPresaleRegistryWrapper[] {
    const presaleRegistryWrappers = this.presaleAccount.presaleRegistries.map(
      (registry, index) =>
        new PresaleRegistryWrapper(
          registry,
          index,
          this.baseLamportToUiMultiplierFactor,
          this.quoteLamportToUiMultiplierFactor,
          this.presaleAccount
        )
    );

    return presaleRegistryWrappers.filter((wrapper) => wrapper.isInitialized());
  }

  public getPresaleModeName(): "FixedPrice" | "Prorata" | "Fcfs" {
    switch (this.presaleAccount.presaleMode) {
      case PresaleMode.FixedPrice:
        return "FixedPrice";
      case PresaleMode.Prorata:
        return "Prorata";
      case PresaleMode.Fcfs:
        return "Fcfs";
      default:
        throw new Error("Unsupported presale type");
    }
  }

  public getWhitelistModeName():
    | "PermissionWithMerkleProof"
    | "PermissionWithAuthority"
    | "Permissionless" {
    switch (this.presaleAccount.whitelistMode) {
      case WhitelistMode.Permissionless:
        return "Permissionless";
      case WhitelistMode.PermissionWithMerkleProof:
        return "PermissionWithMerkleProof";
      case WhitelistMode.PermissionWithAuthority:
        return "PermissionWithAuthority";
      default:
        throw new Error("Unsupported whitelist mode");
    }
  }

  public canCreatorCollectFee(): boolean {
    const presaleProgress = this.getPresaleProgressState();

    if (presaleProgress === PresaleProgress.Failed) {
      return false;
    }

    const currentTime = Date.now() / 1000; // Convert to seconds
    return (
      !Boolean(this.presaleAccount.depositFeeCollected) &&
      currentTime > this.presaleAccount.presaleEndTime.toNumber()
    );
  }

  public getPresaleMinimumRawCap(): BN {
    return this.presaleAccount.presaleMinimumCap;
  }

  public getPresaleMinimumUiCap(): number {
    return new Decimal(this.presaleAccount.presaleMinimumCap.toString())
      .div(new Decimal(10).pow(this.quoteDecimals))
      .toNumber();
  }

  public getPresaleMaximumRawCap(): BN {
    return this.presaleAccount.presaleMaximumCap;
  }

  public getPresaleMaximumUiCap(): number {
    return new Decimal(this.presaleAccount.presaleMaximumCap.toString())
      .div(new Decimal(10).pow(this.quoteDecimals))
      .toNumber();
  }

  public getWithdrawableRemainingRawQuoteAmount(): BN {
    if (this.presaleAccount.presaleMode !== PresaleMode.Prorata) {
      return new BN(0);
    }

    const presaleProgress = this.getPresaleProgressState();

    if (presaleProgress == PresaleProgress.Failed) {
      return this.presaleAccount.totalDeposit.add(
        this.presaleAccount.totalDepositFee
      );
    }

    const presaleRegistries = this.getAllPresaleRegistries();

    const totalRemainingQuote = presaleRegistries.reduce(
      (acc, registry) => acc.add(registry.getWithdrawableRemainingQuote()),
      new BN(0)
    );

    return totalRemainingQuote;
  }

  public getWithdrawableRemainingQuoteUiAmount(): number {
    return new Decimal(this.getWithdrawableRemainingRawQuoteAmount().toString())
      .div(new Decimal(this.quoteLamportToUiMultiplierFactor))
      .toNumber();
  }

  public getImmediateReleaseBps(): number {
    return this.presaleAccount.immediateReleaseBps;
  }

  public getImmediateReleasePercentage(): number {
    return this.presaleAccount.immediateReleaseBps / 100;
  }

  public getImmediateReleaseRawAmount(): BN {
    const totalBaseTokenSold = this.getTotalBaseTokenSold();
    return totalBaseTokenSold
      .mul(new BN(this.getImmediateReleaseBps()))
      .div(new BN(10000));
  }

  public getImmediateReleaseUiAmount(): number {
    const immediateReleaseRawAmount = this.getImmediateReleaseRawAmount();
    return new Decimal(immediateReleaseRawAmount.toString())
      .div(new Decimal(this.baseLamportToUiMultiplierFactor))
      .toNumber();
  }

  public getPresaleRegistry(registryIndex: BN): IPresaleRegistryWrapper | null {
    return this.getAllPresaleRegistries().find(
      (r) => r.getRegistryIndex() == registryIndex.toNumber()
    );
  }

  // When the presale mode is dynamic price, the aggregated token price will be weighted (presale supply) average price
  public getAverageTokenPrice(): number {
    const presaleRegistries = this.getAllPresaleRegistries();

    let totalWeightedTokenPrice = new Decimal(0);
    let totalEffectivePresaleSupply = new BN(0);

    for (const registry of presaleRegistries) {
      totalEffectivePresaleSupply = totalEffectivePresaleSupply.add(
        registry.getPresaleRawSupply()
      );

      const tokenPrice = registry.getTokenPrice();
      const weightedTokenPrice = new Decimal(tokenPrice).mul(
        new Decimal(registry.getPresaleRawSupply().toString())
      );
      totalWeightedTokenPrice = totalWeightedTokenPrice.add(weightedTokenPrice);
    }

    return totalWeightedTokenPrice
      .div(new Decimal(totalEffectivePresaleSupply.toString()))
      .mul(new Decimal(10).pow(this.baseDecimals - this.quoteDecimals))
      .toNumber();
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
