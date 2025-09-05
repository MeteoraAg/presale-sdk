import Decimal from "decimal.js";
import {
  EscrowAccount,
  PresaleAccount,
  PresaleMode,
  PresaleProgress,
} from "../type";
import BN from "bn.js";
import { IPresaleWrapper } from "./presale_wrapper";

export interface IEscrowWrapper {
  getEscrowAccount(): EscrowAccount;
  getDepositUiAmount(): number;
  getRawDepositAmount(): BN;
  getRemainingDepositAmount(presaleWrapper: IPresaleWrapper): BN;
  getRemainingDepositUiAmount(presaleWrapper: IPresaleWrapper): number;
  getTotalClaimableRawAmount(presaleWrapper: IPresaleWrapper): BN;
  getTotalClaimableUiAmount(presaleWrapper: IPresaleWrapper): number;
  getPendingClaimableRawAmount(presaleWrapper: IPresaleWrapper);
  getPendingClaimableUiAmount(presaleWrapper: IPresaleWrapper): number;
  getClaimedRawAmount(): BN;
  getClaimedUiAmount(): number;
  canWithdrawRemainingQuoteAmount(presaleWrapper: IPresaleWrapper): boolean;
  getWithdrawableRemainingQuoteAmount(presaleWrapper: IPresaleWrapper): BN;
  getWithdrawableRemainingQuoteUiAmount(
    presaleWrapper: IPresaleWrapper
  ): number;
}

export class EscrowWrapper implements IEscrowWrapper {
  public escrowAccount: EscrowAccount;
  public baseDecimals: number;
  public quoteDecimals: number;
  public baseMultiplier: number;
  public quoteMultiplier: number;

  constructor(
    escrowAccount: EscrowAccount,
    baseDecimals: number,
    quoteDecimals: number
  ) {
    this.escrowAccount = escrowAccount;
    this.baseDecimals = baseDecimals;
    this.quoteDecimals = quoteDecimals;
    this.baseMultiplier = 10 ** baseDecimals;
    this.quoteMultiplier = 10 ** quoteDecimals;
  }

  public getEscrowAccount(): EscrowAccount {
    return this.escrowAccount;
  }

  public getDepositUiAmount(): number {
    return new Decimal(this.escrowAccount.totalDeposit.toString())
      .div(new Decimal(this.quoteMultiplier))
      .toNumber();
  }

  public getRawDepositAmount(): BN {
    return this.escrowAccount.totalDeposit;
  }

  public getTotalClaimableRawAmount(presaleWrapper: IPresaleWrapper): BN {
    const tokenSold = presaleWrapper.getTotalBaseTokenSold();
    const presaleAccount = presaleWrapper.getPresaleAccount();
    return this.escrowAccount.totalDeposit
      .mul(tokenSold)
      .div(presaleAccount.totalDeposit);
  }

  public getTotalClaimableUiAmount(presaleWrapper: IPresaleWrapper): number {
    const totalClaimableRawAmount =
      this.getTotalClaimableRawAmount(presaleWrapper);
    return new Decimal(totalClaimableRawAmount.toString())
      .div(new Decimal(this.baseMultiplier))
      .toNumber();
  }

  public getClaimedRawAmount(): BN {
    return this.escrowAccount.totalClaimedToken;
  }

  public getClaimedUiAmount(): number {
    return new Decimal(this.escrowAccount.totalClaimedToken.toString())
      .div(new Decimal(this.baseMultiplier))
      .toNumber();
  }

  public getPendingClaimableRawAmount(presaleWrapper: IPresaleWrapper) {
    const tokenSold = presaleWrapper.getTotalBaseTokenSold();
    const currentTimestamp = new Date().getTime() / 1000; // Convert to seconds

    const presaleAccount = presaleWrapper.getPresaleAccount();
    const elapsedSeconds = Math.max(
      currentTimestamp - presaleAccount.vestingStartTime.toNumber(),
      0
    );

    const drippedSolToken = tokenSold
      .mul(new BN(elapsedSeconds))
      .div(presaleAccount.vestDuration);

    return drippedSolToken
      .mul(this.escrowAccount.totalDeposit)
      .div(presaleAccount.totalDeposit)
      .sub(this.escrowAccount.totalClaimedToken);
  }

  public getPendingClaimableUiAmount(presaleWrapper: IPresaleWrapper): number {
    const pendingClaimableRawAmount =
      this.getPendingClaimableRawAmount(presaleWrapper);
    return new Decimal(pendingClaimableRawAmount.toString())
      .div(new Decimal(this.baseMultiplier))
      .toNumber();
  }

  public canWithdrawRemainingQuoteAmount(
    presaleWrapper: IPresaleWrapper
  ): boolean {
    if (this.escrowAccount.isRemainingQuoteWithdrawn === 1) {
      return false;
    }

    return presaleWrapper.canWithdrawRemainingQuote();
  }

  public getWithdrawableRemainingQuoteAmount(
    presaleWrapper: IPresaleWrapper
  ): BN {
    const canWithdrawRemainingQuote =
      this.canWithdrawRemainingQuoteAmount(presaleWrapper);

    if (!canWithdrawRemainingQuote) {
      return new BN(0);
    }

    const presaleProgress = presaleWrapper.getPresaleProgressState();
    if (presaleProgress === PresaleProgress.Failed) {
      return this.escrowAccount.totalDeposit;
    } else {
      const presaleAccount = presaleWrapper.getPresaleAccount();
      const remainingQuoteAmount = BN.max(
        presaleAccount.totalDeposit.sub(presaleAccount.presaleMaximumCap),
        new BN(0)
      );

      return this.escrowAccount.totalDeposit
        .mul(remainingQuoteAmount)
        .div(presaleAccount.totalDeposit);
    }
  }

  public getWithdrawableRemainingQuoteUiAmount(
    presaleWrapper: IPresaleWrapper
  ): number {
    const remainingQuoteAmount =
      this.getWithdrawableRemainingQuoteAmount(presaleWrapper);
    return new Decimal(remainingQuoteAmount.toString())
      .div(new Decimal(this.quoteMultiplier))
      .toNumber();
  }

  public getRemainingDepositAmount(presaleWrapper: IPresaleWrapper): BN {
    const presaleAccount = presaleWrapper.getPresaleAccount();
    const presaleRegistry =
      presaleAccount.presaleRegistries[this.escrowAccount.registryIndex];

    const buyerMaximumDepositCap = BN.min(
      presaleRegistry.buyerMaximumDepositCap,
      this.escrowAccount.depositMaxCap
    );

    const buyerCap = buyerMaximumDepositCap.sub(
      this.escrowAccount.totalDeposit
    );

    if (presaleAccount.presaleMode === PresaleMode.Prorata) {
      return buyerCap;
    }
    const globalCap = presaleAccount.presaleMaximumCap.sub(
      presaleAccount.totalDeposit
    );
    return BN.min(globalCap, buyerCap);
  }

  public getRemainingDepositUiAmount(presaleWrapper: IPresaleWrapper): number {
    const remainingDepositAmount =
      this.getRemainingDepositAmount(presaleWrapper);
    return new Decimal(remainingDepositAmount.toString())
      .div(new Decimal(this.quoteMultiplier))
      .toNumber();
  }
}
