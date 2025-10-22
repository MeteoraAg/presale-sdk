import { NATIVE_MINT } from "@solana/spl-token";
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import Decimal from "decimal.js";
import fs from "fs";
import os from "os";
import { deriveOperator, derivePresale, PRESALE_PROGRAM_ID } from "../../src";
import {
  ILockedVestingArgs,
  IPresaleArgs,
  IPresaleRegistryArgs,
} from "../../src/instructions";
import Presale from "../../src/presale";
import { Rounding, UnsoldTokenAction, WhitelistMode } from "../../src/type";

const connection = new Connection(clusterApiUrl("devnet"));

async function initializeAuthorityPermissionedFixedPricePresale(
  connection: Connection,
  baseMintPubkey: PublicKey,
  quoteMintPubkey: PublicKey,
  keypair: Keypair,
  baseKeypair: Keypair,
  price: Decimal,
  presaleRegistries: IPresaleRegistryArgs[],
  presaleArgs: Omit<IPresaleArgs, "presaleMode">,
  serverSigningUrl: string,
  operatorAddress: PublicKey,
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
      presaleRegistries,
    },
    {
      price,
      disableWithdraw: false,
      rounding: Rounding.Down,
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

  const createPermissionedServerMetadataTx =
    await presaleInstance.createPermissionedServerMetadata({
      serverUrl: serverSigningUrl,
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

  const operatorPda = deriveOperator(
    keypair.publicKey,
    operatorAddress,
    PRESALE_PROGRAM_ID
  );

  const operatorAccount = await connection.getAccountInfo(operatorPda);

  if (!operatorAccount) {
    console.log("Operator account does not exist, creating it...");

    const initOperatorTx = await presaleInstance.createOperator({
      operator: operatorAddress,
      creator: keypair.publicKey,
    });

    initOperatorTx.sign(keypair);
    txSig = await connection.sendRawTransaction(initOperatorTx.serialize());

    console.log("Operator initialization transaction sent:", txSig);

    await connection.confirmTransaction(
      {
        signature: txSig,
        lastValidBlockHeight: initOperatorTx.lastValidBlockHeight,
        blockhash: initOperatorTx.recentBlockhash,
      },
      "finalized"
    );
  }
}

const creatorKeypairFilepath = `${os.homedir()}/.config/solana/id.json`;
const creatorKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(creatorKeypairFilepath, "utf-8")))
);

const operatorKeypairFilepath = `${os.homedir()}/.config/solana/operator.json`;
const operatorKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(operatorKeypairFilepath, "utf-8")))
);

const presaleRegistriesArgs: IPresaleRegistryArgs[] = [];

presaleRegistriesArgs.push({
  presaleSupply: new BN(2000000000),
  buyerMaximumDepositCap: new BN(1000000000),
  buyerMinimumDepositCap: new BN(10000000),
  depositFeeBps: new BN(0),
});

presaleRegistriesArgs.push({
  presaleSupply: new BN(1000000000),
  buyerMaximumDepositCap: new BN(500000000),
  buyerMinimumDepositCap: new BN(5000000),
  depositFeeBps: new BN(0),
});

const presaleArgs: Omit<IPresaleArgs, "presaleMode"> = {
  presaleMaximumCap: new BN(100000000000),
  presaleMinimumCap: new BN(1000000000),
  presaleStartTime: new BN(0),
  presaleEndTime: new BN(Math.floor(Date.now() / 1000 + 86400)),
  whitelistMode: WhitelistMode.PermissionWithAuthority,
  unsoldTokenAction: UnsoldTokenAction.Refund,
  disableEarlierPresaleEndOnceCapReached: false,
};

const lockedVestingArgs: ILockedVestingArgs = {
  immediateReleaseBps: new BN(0),
  lockDuration: new BN(3600),
  vestDuration: new BN(3600),
  immediateReleaseTimestamp: presaleArgs.presaleEndTime.add(new BN(1800)),
};

const baseMintPubkey = new PublicKey(
  "Bn3KEckvpzxD5qxPArYPQMX9PGswZd6QypXqWPob79S"
);

const quoteMintPubkey = NATIVE_MINT;

const baseKeypair = Keypair.generate();

const serverSigningUrl = "http://localhost:8080/auth-sign";

initializeAuthorityPermissionedFixedPricePresale(
  connection,
  baseMintPubkey,
  quoteMintPubkey,
  creatorKeypair,
  baseKeypair,
  new Decimal(0.1),
  presaleRegistriesArgs,
  presaleArgs,
  serverSigningUrl,
  operatorKeypair.publicKey,
  lockedVestingArgs
);
