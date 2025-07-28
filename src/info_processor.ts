import { PresaleAccount, PresaleProgress } from "./type";

export function getPresaleProgressState(
  presaleAccount: PresaleAccount
): PresaleProgress {
  const currentTime = Date.now() / 1000; // Convert to seconds

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
