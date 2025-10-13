import BN from "bn.js";
import Decimal from "decimal.js";
import { EscrowAccount, PresaleMode, PresaleProgress } from "../type";
import { getPresaleHandler, IPresaleWrapper } from "./presale_wrapper";

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
    if (this.escrowAccount.totalDeposit.isZero()) {
      return new BN(0);
    }

    const index = new BN(this.escrowAccount.registryIndex);

    const presaleRegistry = presaleWrapper.getPresaleRegistryByIndex(index);
    const rawPresaleRegistry = presaleRegistry.getPresaleRegistry();

    const totalBaseTokenSold =
      presaleWrapper.getTotalBaseTokenSoldByRegistry(index);

    return totalBaseTokenSold
      .mul(this.escrowAccount.totalDeposit)
      .div(rawPresaleRegistry.totalDeposit);
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
    const index = new BN(this.escrowAccount.registryIndex);
    const tokenSold = presaleWrapper.getTotalBaseTokenSoldByRegistry(index);
    const currentTimestamp = new Date().getTime() / 1000; // Convert to seconds

    const presaleAccount = presaleWrapper.getPresaleAccount();
    const vestedToken = tokenSold.sub(
      tokenSold
        .mul(new BN(presaleAccount.immediateReleaseBps))
        .div(new BN(10000))
    );

    const elapsedSeconds = Math.max(
      currentTimestamp - presaleAccount.vestingStartTime.toNumber(),
      0
    );

    const drippedSolToken = vestedToken
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
      return this.escrowAccount.totalDeposit.add(
        this.escrowAccount.totalDepositFee
      );
    } else {
      const presaleRegistry = presaleWrapper.getPresaleRegistryByIndex(
        new BN(this.escrowAccount.registryIndex)
      );

      const { refundDepositAmount, refundFeeAmount } =
        presaleRegistry.getRemainingDepositAmount(
          presaleWrapper.getRemainingDepositAmount(),
          presaleWrapper.getTotalDepositAmount()
        );

      const rawPresaleRegistry = presaleRegistry.getPresaleRegistry();

      let escrowRefundFee = new BN(0);
      let escrowRefundAmount = new BN(0);

      if (refundFeeAmount.gtn(0)) {
        escrowRefundFee = refundFeeAmount
          .mul(this.escrowAccount.totalDepositFee)
          .div(rawPresaleRegistry.totalDepositFee);
      }

      if (refundDepositAmount.gtn(0)) {
        escrowRefundAmount = refundDepositAmount
          .mul(this.escrowAccount.totalDeposit)
          .div(rawPresaleRegistry.totalDeposit);
      }

      return escrowRefundAmount.add(escrowRefundFee);
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

    const globalRemainingQuota = presaleWrapper.getRemainingDepositQuota();
    const presaleRegistry = presaleWrapper.getPresaleRegistryByIndex(
      new BN(this.escrowAccount.registryIndex)
    );
    const rawPresaleRegistry = presaleRegistry.getPresaleRegistry();

    const personalRemainingQuota = this.escrowAccount.totalDeposit.gte(
      rawPresaleRegistry.buyerMaximumDepositCap
    )
      ? new BN(0)
      : rawPresaleRegistry.buyerMaximumDepositCap.sub(
          this.escrowAccount.totalDeposit
        );

    if (presaleAccount.presaleMode === PresaleMode.Prorata) {
      return personalRemainingQuota;
    }

    const remainingQuota = BN.min(globalRemainingQuota, personalRemainingQuota);
    return remainingQuota;
  }

  public getRemainingDepositUiAmount(presaleWrapper: IPresaleWrapper): number {
    const remainingDepositAmount =
      this.getRemainingDepositAmount(presaleWrapper);
    return new Decimal(remainingDepositAmount.toString())
      .div(new Decimal(this.quoteMultiplier))
      .toNumber();
  }

  public suggestDepositAmount(
    presaleWrapper: IPresaleWrapper,
    maxAmount: BN
  ): BN {
    const remainingDepositAmount =
      this.getRemainingDepositAmount(presaleWrapper);

    const presaleAccount = presaleWrapper.getPresaleAccount();
    const presaleHandler = getPresaleHandler(presaleAccount.presaleMode);

    return presaleHandler.suggestDepositAmount(
      maxAmount,
      remainingDepositAmount,
      presaleAccount.fixedPricePresaleQPrice
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
    const withdrawAmount = BN.min(maxAmount, this.escrowAccount.totalDeposit);

    const presaleAccount = presaleWrapper.getPresaleAccount();
    const presaleHandler = getPresaleHandler(presaleAccount.presaleMode);

    return presaleHandler.suggestWithdrawAmount(
      withdrawAmount,
      presaleAccount.fixedPricePresaleQPrice
    );
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
}
