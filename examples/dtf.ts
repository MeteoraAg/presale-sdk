import { NATIVE_MINT, unpackMint } from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import { Decimal } from "decimal.js";
import fs from "fs";
import os from "os";
import {
  calculateLockAndVestDurationFromTimestamps,
  calculateMinimumQuoteAmountForBaseLamport,
  derivePresale,
  ICreateInitializePresaleIxParams,
  IPresaleArgs,
  Presale,
  PRESALE_PROGRAM_ID,
  Rounding,
  UnsoldTokenAction,
  WhitelistMode,
} from "../src";

const nodeUrl = "http://127.0.0.1:8899";
const keypairFilepath = `${os.homedir()}/.config/solana/id.json`;

// Mint configurations
const baseTokenMint = new PublicKey(
  "Bn3KEckvpzxD5qxPArYPQMX9PGswZd6QypXqWPob79S"
);
const quoteTokenMint = NATIVE_MINT;

// Presale configuration
const presaleStartUnixTimestamp = 1764460800; // 1 Dec 2025
const presaleDuration = 3600; // 1 hour
const whitelistMode = WhitelistMode.PermissionWithMerkleProof;
const disableEarlierPresaleEndOnceCapReached = true;
const unsoldTokenAction = UnsoldTokenAction.Burn;
const depositFeeBps = new BN(5); // 0.05%
const immediateReleaseBps = new BN(1000); // 10%
const vestDuration = new BN(86400).mul(new BN(365)); // 1 year

const totalSupplyForSale = new BN(1_000_000); // 1 million base tokens
const distributionConfiguration = [5000, 3000, 2000];

async function main() {
  const connection = new Connection(nodeUrl);
  const keypair = loadKeypairFromFile(keypairFilepath);

  const tokenAccounts = await connection.getMultipleAccountsInfo([
    baseTokenMint,
    quoteTokenMint,
  ]);

  const baseTokenAccount = tokenAccounts[0];
  const quoteTokenAccount = tokenAccounts[1];

  const baseTokenState = unpackMint(baseTokenMint, {
    data: Buffer.from(baseTokenAccount!.data),
    ...baseTokenAccount,
  });
  const baseTokenRawAmountMultiplier = new BN(10).pow(
    new BN(baseTokenState.decimals)
  );

  const quoteTokenState = unpackMint(quoteTokenMint, {
    data: Buffer.from(quoteTokenAccount!.data),
    ...quoteTokenAccount,
  });
  const quoteTokenRawAmountMultiplier = new BN(10).pow(
    new BN(quoteTokenState.decimals)
  );

  const fixedPriceParams: {
    price: Decimal;
    disableWithdraw: boolean;
    rounding: Rounding;
  } = {
    price: new Decimal(0.01),
    disableWithdraw: true,
    rounding: Rounding.Down,
  };

  const rawTotalSupplyForSale = totalSupplyForSale.mul(
    baseTokenRawAmountMultiplier
  );

  let presale0Supply = rawTotalSupplyForSale
    .mul(new BN(distributionConfiguration[0]))
    .div(new BN(10000));

  const presale1Supply = rawTotalSupplyForSale
    .mul(new BN(distributionConfiguration[1]))
    .div(new BN(10000));

  const presale2Supply = rawTotalSupplyForSale
    .mul(new BN(distributionConfiguration[2]))
    .div(new BN(10000));

  // Shift precision loss to presale 0
  presale0Supply = rawTotalSupplyForSale.sub(
    presale1Supply.add(presale2Supply)
  );

  const presaleMaximumCap = new BN(100).mul(quoteTokenRawAmountMultiplier);
  const presaleMinimumCap = new BN(1).mul(quoteTokenRawAmountMultiplier);

  const buyerMinimumDepositCap = calculateMinimumQuoteAmountForBaseLamport(
    fixedPriceParams.price,
    new BN(baseTokenState.decimals),
    new BN(quoteTokenState.decimals),
    fixedPriceParams.rounding
  );
  const buyerMaximumDepositCap = presaleMaximumCap;

  const baseKeypair0 = Keypair.generate();
  const baseKeypair1 = Keypair.generate();
  const baseKeypair2 = Keypair.generate();

  const presaleArgs0: Omit<IPresaleArgs, "presaleMode"> = {
    presaleMaximumCap,
    presaleMinimumCap,
    presaleStartTime: new BN(presaleStartUnixTimestamp),
    presaleEndTime: new BN(presaleStartUnixTimestamp).add(
      new BN(presaleDuration)
    ),
    whitelistMode,
    disableEarlierPresaleEndOnceCapReached,
    unsoldTokenAction,
  };

  const presaleArgs1: Omit<IPresaleArgs, "presaleMode"> = {
    presaleMaximumCap,
    presaleMinimumCap,
    presaleStartTime: presaleArgs0.presaleEndTime,
    presaleEndTime: presaleArgs0.presaleEndTime.add(new BN(presaleDuration)),
    whitelistMode,
    disableEarlierPresaleEndOnceCapReached,
    unsoldTokenAction,
  };

  const presaleArgs2: Omit<IPresaleArgs, "presaleMode"> = {
    presaleMaximumCap,
    presaleMinimumCap,
    presaleStartTime: presaleArgs1.presaleEndTime,
    presaleEndTime: presaleArgs1.presaleEndTime.add(new BN(presaleDuration)),
    whitelistMode,
    disableEarlierPresaleEndOnceCapReached,
    unsoldTokenAction,
  };

  const unlockUnixTimestamp = presaleArgs2.presaleEndTime.add(new BN(3600)); // 1 hour after last presale ends
  const vestEndUnixTimestamp = unlockUnixTimestamp.add(vestDuration);

  const { lockDuration: presale0LockDuration } =
    calculateLockAndVestDurationFromTimestamps(
      presaleArgs0.presaleEndTime,
      unlockUnixTimestamp,
      vestEndUnixTimestamp
    );

  const { lockDuration: presale1LockDuration } =
    calculateLockAndVestDurationFromTimestamps(
      presaleArgs1.presaleEndTime,
      unlockUnixTimestamp,
      vestEndUnixTimestamp
    );

  const { lockDuration: presale2LockDuration } =
    calculateLockAndVestDurationFromTimestamps(
      presaleArgs2.presaleEndTime,
      unlockUnixTimestamp,
      vestEndUnixTimestamp
    );

  const initPresale0Params: Omit<ICreateInitializePresaleIxParams, "program"> =
    {
      presaleArgs: presaleArgs0,
      baseMintPubkey: baseTokenMint,
      quoteMintPubkey: quoteTokenMint,
      basePubkey: baseKeypair0.publicKey,
      feePayerPubkey: keypair.publicKey,
      creatorPubkey: keypair.publicKey,
      lockedVestingArgs: {
        lockDuration: presale0LockDuration,
        vestDuration,
        immediateReleaseBps,
        immediateReleaseTimestamp: unlockUnixTimestamp,
      },
      presaleRegistries: [
        {
          buyerMinimumDepositCap,
          buyerMaximumDepositCap,
          depositFeeBps,
          presaleSupply: presale0Supply,
        },
      ],
    };

  const initPresale0Tx = await Presale.createFixedPricePresale(
    connection,
    PRESALE_PROGRAM_ID,
    initPresale0Params,
    fixedPriceParams
  );

  initPresale0Tx.sign(keypair, baseKeypair0);
  let txSig = await connection.sendRawTransaction(initPresale0Tx.serialize());
  console.log("Presale 0 initialized. Tx Sig:", txSig);
  await connection.confirmTransaction({
    signature: txSig,
    blockhash: initPresale0Tx.recentBlockhash,
    lastValidBlockHeight: initPresale0Tx.lastValidBlockHeight,
  });

  const initPresale1Params: Omit<ICreateInitializePresaleIxParams, "program"> =
    {
      presaleArgs: presaleArgs1,
      baseMintPubkey: baseTokenMint,
      quoteMintPubkey: quoteTokenMint,
      basePubkey: baseKeypair1.publicKey,
      feePayerPubkey: keypair.publicKey,
      creatorPubkey: keypair.publicKey,
      lockedVestingArgs: {
        lockDuration: presale1LockDuration,
        vestDuration,
        immediateReleaseBps,
        immediateReleaseTimestamp: unlockUnixTimestamp,
      },
      presaleRegistries: [
        {
          buyerMinimumDepositCap,
          buyerMaximumDepositCap,
          depositFeeBps,
          presaleSupply: presale1Supply,
        },
      ],
    };

  const initPresale1Tx = await Presale.createFixedPricePresale(
    connection,
    PRESALE_PROGRAM_ID,
    initPresale1Params,
    fixedPriceParams
  );

  initPresale1Tx.sign(keypair, baseKeypair1);
  txSig = await connection.sendRawTransaction(initPresale1Tx.serialize());
  console.log("Presale 1 initialized. Tx Sig:", txSig);
  await connection.confirmTransaction({
    signature: txSig,
    blockhash: initPresale1Tx.recentBlockhash,
    lastValidBlockHeight: initPresale1Tx.lastValidBlockHeight,
  });

  const initPresale2Params: Omit<ICreateInitializePresaleIxParams, "program"> =
    {
      presaleArgs: presaleArgs2,
      baseMintPubkey: baseTokenMint,
      quoteMintPubkey: quoteTokenMint,
      basePubkey: baseKeypair2.publicKey,
      feePayerPubkey: keypair.publicKey,
      creatorPubkey: keypair.publicKey,
      lockedVestingArgs: {
        lockDuration: presale2LockDuration,
        vestDuration,
        immediateReleaseBps,
        immediateReleaseTimestamp: unlockUnixTimestamp,
      },
      presaleRegistries: [
        {
          buyerMinimumDepositCap,
          buyerMaximumDepositCap,
          depositFeeBps,
          presaleSupply: presale2Supply,
        },
      ],
    };

  const initPresale2Tx = await Presale.createFixedPricePresale(
    connection,
    PRESALE_PROGRAM_ID,
    initPresale2Params,
    fixedPriceParams
  );

  initPresale2Tx.sign(keypair, baseKeypair2);
  txSig = await connection.sendRawTransaction(initPresale2Tx.serialize());
  console.log("Presale 2 initialized. Tx Sig:", txSig);
  await connection.confirmTransaction({
    signature: txSig,
    blockhash: initPresale2Tx.recentBlockhash,
    lastValidBlockHeight: initPresale2Tx.lastValidBlockHeight,
  });

  const presale0Pubkey = derivePresale(
    baseTokenMint,
    quoteTokenMint,
    baseKeypair0.publicKey,
    PRESALE_PROGRAM_ID
  );

  const presale1Pubkey = derivePresale(
    baseTokenMint,
    quoteTokenMint,
    baseKeypair1.publicKey,
    PRESALE_PROGRAM_ID
  );

  const presale2Pubkey = derivePresale(
    baseTokenMint,
    quoteTokenMint,
    baseKeypair2.publicKey,
    PRESALE_PROGRAM_ID
  );

  console.log("Presale0 pubkey", presale0Pubkey.toBase58());
  console.log("Presale1 pubkey", presale1Pubkey.toBase58());
  console.log("Presale2 pubkey", presale2Pubkey.toBase58());
}

function loadKeypairFromFile(filePath: string) {
  const keypairData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  return keypair;
}

main().catch((err) => {
  console.error(err);
});
