import BN from "bn.js";
import { PresaleAccount, PresaleMode, PresaleRegistry } from "../type";
import Decimal from "decimal.js";
import { calculateDynamicLamportPrice, qPriceToPrice } from "../math";
import { getPresaleHandler } from "../presale_mode_handler";
import { FixedPricePresaleHandler } from "../presale_mode_handler/fixed_price";

export interface IPresaleRegistryWrapper {
  isInitialized(): boolean;
  getPresaleRegistry(): PresaleRegistry;
  getRegistryIndex(): number;
  getPresaleRawSupply(): BN;
  getPresaleUiSupply(): number;
  getTotalDepositRawAmount(): BN;
  getTotalDepositUiAmount(): number;
  getBuyerMaximumRawDepositCap(): BN;
  getBuyerMaximumUiDepositCap(): number;
  getBuyerMinimumRawDepositCap(): BN;
  getBuyerMinimumUiDepositCap(): number;
  getDepositFeeBps(): number;
  getDepositFeePercentage(): number;
  getTokenPrice(): number;
  getTotalDepositFeeRawAmount(): BN;
  getTotalDepositFeeUiAmount(): number;
  getWithdrawableRemainingQuote(): BN;
  getWithdrawableRemainingQuoteUiAmount(): number;
  getTotalBaseTokenSold(): BN;
  getTotalBaseTokenSoldUiAmount(): number;
}

export class PresaleRegistryWrapper implements IPresaleRegistryWrapper {
  public presaleRegistry: PresaleRegistry;
  public index: number;
  public baseLamportToUiMultiplierFactor: number;
  public quoteLamportToUiMultiplierFactor: number;
  public presaleMode: PresaleMode;
  public presaleTotalDeposit: BN;
  public presaleMaximumCap: BN;
  public presaleTotalDepositFee: BN;
  private presaleModeRawData: BN[];

  constructor(
    presaleRegistry: PresaleRegistry,
    index: number,
    baseLamportToUiMultiplierFactor: number,
    quoteLamportToUiMultiplierFactor: number,
    presaleAccount: PresaleAccount
  ) {
    this.presaleRegistry = presaleRegistry;
    this.index = index;
    this.baseLamportToUiMultiplierFactor = baseLamportToUiMultiplierFactor;
    this.quoteLamportToUiMultiplierFactor = quoteLamportToUiMultiplierFactor;

    const {
      presaleMode,
      totalDeposit,
      presaleMaximumCap,
      totalDepositFee,
      presaleModeRawData,
    } = presaleAccount;

    this.presaleMode = presaleMode;
    this.presaleTotalDeposit = totalDeposit;
    this.presaleMaximumCap = presaleMaximumCap;
    this.presaleTotalDepositFee = totalDepositFee;
    this.presaleModeRawData = presaleModeRawData;
  }

  public isInitialized(): boolean {
    const {
      presaleSupply,
      buyerMaximumDepositCap,
      buyerMinimumDepositCap,
      depositFeeBps,
    } = this.presaleRegistry;

    return (
      !presaleSupply.isZero() ||
      !buyerMaximumDepositCap.isZero() ||
      !buyerMinimumDepositCap.isZero() ||
      depositFeeBps > 0
    );
  }

  public getPresaleRegistry(): PresaleRegistry {
    return this.presaleRegistry;
  }

  public getRegistryIndex(): number {
    return this.index;
  }

  public getPresaleRawSupply(): BN {
    return this.presaleRegistry.presaleSupply;
  }

  public getPresaleUiSupply(): number {
    return new Decimal(this.getPresaleRawSupply().toString())
      .div(new Decimal(this.baseLamportToUiMultiplierFactor))
      .toNumber();
  }

  public getTotalDepositRawAmount(): BN {
    return this.presaleRegistry.totalDeposit;
  }

  public getTotalDepositUiAmount(): number {
    return new Decimal(this.getTotalDepositRawAmount().toString())
      .div(new Decimal(this.quoteLamportToUiMultiplierFactor))
      .toNumber();
  }

  public getBuyerMaximumRawDepositCap(): BN {
    return this.presaleRegistry.buyerMaximumDepositCap;
  }

  public getBuyerMaximumUiDepositCap(): number {
    return new Decimal(this.getBuyerMaximumRawDepositCap().toString())
      .div(new Decimal(this.quoteLamportToUiMultiplierFactor))
      .toNumber();
  }

  public getBuyerMinimumRawDepositCap(): BN {
    return this.presaleRegistry.buyerMinimumDepositCap;
  }

  public getBuyerMinimumUiDepositCap(): number {
    return new Decimal(this.getBuyerMinimumRawDepositCap().toString())
      .div(new Decimal(this.quoteLamportToUiMultiplierFactor))
      .toNumber();
  }

  public getDepositFeeBps(): number {
    return this.presaleRegistry.depositFeeBps;
  }

  public getDepositFeePercentage(): number {
    return this.getDepositFeeBps() / 100;
  }

  public getTokenPrice(): number {
    switch (this.presaleMode) {
      case PresaleMode.FixedPrice: {
        const fixedPricePresaleHandler = new FixedPricePresaleHandler(
          this.presaleModeRawData
        );
        const rawPrice = qPriceToPrice(fixedPricePresaleHandler.qPrice);
        return rawPrice
          .mul(this.baseLamportToUiMultiplierFactor)
          .div(this.quoteLamportToUiMultiplierFactor)
          .toNumber();
      }
      default:
        if (this.getTotalDepositRawAmount().isZero()) {
          return 0;
        }

        return calculateDynamicLamportPrice(
          this.getPresaleRawSupply(),
          this.getTotalDepositRawAmount()
        )
          .mul(this.baseLamportToUiMultiplierFactor)
          .div(this.quoteLamportToUiMultiplierFactor)
          .toNumber();
    }
  }

  public getTotalDepositFeeRawAmount(): BN {
    return this.presaleRegistry.totalDepositFee;
  }

  public getTotalDepositFeeUiAmount(): number {
    return new Decimal(this.getTotalDepositFeeRawAmount().toString())
      .div(new Decimal(this.quoteLamportToUiMultiplierFactor))
      .toNumber();
  }

  public getWithdrawableRemainingQuote(): BN {
    if (this.presaleMode !== PresaleMode.Prorata) {
      return new BN(0);
    }

    const presaleRemainingQuote = this.presaleTotalDeposit.sub(
      this.presaleMaximumCap
    );

    if (
      presaleRemainingQuote.lte(new BN(0)) ||
      this.presaleRegistry.totalDeposit.isZero()
    ) {
      return new BN(0);
    }

    const registryRemainingQuote = presaleRemainingQuote
      .mul(this.presaleRegistry.totalDeposit)
      .div(this.presaleTotalDeposit);

    const registryRefundFee = registryRemainingQuote
      .mul(this.presaleTotalDepositFee)
      .div(this.presaleTotalDeposit);

    return registryRemainingQuote.add(registryRefundFee);
  }

  public getWithdrawableRemainingQuoteUiAmount(): number {
    return new Decimal(this.getWithdrawableRemainingQuote().toString())
      .div(new Decimal(this.quoteLamportToUiMultiplierFactor))
      .toNumber();
  }

  public getTotalBaseTokenSold(): BN {
    const presaleHandler = getPresaleHandler(
      this.presaleMode,
      this.presaleModeRawData
    );
    return presaleHandler.getRegistryTotalBaseTokenSold(this);
  }

  public getTotalBaseTokenSoldUiAmount(): number {
    return new Decimal(this.getTotalBaseTokenSold().toString())
      .div(new Decimal(this.baseLamportToUiMultiplierFactor))
      .toNumber();
  }
}
