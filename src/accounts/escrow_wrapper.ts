import Decimal from "decimal.js";
import {
  EscrowAccount,
  PresaleAccount,
  PresaleMode,
  PresaleProgress,
} from "../type";
import BN from "bn.js";
import { IPresaleWrapper } from "./presale_wrapper";
import { calculateImmediateReleaseToken } from "../math";
import { getPresaleHandler } from "../presale_mode_handler";

export interface IEscrowWrapper {
  getEscrowAccount(): EscrowAccount;
  getDepositUiAmount(): number;
  getDepositRawAmount(): BN;
  getDepositFeeRawAmount(): BN;
  getDepositFeeUiAmount(): number;
  getIndividualDepositCap(): BN;
  getIndividualDepositUiCap(): number;
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
  suggestDepositAmount(presaleWrapper: IPresaleWrapper, maxAmount: BN): BN;
  suggestDepositUiAmount(
    presaleWrapper: IPresaleWrapper,
    maxAmount: BN
  ): number;
  suggestWithdrawAmount(presaleWrapper: IPresaleWrapper, maxAmount: BN): BN;
  suggestWithdrawUiAmount(
    presaleWrapper: IPresaleWrapper,
    maxAmount: BN
  ): number;
  canClose(presaleWrapper: IPresaleWrapper): boolean;
}

export class EscrowWrapper implements IEscrowWrapper {
  public escrowAccount: EscrowAccount;
  public baseDecimals: number;
  public quoteDecimals: number;
  public baseMultiplier: number;
  public quoteMultiplier: number;
  private presaleMode: PresaleMode;
  private fixedPricePresaleQPrice: BN;

  constructor(
    escrowAccount: EscrowAccount,
    presaleAccount: PresaleAccount,
    baseDecimals: number,
    quoteDecimals: number
  ) {
    this.escrowAccount = escrowAccount;
    this.baseDecimals = baseDecimals;
    this.quoteDecimals = quoteDecimals;
    this.baseMultiplier = 10 ** baseDecimals;
    this.quoteMultiplier = 10 ** quoteDecimals;
    this.presaleMode = presaleAccount.presaleMode;
    this.fixedPricePresaleQPrice = presaleAccount.fixedPricePresaleQPrice;
  }

  public getEscrowAccount(): EscrowAccount {
    return this.escrowAccount;
  }

  public getDepositUiAmount(): number {
    return new Decimal(this.escrowAccount.totalDeposit.toString())
      .div(new Decimal(this.quoteMultiplier))
      .toNumber();
  }

  public getDepositRawAmount(): BN {
    return this.escrowAccount.totalDeposit;
  }

  public getTotalClaimableRawAmount(presaleWrapper: IPresaleWrapper): BN {
    const presaleRegistry = presaleWrapper.getPresaleRegistry(
      new BN(this.escrowAccount.registryIndex)
    );

    const escrowDepositAmount = this.getDepositRawAmount();

    if (escrowDepositAmount.isZero()) {
      return new BN(0);
    }

    const tokenSold = presaleRegistry.getTotalBaseTokenSold();
    const totalDeposit = presaleRegistry.getTotalDepositRawAmount();
    return escrowDepositAmount.mul(tokenSold).div(totalDeposit);
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

  public getPendingClaimableRawAmount(presaleWrapper: IPresaleWrapper): BN {
    const presaleRegistry = presaleWrapper.getPresaleRegistry(
      new BN(this.escrowAccount.registryIndex)
    );

    if (presaleRegistry.getTotalDepositRawAmount().isZero()) {
      return new BN(0);
    }

    const presaleProgress = presaleWrapper.getPresaleProgressState();
    if (presaleProgress !== PresaleProgress.Completed) {
      return new BN(0);
    }

    const tokenSold = presaleRegistry.getTotalBaseTokenSold();
    const currentTimestamp = new Date().getTime() / 1000; // Convert to seconds

    const presaleAccount = presaleWrapper.getPresaleAccount();

    const { immediateReleasedAmount, vestedAmount } =
      calculateImmediateReleaseToken(
        tokenSold,
        new BN(presaleAccount.immediateReleaseBps)
      );

    const userImmediateReleaseToken = immediateReleasedAmount
      .mul(this.escrowAccount.totalDeposit)
      .div(presaleRegistry.getTotalDepositRawAmount());

    const elapsedSeconds = Math.max(
      currentTimestamp - presaleAccount.vestingStartTime.toNumber(),
      0
    );

    const drippedToken = presaleAccount.vestDuration.isZero()
      ? vestedAmount
      : vestedAmount
          .mul(new BN(elapsedSeconds))
          .div(presaleAccount.vestDuration);

    const userDrippedToken = drippedToken
      .mul(this.escrowAccount.totalDeposit)
      .div(presaleAccount.totalDeposit)
      .sub(this.escrowAccount.totalClaimedToken);

    const cumulativeClaimableAmount =
      userImmediateReleaseToken.add(userDrippedToken);

    return cumulativeClaimableAmount.sub(this.escrowAccount.totalClaimedToken);
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
      return this.escrowAccount.totalDeposit.add(
        this.escrowAccount.totalDepositFee
      );
    } else {
      const presaleRegistry = presaleWrapper.getPresaleRegistry(
        new BN(this.escrowAccount.registryIndex)
      );

      if (presaleRegistry.getTotalDepositRawAmount().isZero()) {
        return new BN(0);
      }

      const remainingQuoteAmount = BN.max(
        presaleWrapper
          .getTotalDepositRawAmount()
          .sub(presaleWrapper.getPresaleMaximumRawCap()),
        new BN(0)
      );

      const registryRemainingQuote = remainingQuoteAmount
        .mul(presaleRegistry.getTotalDepositRawAmount())
        .div(presaleWrapper.getTotalDepositRawAmount());

      const registryRefundFee = presaleRegistry
        .getTotalDepositFeeRawAmount()
        .mul(registryRemainingQuote)
        .div(presaleRegistry.getTotalDepositRawAmount());

      const escrowRemainingQuote = registryRemainingQuote
        .mul(this.getDepositRawAmount())
        .div(presaleRegistry.getTotalDepositRawAmount());

      const escrowRefundFee = registryRefundFee
        .mul(this.getDepositRawAmount())
        .div(presaleRegistry.getTotalDepositRawAmount());

      return escrowRemainingQuote.add(escrowRefundFee);
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
    const presaleRegistry = presaleWrapper.getPresaleRegistry(
      new BN(this.escrowAccount.registryIndex)
    );

    const buyerMaximumDepositCap = BN.min(
      presaleRegistry.getBuyerMaximumRawDepositCap(),
      this.getIndividualDepositCap()
    );

    const buyerCap = buyerMaximumDepositCap.sub(this.getDepositRawAmount());

    const presaleAccount = presaleWrapper.getPresaleAccount();
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

  public getIndividualDepositCap(): BN {
    return this.escrowAccount.depositMaxCap;
  }

  public getIndividualDepositUiCap(): number {
    return new Decimal(this.getIndividualDepositCap().toString())
      .div(new Decimal(this.quoteMultiplier))
      .toNumber();
  }

  public suggestDepositAmount(
    presaleWrapper: IPresaleWrapper,
    maxAmount: BN
  ): BN {
    const remainingDepositAmount =
      this.getRemainingDepositAmount(presaleWrapper);

    const presaleHandler = getPresaleHandler(
      this.presaleMode,
      this.fixedPricePresaleQPrice
    );

    return presaleHandler.suggestDepositAmount(
      maxAmount,
      remainingDepositAmount
    );
  }

  public suggestDepositUiAmount(
    presaleWrapper: IPresaleWrapper,
    maxAmount: BN
  ): number {
    const suggestDepositAmount = this.suggestDepositAmount(
      presaleWrapper,
      maxAmount
    );
    return new Decimal(suggestDepositAmount.toString())
      .div(new Decimal(this.quoteMultiplier))
      .toNumber();
  }

  public suggestWithdrawAmount(
    presaleWrapper: IPresaleWrapper,
    maxAmount: BN
  ): BN {
    const withdrawAmount = BN.min(maxAmount, this.getDepositRawAmount());

    const presaleHandler = getPresaleHandler(
      this.presaleMode,
      this.fixedPricePresaleQPrice
    );

    return presaleHandler.suggestWithdrawAmount(withdrawAmount);
  }

  public suggestWithdrawUiAmount(
    presaleWrapper: IPresaleWrapper,
    maxAmount: BN
  ): number {
    const suggestWithdrawAmount = this.suggestWithdrawAmount(
      presaleWrapper,
      maxAmount
    );
    return new Decimal(suggestWithdrawAmount.toString())
      .div(new Decimal(this.quoteMultiplier))
      .toNumber();
  }

  public getDepositFeeRawAmount(): BN {
    return this.escrowAccount.totalDepositFee;
  }

  public getDepositFeeUiAmount(): number {
    return new Decimal(this.escrowAccount.totalDepositFee.toString())
      .div(new Decimal(this.quoteMultiplier))
      .toNumber();
  }

  public canClose(presaleWrapper: IPresaleWrapper): boolean {
    const currentTimestamp = new Date().getTime() / 1000; // Convert to seconds
    const presaleProgress = presaleWrapper.getPresaleProgressState();

    switch (presaleProgress) {
      case PresaleProgress.Ongoing: {
        return (
          this.getDepositRawAmount().isZero() &&
          this.getDepositFeeRawAmount().isZero()
        );
      }
      case PresaleProgress.Failed: {
        return (
          this.escrowAccount.isRemainingQuoteWithdrawn == 1 ||
          (this.getDepositRawAmount().isZero() &&
            this.getDepositFeeRawAmount().isZero())
        );
      }
      case PresaleProgress.Completed: {
        const presaleMode = presaleWrapper.getPresaleAccount().presaleMode;
        if (presaleMode === PresaleMode.Prorata) {
          if (
            !this.getWithdrawableRemainingQuoteAmount(
              presaleWrapper
            ).isZero() &&
            !this.escrowAccount.isRemainingQuoteWithdrawn
          ) {
            return false;
          }
        }

        return this.getTotalClaimableRawAmount(presaleWrapper).eq(
          this.escrowAccount.totalClaimedToken
        );
      }
    }
  }
}
