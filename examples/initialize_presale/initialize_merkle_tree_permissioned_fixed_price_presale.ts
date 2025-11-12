import { NATIVE_MINT } from "@solana/spl-token";
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import Decimal from "decimal.js";
import fs from "fs";
import os from "os";
import { WhitelistedWallet } from "../../libs/merkle_tree";
import {
  calculateLockAndVestDurationFromTimestamps,
  calculateMinimumQuoteAmountForBaseLamport,
  derivePresale,
  PRESALE_PROGRAM_ID,
} from "../../src";
import {
  ILockedVestingArgs,
  IPresaleArgs,
  IPresaleRegistryArgs,
} from "../../src/instructions";
import Presale from "../../src/presale";
import { Rounding, UnsoldTokenAction, WhitelistMode } from "../../src/type";

const connection = new Connection(clusterApiUrl("devnet"));

async function initializeMerkleTreePermissionedFixedPricePresale(
  connection: Connection,
  baseMintPubkey: PublicKey,
  quoteMintPubkey: PublicKey,
  keypair: Keypair,
  baseKeypair: Keypair,
  price: Decimal,
  presaleRegistriesArgs: IPresaleRegistryArgs[],
  presaleArgs: Omit<IPresaleArgs, "presaleMode">,
  whitelistWallets: WhitelistedWallet[],
  merkleProofServerUrl: string,
  priceRounding: Rounding,
  lockedVestingArgs?: ILockedVestingArgs
) {
  const initializeFixedPricePresaleTx = await Presale.createFixedPricePresale(
    connection,
    PRESALE_PROGRAM_ID,
    {
      baseMintPubkey,
      quoteMintPubkey,
      basePubkey: baseKeypair.publicKey,
      creatorPubkey: keypair.publicKey,
      feePayerPubkey: keypair.publicKey,
      presaleArgs,
      lockedVestingArgs,
      presaleRegistries: presaleRegistriesArgs,
    },
    {
      price,
      rounding: priceRounding,
      disableWithdraw: false,
    }
  );

  initializeFixedPricePresaleTx.sign(keypair, baseKeypair);

  let txSig = await connection.sendRawTransaction(
    initializeFixedPricePresaleTx.serialize()
  );

  console.log("Initialize presale transaction sent:", txSig);

  await connection.confirmTransaction({
    signature: txSig,
    lastValidBlockHeight: initializeFixedPricePresaleTx.lastValidBlockHeight,
    blockhash: initializeFixedPricePresaleTx.recentBlockhash,
  });

  await connection.confirmTransaction(
    {
      signature: txSig,
      lastValidBlockHeight: initializeFixedPricePresaleTx.lastValidBlockHeight,
      blockhash: initializeFixedPricePresaleTx.recentBlockhash,
    },
    "finalized"
  );

  const presaleAddress = derivePresale(
    baseMintPubkey,
    quoteMintPubkey,
    baseKeypair.publicKey,
    PRESALE_PROGRAM_ID
  );

  const presaleInstance = await Presale.create(
    connection,
    presaleAddress,
    PRESALE_PROGRAM_ID
  );

  const initTxs = await presaleInstance.createMerkleRootConfigFromAddresses({
    creator: keypair.publicKey,
    whitelistWallets,
    walletPerTree: 10_000,
  });

  await Promise.all(
    initTxs.map(async (tx) => {
      tx.sign(keypair);
      const txSig = await connection.sendRawTransaction(tx.serialize());
      console.log("Merkle root config transaction sent:", txSig);
      await connection.confirmTransaction(
        {
          signature: txSig,
          lastValidBlockHeight: tx.lastValidBlockHeight,
          blockhash: tx.recentBlockhash,
        },
        "finalized"
      );
      console.log("Merkle root config transaction confirmed:", txSig);
    })
  );

  const createPermissionedServerMetadataTx =
    await presaleInstance.createPermissionedServerMetadata({
      serverUrl: merkleProofServerUrl,
      owner: keypair.publicKey,
    });

  createPermissionedServerMetadataTx.sign(keypair);

  txSig = await connection.sendRawTransaction(
    createPermissionedServerMetadataTx.serialize()
  );

  console.log("Permissioned server metadata transaction sent:", txSig);

  await connection.confirmTransaction(
    {
      signature: txSig,
      lastValidBlockHeight:
        createPermissionedServerMetadataTx.lastValidBlockHeight,
      blockhash: createPermissionedServerMetadataTx.recentBlockhash,
    },
    "finalized"
  );
}

const keypairFilepath = `${os.homedir()}/.config/solana/id.json`;
const rawKeypair = fs.readFileSync(keypairFilepath, "utf-8");
const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(rawKeypair)));

const userKeypairFilepath = `${os.homedir()}/.config/solana/id2.json`;
const userKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(userKeypairFilepath, "utf-8")))
);

const uiPrice = new Decimal(0.1);
const priceRounding = Rounding.Down;

const presaleArgs: Omit<IPresaleArgs, "presaleMode"> = {
  presaleMaximumCap: new BN(1000000),
  presaleMinimumCap: new BN(100000),
  presaleStartTime: new BN(0),
  presaleEndTime: new BN(Math.floor(Date.now() / 1000 + 86400)),
  whitelistMode: WhitelistMode.PermissionWithMerkleProof,
  unsoldTokenAction: UnsoldTokenAction.Refund,
  disableEarlierPresaleEndOnceCapReached: false,
};

const lockEndTime = presaleArgs.presaleEndTime.add(new BN(3600));
const vestEndTime = lockEndTime.add(new BN(3600));

const { lockDuration, vestDuration } =
  calculateLockAndVestDurationFromTimestamps(
    presaleArgs.presaleEndTime,
    lockEndTime,
    vestEndTime
  );

const immediateReleaseTimestamp = presaleArgs.presaleEndTime.add(
  lockEndTime.sub(presaleArgs.presaleEndTime).div(new BN(2))
);

const lockedVestingArgs: ILockedVestingArgs = {
  lockDuration,
  vestDuration,
  immediateReleaseBps: new BN(5000),
  immediateReleaseTimestamp,
};

const buyerMinimumDepositCap = calculateMinimumQuoteAmountForBaseLamport(
  uiPrice,
  new BN(6),
  new BN(6),
  priceRounding
);

const presaleRegistriesArgs: IPresaleRegistryArgs[] = [];

presaleRegistriesArgs.push({
  presaleSupply: new BN(10000000),
  buyerMaximumDepositCap: presaleArgs.presaleMaximumCap,
  buyerMinimumDepositCap: buyerMinimumDepositCap,
  depositFeeBps: new BN(0),
});

const baseMintPubkey = new PublicKey(
  "Bn3KEckvpzxD5qxPArYPQMX9PGswZd6QypXqWPob79S"
);

const quoteMintPubkey = new PublicKey(
  "5UjL1ZbANhHrYwMWahgcdwGcHsnf4mzU78SQKvBMeb6C"
);

const baseKeypair = Keypair.generate();

const whitelistedWallets: WhitelistedWallet[] = [
  {
    account: keypair.publicKey,
    registryIndex: new BN(0),
    depositCap: new BN(1000000000),
  },
  {
    account: userKeypair.publicKey,
    registryIndex: new BN(1),
    depositCap: new BN(500000000),
  },
];

const merkleProofServerUrl = "http://localhost:8080/merkle-proof";

initializeMerkleTreePermissionedFixedPricePresale(
  connection,
  baseMintPubkey,
  quoteMintPubkey,
  keypair,
  baseKeypair,
  uiPrice,
  presaleRegistriesArgs,
  presaleArgs,
  whitelistedWallets,
  merkleProofServerUrl,
  priceRounding,
  lockedVestingArgs
);
