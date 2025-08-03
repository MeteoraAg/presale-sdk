import BN from "bn.js";
import Decimal from "decimal.js";
import { PresaleAccount, PresaleMode, PresaleProgress, U64_MAX } from "../type";

function getPresaleRemainingDepositQuota(presaleAccount: PresaleAccount): BN {
  const { presaleMaximumCap, totalDeposit } = presaleAccount;
  return presaleMaximumCap.sub(totalDeposit);
}

interface PresaleHandler {
  getRemainingDepositQuota(presaleAccount: PresaleAccount): BN;
  getTotalBasedTokenSold(presaleAccount: PresaleAccount): BN;
  canWithdraw(): boolean;
}

class ProrataHandler implements PresaleHandler {
  getRemainingDepositQuota(presaleAccount: PresaleAccount): BN {
    return U64_MAX;
  }

  getTotalBasedTokenSold(presaleAccount: PresaleAccount): BN {
    return presaleAccount.totalDeposit.isZero()
      ? new BN(0)
      : presaleAccount.presaleSupply;
  }

  canWithdraw(): boolean {
    return true;
  }
}

class FixedPricePresaleHandler implements PresaleHandler {
  getRemainingDepositQuota(presaleAccount: PresaleAccount): BN {
    return getPresaleRemainingDepositQuota(presaleAccount);
  }

  getTotalBasedTokenSold(presaleAccount: PresaleAccount): BN {
    const { totalDeposit, fixedPricePresaleQPrice } = presaleAccount;
    const qTotalDeposit = totalDeposit.shln(64);
    return qTotalDeposit.isZero()
      ? new BN(0)
      : qTotalDeposit.div(fixedPricePresaleQPrice);
  }

  canWithdraw(): boolean {
    return true;
  }
}

class FcfsHandler implements PresaleHandler {
  getRemainingDepositQuota(presaleAccount: PresaleAccount): BN {
    return getPresaleRemainingDepositQuota(presaleAccount);
  }

  getTotalBasedTokenSold(presaleAccount: PresaleAccount): BN {
    return presaleAccount.totalDeposit.isZero()
      ? new BN(0)
      : presaleAccount.presaleSupply;
  }

  canWithdraw(): boolean {
    return false;
  }
}

function getPresaleHandler(presaleMode: number): PresaleHandler {
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
  getTokenPrice(): number;
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
    return getPresaleHandler(
      this.presaleAccount.presaleMode
    ).getTotalBasedTokenSold(this.presaleAccount);
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
        return {
          amount: this.presaleAccount.totalDeposit,
          uiAmount: new Decimal(this.presaleAccount.totalDeposit.toString())
            .div(new Decimal(10).pow(this.quoteDecimals))
            .toNumber(),
          isBaseToken: false,
        };
      }
      case PresaleProgress.Failed: {
        return {
          amount: this.presaleAccount.presaleSupply,
          uiAmount: new Decimal(this.presaleAccount.presaleSupply.toString())
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

  public getTokenPrice(): number {
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

    return new Decimal(this.presaleAccount.presaleSupply.toString())
      .div(new Decimal(this.presaleAccount.totalDeposit.toString()))
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
