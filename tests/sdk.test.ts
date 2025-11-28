import {
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import BN from "bn.js";
import { expect } from "chai";
import Decimal from "decimal.js";
import { WhitelistedWallet } from "../libs/merkle_tree";
import {
  getOnChainTimestamp,
  ILockedVestingArgs,
  Presale,
  Rounding,
} from "../src";
import {
  createEscrowWithProof,
  deposit,
  initializeMerkleRootConfigs,
  initPermissionedMerkleTreeFixedPricePresale,
  presaleProgramId,
  waitUntilTimestamp,
} from "./utils";

const connection = new Connection("http://127.0.0.1:8899", "processed");

describe("SDK test", () => {
  let userKeypair: Keypair;
  let tokenMint: PublicKey;

  const baseDecimals = 9;

  before(async () => {
    userKeypair = Keypair.generate();
    let txSig = await connection.requestAirdrop(userKeypair.publicKey, 100e9);
    await connection.confirmTransaction(txSig, connection.commitment);

    const mintKeypair = Keypair.generate();
    tokenMint = mintKeypair.publicKey;

    const minRentLamports = await connection.getMinimumBalanceForRentExemption(
      MINT_SIZE,
      connection.commitment
    );

    const createMintAccountIx = SystemProgram.createAccount({
      fromPubkey: userKeypair.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports: Number(minRentLamports.toString()),
      programId: TOKEN_PROGRAM_ID,
    });

    const initializeMintIx = createInitializeMint2Instruction(
      mintKeypair.publicKey,
      baseDecimals,
      userKeypair.publicKey,
      null,
      TOKEN_PROGRAM_ID
    );

    const userMintAta = getAssociatedTokenAddressSync(
      tokenMint,
      userKeypair.publicKey
    );

    const createUserMintAtaIx =
      await createAssociatedTokenAccountIdempotentInstruction(
        userKeypair.publicKey,
        userMintAta,
        userKeypair.publicKey,
        tokenMint
      );

    const mintToIx = await createMintToInstruction(
      tokenMint,
      userMintAta,
      userKeypair.publicKey,
      BigInt(1_000_000) * BigInt(LAMPORTS_PER_SOL),
      [],
      TOKEN_PROGRAM_ID
    );

    let latestBlockhash = await connection.getLatestBlockhash(
      connection.commitment
    );

    let tx = new Transaction({
      ...latestBlockhash,
      feePayer: userKeypair.publicKey,
    }).add(
      createMintAccountIx,
      initializeMintIx,
      createUserMintAtaIx,
      mintToIx
    );
    tx.sign(userKeypair, mintKeypair);

    txSig = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(txSig, connection.commitment);
  });

  // TODO: test each functions in the SDK

  describe("Pending claimable", () => {
    let escrowAddress: PublicKey;
    let presaleAddress: PublicKey;

    before(async () => {
      // Timings
      const presaleStartTime = new Date().getTime() / 1000;
      const presaleEndTime = presaleStartTime + 60; // 60 seconds duration
      const lockedVestingArgs: ILockedVestingArgs = {
        immediateReleaseBps: new BN(0),
        vestDuration: new BN(0),
        lockDuration: new BN(5), // 5 seconds lock
        immediateReleaseTimestamp: new BN(presaleEndTime),
      };

      // Pricing
      const uiPrice = new Decimal(0.01); // 0.01 SOL per token
      const priceRounding = Rounding.Up;
      const depositFeeBps = new BN(10); // 0.1% deposit fee

      // Presale supply and caps
      const presaleSupply = new BN(500_000).mul(new BN(LAMPORTS_PER_SOL)); // 500,000 tokens
      const presaleMinimumCap = new BN(1).mul(new BN(LAMPORTS_PER_SOL));
      const presaleMaximumCap = new BN(10).mul(new BN(LAMPORTS_PER_SOL));

      // Whitelist
      const whitelistWallets: WhitelistedWallet[] = [
        {
          account: userKeypair.publicKey,
          depositCap: presaleMaximumCap,
          registryIndex: new BN(0),
        },
      ];

      presaleAddress = await initPermissionedMerkleTreeFixedPricePresale(
        connection,
        presaleMinimumCap,
        presaleMaximumCap,
        new BN(presaleStartTime),
        new BN(presaleEndTime),
        lockedVestingArgs,
        userKeypair,
        tokenMint,
        NATIVE_MINT,
        uiPrice,
        priceRounding,
        presaleSupply,
        depositFeeBps
      );

      console.log("Presale Address:", presaleAddress.toBase58());

      const presale = await Presale.create(
        connection,
        presaleAddress,
        presaleProgramId
      );

      await initializeMerkleRootConfigs(
        connection,
        presale,
        whitelistWallets,
        userKeypair
      );

      await waitUntilTimestamp(
        connection,
        presale.presaleAccount.presaleStartTime.toNumber()
      );

      console.log("Presale started, create escrow...");

      escrowAddress = await createEscrowWithProof(
        connection,
        presale,
        presaleAddress,
        userKeypair,
        whitelistWallets
      );

      console.log("Escrow Address:", escrowAddress.toBase58());

      await deposit(
        presale,
        userKeypair,
        presale.presaleAccount.presaleMaximumCap,
        connection
      );

      await waitUntilTimestamp(
        connection,
        presale.presaleAccount.presaleEndTime.toNumber()
      );
    });

    it("Calculate pending claimable amount correctly", async () => {
      const presale = await Presale.create(
        connection,
        presaleAddress,
        presaleProgramId
      );

      const escrow = await presale
        .getPresaleEscrowByOwner(userKeypair.publicKey)
        .then((e) => e[0]);

      let timestamp = await getOnChainTimestamp(connection);

      let claimableAmount = escrow.getPendingClaimableRawAmount(
        presale.getParsedPresale(),
        Number(timestamp.toString())
      );

      expect(claimableAmount.eq(new BN(0))).to.be.true;

      console.log("Waiting for lock period to end...");
      await waitUntilTimestamp(
        connection,
        presale.presaleAccount.vestingStartTime.toNumber() + 1
      );

      timestamp = await getOnChainTimestamp(connection);

      claimableAmount = escrow.getPendingClaimableRawAmount(
        presale.getParsedPresale(),
        Number(timestamp.toString())
      );

      console.log(
        "Claimable amount after lock period:",
        claimableAmount.toString()
      );
      expect(claimableAmount.gt(new BN(0))).to.be.true;
    }).timeout(1000 * 120); // 2 minutes timeout
  });
});
