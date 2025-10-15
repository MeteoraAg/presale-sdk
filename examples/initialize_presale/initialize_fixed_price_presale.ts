import { NATIVE_MINT } from "@solana/spl-token";
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import fs from "fs";
import os from "os";
import { derivePresale, PRESALE_PROGRAM_ID } from "../../src";
import {
  ILockedVestingArgs,
  IPresaleArgs,
  IPresaleRegistryArgs,
} from "../../src/instructions";
import Presale from "../../src/presale";
import { Rounding, UnsoldTokenAction, WhitelistMode } from "../../src/type";
import Decimal from "decimal.js";

const connection = new Connection(clusterApiUrl("devnet"));

async function initializeFixedPricePresale(
  connection: Connection,
  baseMintPubkey: PublicKey,
  quoteMintPubkey: PublicKey,
  keypair: Keypair,
  baseKeypair: Keypair,
  price: Decimal,
  presaleRegistriesArgs: IPresaleRegistryArgs[],
  presaleArgs: Omit<IPresaleArgs, "presaleMode">,
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
      presaleRegistries: presaleRegistriesArgs,
      presaleArgs,
      lockedVestingArgs,
    },
    {
      price,
      rounding: Rounding.Down,
    }
  );

  initializeFixedPricePresaleTx.sign(keypair, baseKeypair);

  const txSig = await connection.sendRawTransaction(
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

  console.log("Presale state: ", presaleInstance.presaleAccount);
}

const keypairFilepath = `${os.homedir()}/.config/solana/id.json`;
const rawKeypair = fs.readFileSync(keypairFilepath, "utf-8");
const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(rawKeypair)));

const presaleRegistriesArgs: IPresaleRegistryArgs[] = [];

presaleRegistriesArgs.push({
  presaleSupply: new BN(2000000000),
  depositFeeBps: new BN(0),
  buyerMaximumDepositCap: new BN(100000000),
  buyerMinimumDepositCap: new BN(100000),
});

const presaleArgs: Omit<IPresaleArgs, "presaleMode"> = {
  presaleMaximumCap: new BN(100000000),
  presaleMinimumCap: new BN(1000000),
  presaleStartTime: new BN(0),
  presaleEndTime: new BN(Math.floor(Date.now() / 1000 + 3600)),
  whitelistMode: WhitelistMode.Permissionless,
  unsoldTokenAction: UnsoldTokenAction.Refund,
};

const lockedVestingArgs: ILockedVestingArgs = {
  lockDuration: new BN(0),
  vestDuration: new BN(0),
  immediateReleaseBps: new BN(10_000),
};

const baseMintPubkey = new PublicKey(
  "FQuMNJ6UcrkA3xMLsmmLL8sk47RkZYod57mX3a8w1brg"
);

const quoteMintPubkey = NATIVE_MINT;

const baseKeypair = Keypair.generate();

initializeFixedPricePresale(
  connection,
  baseMintPubkey,
  quoteMintPubkey,
  keypair,
  baseKeypair,
  new Decimal(0.1),
  presaleRegistriesArgs,
  presaleArgs,
  lockedVestingArgs
);
