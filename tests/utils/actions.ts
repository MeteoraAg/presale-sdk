import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  calculateDepositFeeIncludedAmount,
  calculateMinimumQuoteAmountForBaseLamport,
  deriveEscrow,
  deriveMerkleRootConfig,
  derivePresale,
  getOnChainTimestamp,
  ILockedVestingArgs,
  Presale,
  Rounding,
  UnsoldTokenAction,
  WhitelistMode,
} from "../../src";
import BN from "bn.js";
import { expect } from "chai";
import {
  getAssociatedTokenAddressSync,
  unpackAccount,
  unpackMint,
} from "@solana/spl-token";
import { WhitelistedWallet } from "../../libs/merkle_tree";
import Decimal from "decimal.js";

export const presaleProgramId = new PublicKey(
  "presSVxnf9UU8jMxhgSMqaRwNiT36qeBdNeTRKjTdbj"
);

export async function closeEscrow(
  presale: Presale,
  userKeypair: Keypair,
  connection: Connection,
  registryIndex?: BN
) {
  await presale.refetchState();

  let closeEscrowTx = await presale.closeEscrow({
    owner: userKeypair.publicKey,
    registryIndex: registryIndex ?? new BN(0),
  });

  closeEscrowTx.sign(userKeypair);
  const latestBlockhash = await connection.getLatestBlockhash(
    connection.commitment
  );

  closeEscrowTx.recentBlockhash = latestBlockhash.blockhash;
  closeEscrowTx.feePayer = userKeypair.publicKey;

  const txSig = await connection.sendRawTransaction(closeEscrowTx.serialize());
  console.log("Close Escrow Tx Sig:", txSig);

  await connection.confirmTransaction(
    {
      ...latestBlockhash,
      signature: txSig,
    },
    connection.commitment
  );
  console.log("Close escrow successful!");

  const escrowAddress = deriveEscrow(
    presale.presaleAddress,
    userKeypair.publicKey,
    registryIndex ?? new BN(0),
    presaleProgramId
  );

  const escrowAccountInfo = await connection.getAccountInfo(escrowAddress);
  expect(escrowAccountInfo).to.be.null;
}

export async function claim(
  presale: Presale,
  userKeypair: Keypair,
  connection: Connection
) {
  await presale.refetchState();

  const userBaseTokenAddress = getAssociatedTokenAddressSync(
    presale.presaleAccount.baseMint,
    userKeypair.publicKey
  );

  const beforeUserBaseTokenAccount = await connection.getAccountInfo(
    userBaseTokenAddress
  );

  let escrowState = await presale
    .getPresaleEscrowByOwner(userKeypair.publicKey)
    .then((escrows) => escrows[0]);

  const pendingClaimableAmount = escrowState.getPendingClaimableRawAmount(
    presale.getParsedPresale(),
    await getOnChainTimestamp(connection).then((ts) => Number(ts))
  );

  let claimTx = await presale.claim({
    owner: userKeypair.publicKey,
    registryIndex: new BN(0),
  });

  claimTx.sign(userKeypair);
  const latestBlockhash = await connection.getLatestBlockhash(
    connection.commitment
  );

  claimTx.recentBlockhash = latestBlockhash.blockhash;
  claimTx.feePayer = userKeypair.publicKey;

  const txSig = await connection.sendRawTransaction(claimTx.serialize());
  console.log("Claim Tx Sig:", txSig);

  await connection.confirmTransaction(
    {
      ...latestBlockhash,
      signature: txSig,
    },
    connection.commitment
  );
  console.log("Claim successful!");

  const afterUserBaseTokenAccount = await connection.getAccountInfo(
    userBaseTokenAddress
  );

  const beforeTokenAccount = unpackAccount(userBaseTokenAddress, {
    ...beforeUserBaseTokenAccount!,
    data: Buffer.from(beforeUserBaseTokenAccount!.data),
  });

  const afterTokenAccount = unpackAccount(userBaseTokenAddress, {
    ...afterUserBaseTokenAccount!,
    data: Buffer.from(afterUserBaseTokenAccount!.data),
  });

  let beforeClaimAmount = escrowState.getClaimedRawAmount();

  escrowState = await presale
    .getPresaleEscrowByOwner(userKeypair.publicKey)
    .then((escrows) => escrows[0]);

  const afterClaimAmount = escrowState.getClaimedRawAmount();

  const claimedAmountRecorded = afterClaimAmount.sub(beforeClaimAmount);
  const actualClaimAmount = new BN(afterTokenAccount.amount.toString()).sub(
    new BN(beforeTokenAccount.amount.toString())
  );

  expect(claimedAmountRecorded.eq(actualClaimAmount)).to.be.true;
  console.log("Claimed Amount:", actualClaimAmount.toString());
  console.log("Pending Claimable Amount:", pendingClaimableAmount.toString());
  expect(actualClaimAmount.gte(pendingClaimableAmount)).to.be.true;
}

export async function performUnsoldBaseTokenAction(
  presale: Presale,
  user: Keypair,
  connection: Connection
) {
  await presale.refetchState();

  const performUnsoldBaseTokenActionTx =
    await presale.performUnsoldBaseTokenAction(user.publicKey);

  performUnsoldBaseTokenActionTx.sign(user);
  const latestBlockhash = await connection.getLatestBlockhash(
    connection.commitment
  );

  performUnsoldBaseTokenActionTx.recentBlockhash = latestBlockhash.blockhash;
  performUnsoldBaseTokenActionTx.feePayer = user.publicKey;

  const txSig = await connection.sendRawTransaction(
    performUnsoldBaseTokenActionTx.serialize()
  );

  await connection.confirmTransaction(
    {
      ...latestBlockhash,
      signature: txSig,
    },
    connection.commitment
  );
  console.log("Perform unsold base token action successful!");

  await presale.refetchState();

  expect(presale.presaleAccount.isUnsoldTokenActionPerformed == 1).to.be.true;
}

export async function withdraw(
  presale: Presale,
  userKeypair: Keypair,
  amount: BN,
  connection: Connection
) {
  await presale.refetchState();
  let escrowState = await presale
    .getPresaleEscrowByOwner(userKeypair.publicKey)
    .then((escrows) => escrows[0]);

  let withdrawTx = await presale.withdraw({
    owner: userKeypair.publicKey,
    amount,
    registryIndex: new BN(0),
  });

  withdrawTx.sign(userKeypair);
  const latestBlockhash = await connection.getLatestBlockhash(
    connection.commitment
  );

  withdrawTx.recentBlockhash = latestBlockhash.blockhash;
  withdrawTx.feePayer = userKeypair.publicKey;

  const txSig = await connection.sendRawTransaction(withdrawTx.serialize());
  await connection.confirmTransaction(
    {
      ...latestBlockhash,
      signature: txSig,
    },
    connection.commitment
  );
  console.log("Withdraw successful!");

  const beforeDepositAmount = escrowState.getDepositRawAmount();
  escrowState = await presale
    .getPresaleEscrowByOwner(userKeypair.publicKey)
    .then((escrows) => escrows[0]);

  const afterDepositAmount = escrowState.getDepositRawAmount();
  const withdrawnAmount = beforeDepositAmount.sub(afterDepositAmount);

  expect(withdrawnAmount.eq(amount)).to.be.true;
}

export async function deposit(
  presale: Presale,
  userKeypair: Keypair,
  amount: BN,
  connection: Connection
) {
  await presale.refetchState();
  let escrowWrapper = await presale
    .getPresaleEscrowByOwner(userKeypair.publicKey)
    .then((escrows) => escrows[0]);

  const suggestedDepositAmount = escrowWrapper.suggestDepositAmount(
    presale.getParsedPresale(),
    amount
  );

  const depositFeeIncludedSuggestedAmount = calculateDepositFeeIncludedAmount(
    suggestedDepositAmount,
    new BN(presale.presaleAccount.presaleRegistries[0].depositFeeBps),
    Rounding.Up
  );

  console.log("Deposit amount:", amount.toString());
  console.log("Suggested deposit amount:", suggestedDepositAmount.toString());
  console.log(
    "Deposit fee included amount:",
    depositFeeIncludedSuggestedAmount.toString()
  );

  let depositTx = await presale.deposit({
    amount,
    owner: userKeypair.publicKey,
  });

  depositTx.sign(userKeypair);

  const latestBlockhash = await connection.getLatestBlockhash(
    connection.commitment
  );

  depositTx.recentBlockhash = latestBlockhash.blockhash;
  depositTx.feePayer = userKeypair.publicKey;

  const txSig = await connection.sendRawTransaction(depositTx.serialize());

  console.log("Deposit Tx Sig:", txSig);
  await connection.confirmTransaction(
    {
      ...latestBlockhash,
      signature: txSig,
    },
    "confirmed"
  );
  console.log("Deposit successful!");

  const beforeEscrowDepositAmount = escrowWrapper.getDepositRawAmount();
  const beforeEscrowDepositFeeAmount = escrowWrapper.getDepositFeeRawAmount();

  escrowWrapper = await presale
    .getPresaleEscrowByOwner(userKeypair.publicKey)
    .then((escrows) => escrows[0]);

  const depositAmountRecorded = escrowWrapper
    .getDepositRawAmount()
    .sub(beforeEscrowDepositAmount);

  const depositFeeRecorded = escrowWrapper
    .getDepositFeeRawAmount()
    .sub(beforeEscrowDepositFeeAmount);

  expect(depositAmountRecorded.eq(suggestedDepositAmount)).to.be.true;

  expect(
    depositFeeRecorded.eq(
      depositFeeIncludedSuggestedAmount.sub(suggestedDepositAmount)
    )
  ).to.be.true;
}

export async function createEscrowWithProof(
  connection: Connection,
  presale: Presale,
  presaleAddress: PublicKey,
  userKeypair: Keypair,
  whitelistWallets: WhitelistedWallet[]
) {
  const merkleProofResponses = await presale.createMerkleProofResponse({
    whitelistWallets,
  });

  const { merkle_root_config, deposit_cap, proof } =
    merkleProofResponses[
      `${userKeypair.publicKey.toBase58()}-${new BN(0).toString()}`
    ];

  const depositCap = new BN(deposit_cap);
  const merklerRootConfigPubkey = new PublicKey(merkle_root_config);

  let createEscrowTx = await presale.createPermissionedEscrowWithMerkleProof({
    owner: userKeypair.publicKey,
    payer: userKeypair.publicKey,
    merkleRootConfig: merklerRootConfigPubkey,
    registryIndex: new BN(0),
    depositCap,
    proof,
  });

  createEscrowTx.sign(userKeypair);

  const latestBlockhash = await connection.getLatestBlockhash(
    connection.commitment
  );

  createEscrowTx.recentBlockhash = latestBlockhash.blockhash;
  createEscrowTx.feePayer = userKeypair.publicKey;

  const txSig = await connection.sendRawTransaction(createEscrowTx.serialize());
  console.log("Create Escrow Tx Sig:", txSig);

  await connection.confirmTransaction(
    {
      ...latestBlockhash,
      signature: txSig,
    },
    connection.commitment
  );

  const escrowAddress = deriveEscrow(
    presaleAddress,
    userKeypair.publicKey,
    new BN(0),
    presaleProgramId
  );

  const escrowWrapper = await presale
    .getPresaleEscrowByOwner(userKeypair.publicKey)
    .then((escrows) => escrows[0]);

  expect(escrowWrapper.getIndividualDepositCap().eq(depositCap)).to.be.true;

  return escrowAddress;
}

export async function waitUntilTimestamp(
  connection: Connection,
  timestamp: number
) {
  while (true) {
    const now = await getOnChainTimestamp(connection);

    console.log(`Wait until ${timestamp}, now: ${now.toString()}`);

    if (now >= BigInt(timestamp)) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

export async function initializeMerkleRootConfigs(
  connection: Connection,
  presale: Presale,
  whitelistWallets: WhitelistedWallet[],
  userKeypair: Keypair
) {
  const initMerkleRootConfigTxs =
    await presale.createMerkleRootConfigFromAddresses({
      creator: userKeypair.publicKey,
      whitelistWallets,
    });

  const latestBlockhash = await connection.getLatestBlockhash(
    connection.commitment
  );

  await Promise.all(
    initMerkleRootConfigTxs.map((tx) => {
      tx.sign(userKeypair);
      tx.recentBlockhash = latestBlockhash.blockhash;
      tx.feePayer = userKeypair.publicKey;

      return connection.sendRawTransaction(tx.serialize()).then((txSig) => {
        console.log("Init Merkle Root Config Tx Sig:", txSig);
        return connection.confirmTransaction(
          {
            ...latestBlockhash,
            signature: txSig,
          },
          connection.commitment
        );
      });
    })
  );

  const maxVersion = initMerkleRootConfigTxs.length - 1;
  const versions = [];

  for (let i = 0; i <= maxVersion; i++) {
    versions.push(new BN(i));
  }

  const merkleRootConfigAddresses = versions.map((version) =>
    deriveMerkleRootConfig(
      presale.presaleAddress,
      presale.program.programId,
      version
    )
  );

  const accounts = await connection.getMultipleAccountsInfo(
    merkleRootConfigAddresses
  );

  expect(accounts.every((acc) => acc !== null)).to.be.true;
}

export async function initPermissionedMerkleTreeFixedPricePresale(
  connection: Connection,
  presaleMinimumCap: BN,
  presaleMaximumCap: BN,
  presaleStartTime: BN,
  presaleEndTime: BN,
  lockedVestingArgs: ILockedVestingArgs,
  userKeypair: Keypair,
  baseMint: PublicKey,
  quoteMint: PublicKey,
  uiPrice: Decimal,
  priceRounding: Rounding,
  presaleSupply: BN,
  depositFeeBps: BN
) {
  const [baseMintAccount, quoteMintAccount] =
    await connection.getMultipleAccountsInfo([baseMint, quoteMint]);

  const baseMintState = unpackMint(baseMint, {
    ...baseMintAccount,
    data: Buffer.from(baseMintAccount!.data),
  });

  const quoteMintState = unpackMint(quoteMint, {
    ...quoteMintAccount,
    data: Buffer.from(quoteMintAccount!.data),
  });

  const buyerMinimumDepositCap = calculateMinimumQuoteAmountForBaseLamport(
    uiPrice,
    new BN(baseMintState.decimals),
    new BN(quoteMintState.decimals),
    priceRounding
  );

  let initPresaleTx = await Presale.createFixedPricePresale(
    connection,
    presaleProgramId,
    {
      presaleArgs: {
        presaleMinimumCap,
        presaleMaximumCap,
        presaleStartTime,
        presaleEndTime,
        whitelistMode: WhitelistMode.PermissionWithMerkleProof,
        unsoldTokenAction: UnsoldTokenAction.Refund,
        // Easier to do test
        disableEarlierPresaleEndOnceCapReached: false,
      },
      lockedVestingArgs,
      basePubkey: userKeypair.publicKey,
      baseMintPubkey: baseMint,
      quoteMintPubkey: quoteMint,
      creatorPubkey: userKeypair.publicKey,
      feePayerPubkey: userKeypair.publicKey,
      presaleRegistries: [
        {
          buyerMinimumDepositCap,
          buyerMaximumDepositCap: presaleMaximumCap,
          presaleSupply,
          depositFeeBps,
        },
      ],
    },
    {
      price: uiPrice,
      disableWithdraw: false,
      rounding: priceRounding,
    },
    false
  );

  initPresaleTx.sign(userKeypair);

  const latestBlockhash = await connection.getLatestBlockhash(
    connection.commitment
  );

  initPresaleTx.recentBlockhash = latestBlockhash.blockhash;
  initPresaleTx.feePayer = userKeypair.publicKey;

  let txSig = await connection.sendRawTransaction(initPresaleTx.serialize());
  console.log("Init Presale Tx Sig:", txSig);
  await connection.confirmTransaction(
    {
      ...latestBlockhash,
      signature: txSig,
    },
    connection.commitment
  );

  const presaleAddress = derivePresale(
    baseMint,
    quoteMint,
    userKeypair.publicKey,
    presaleProgramId
  );

  return presaleAddress;
}
