import { Program } from "@coral-xyz/anchor";
import {
  AccountInfo,
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  AccountsType,
  EscrowAccount,
  MerkleProofResponse,
  PresaleAccount,
  PresaleProgram,
  Rounding,
  TransferHookAccountInfo,
  WhitelistMode,
} from "./type";

import { Mint, unpackMint } from "@solana/spl-token";
import BN from "bn.js";
import Decimal from "decimal.js";
import { DEFAULT_PERMISSIONLESS_REGISTRY_INDEX, PRESALE_PROGRAM_ID } from ".";
import { BalanceTree, WhitelistedWallet } from "../libs/merkle_tree";
import {
  getEscrowFilter,
  getEscrowPresaleFilter,
  getEscrowRegistryIndexFilter,
  getPresaleFilter,
} from "./accounts";
import { EscrowWrapper, IEscrowWrapper } from "./accounts/escrow_wrapper";
import { PresaleWrapper } from "./accounts/presale_wrapper";
import type { Presale as PresaleTypes } from "./idl/presale";
import PresaleIDL from "./idl/presale.json";
import {
  autoFetchProofAndCreatePermissionedEscrowWithMerkleProofIx,
  createClaimIx,
  createCloseEscrowIx,
  createCloseFixedPriceArgsIx,
  createClosePermissionedServerMetadataIx,
  createCreatorCollectFeeIx,
  createCreatorWithdrawIx,
  createInitializeFcfsPresaleIx,
  createInitializeFixedPricePresaleIx,
  createInitializeProrataPresaleIx,
  createMerkleRootConfigIx,
  createOperatorIx,
  createPerformUnsoldBaseTokenActionIx,
  createPermissionedEscrowWithCreatorIx,
  createPermissionedEscrowWithMerkleProofIx,
  createPermissionlessEscrowIx,
  createRefreshEscrowIx,
  createRevokeOperatorIx,
  createWithdrawIx,
  createWithdrawRemainingQuoteIx,
  fetchPartialSignedInitEscrowAndDepositTransactionFromOperator,
  getOrCreatePermissionedEscrowWithMerkleProofIx,
  getOrCreatePermissionlessEscrowIx,
  IClaimParams,
  ICloseEscrowParams,
  IClosePermissionedServerMetadataParams,
  ICreateCloseFixedPriceArgsParams,
  ICreateInitializePresaleIxParams,
  ICreateMerkleRootConfigParams,
  ICreateOperatorParams,
  ICreatePermissionedEscrowWithCreatorParams,
  ICreatePermissionedEscrowWithMerkleProofParams,
  ICreatePermissionlessEscrowParams,
  ICreatorWithdrawParams,
  IRefreshEscrowParams,
  IRevokeOperatorParams,
  IWithdrawParams,
  IWithdrawRemainingQuoteParams,
} from "./instructions";
import {
  createInitializePermissionedServerMetadataIx,
  ICreatePermissionedServerMetadataParams,
} from "./instructions/create_permissioned_server_metadata";
import { createDepositIx, IDepositParams } from "./instructions/deposit";
import { uiPriceToQPrice } from "./math";
import { deriveEscrow, deriveMerkleRootConfig } from "./pda";
import {
  fetchMultipleAccountsAutoChunk,
  getSimulationComputeUnits,
} from "./rpc";
import { getSliceAndExtraAccountMetasForTransferHook } from "./token2022";

/**
 * Creates and returns an instance of the Presale program.
 *
 * @param connection - The Solana connection object to interact with the blockchain.
 * @param programId - The public key identifying the deployed Presale program.
 * @returns An initialized `Program<PresaleTypes>` instance for interacting with the Presale program.
 */
function createPresaleProgram(connection: Connection, programId: PublicKey) {
  const program = new Program<PresaleTypes>(
    {
      ...PresaleIDL,
      address: programId.toBase58(),
    } as PresaleTypes,
    {
      connection,
    }
  );

  return program;
}

/**
 * Fetches and prepares account information required for caching in the presale context.
 *
 * This function retrieves the presale account data, fetches mint account information for both
 * base and quote mints, and gathers any extra account metas needed for transfer hooks.
 * It then constructs a `TransferHookAccountInfo` object containing relevant slices and extra account metas.
 *
 * @param presaleProgram - The presale program instance containing provider and account definitions.
 * @param presaleAddress - The public key address of the presale account to fetch.
 * @returns An object containing the fetched `presaleAccount` and the constructed `transferHookAccountInfo`.
 */
async function fetchAccountsForCache(
  presaleProgram: PresaleProgram,
  presaleAddress: PublicKey
): Promise<{
  presaleAccount: PresaleAccount;
  baseMintSliceAndTransferHookAccounts: TransferHookAccountInfo;
  quoteMintSliceAndTransferHookAccounts: TransferHookAccountInfo;
  baseMint: Mint;
  quoteMint: Mint;
}> {
  const connection = presaleProgram.provider.connection;

  const presaleAccount = await presaleProgram.account.presale.fetch(
    presaleAddress
  );

  const [baseMintAccount, quoteMintAccount] =
    await connection.getMultipleAccountsInfo([
      presaleAccount.baseMint,
      presaleAccount.quoteMint,
    ]);

  const [
    baseMintSliceAndTransferHookAccounts,
    quoteMintSliceAndTransferHookAccounts,
  ] = await Promise.all([
    getSliceAndExtraAccountMetasForTransferHook(
      connection,
      presaleAccount.baseMint,
      baseMintAccount,
      AccountsType.TransferHookBase
    ),
    getSliceAndExtraAccountMetasForTransferHook(
      connection,
      presaleAccount.quoteMint,
      quoteMintAccount,
      AccountsType.TransferHookQuote
    ),
  ]);

  const baseMint = unpackMint(
    presaleAccount.baseMint,
    baseMintAccount,
    baseMintAccount.owner
  );

  const quoteMint = unpackMint(
    presaleAccount.quoteMint,
    quoteMintAccount,
    quoteMintAccount.owner
  );

  return {
    presaleAccount,
    baseMintSliceAndTransferHookAccounts: {
      slices: baseMintSliceAndTransferHookAccounts.slices,
      extraAccountMetas: baseMintSliceAndTransferHookAccounts.extraAccountMetas,
    },
    quoteMintSliceAndTransferHookAccounts: {
      slices: quoteMintSliceAndTransferHookAccounts.slices,
      extraAccountMetas:
        quoteMintSliceAndTransferHookAccounts.extraAccountMetas,
    },
    baseMint,
    quoteMint,
  };
}

async function buildTransactionWithOptimizedComputeUnit(
  connection: Connection,
  instructions: TransactionInstruction[],
  feePayer: PublicKey
) {
  const estimatedComputeUnit = await getSimulationComputeUnits(
    connection,
    instructions,
    feePayer,
    []
  ).catch((_e) => {
    // Follow default behavior of default CU
    return Math.min(1_400_000, instructions.length * 200_000);
  });

  const setCuIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: estimatedComputeUnit,
  });

  return buildTransaction(connection, [setCuIx, ...instructions], feePayer);
}

async function buildTransaction(
  connection: Connection,
  instructions: TransactionInstruction[],
  feePayer: PublicKey
) {
  const latestBlockhashInfo = await connection.getLatestBlockhash();
  return new Transaction({
    ...latestBlockhashInfo,
    feePayer,
  }).add(...instructions);
}

export class Presale {
  constructor(
    public program: PresaleProgram,
    public presaleAddress: PublicKey,
    public presaleAccount: PresaleAccount,
    public baseMint: Mint,
    public quoteMint: Mint,
    public baseTransferHookAccountInfo: TransferHookAccountInfo,
    public quoteTransferHookAccountInfo: TransferHookAccountInfo
  ) {}

  /**
   * Creates a new instance of the `Presale` class using the provided Solana connection,
   * presale address, and program ID. Initializes the Anchor `Program` with the specified IDL and
   * derives the presale authority address.
   *
   * @param connection - The Solana connection object to interact with the blockchain.
   * @param presaleAddress - The public key representing the presale account.
   * @param programId - The public key of the deployed program.
   * @returns A Promise that resolves to a new `Presale` instance.
   */
  static async create(
    connection: Connection,
    presaleAddress: PublicKey,
    programId?: PublicKey
  ) {
    const presaleProgram = createPresaleProgram(
      connection,
      programId ?? PRESALE_PROGRAM_ID
    );
    const {
      presaleAccount,
      baseMintSliceAndTransferHookAccounts,
      quoteMintSliceAndTransferHookAccounts,
      baseMint,
      quoteMint,
    } = await fetchAccountsForCache(presaleProgram, presaleAddress);

    return new Presale(
      presaleProgram,
      presaleAddress,
      presaleAccount,
      baseMint,
      quoteMint,
      baseMintSliceAndTransferHookAccounts,
      quoteMintSliceAndTransferHookAccounts
    );
  }

  /**
   * Creates a new prorata presale transaction.
   *
   * This static method constructs and returns a `Transaction` object for initializing
   * a prorata presale on the specified Solana program. It prepares the necessary instruction
   * and sets the transaction's fee payer and blockhash.
   *
   * @param connection - The Solana connection object used to interact with the network.
   * @param programId - The public key of the presale program.
   * @param params - The parameters required to initialize the presale, excluding the program reference.
   * @returns A Promise that resolves to a `Transaction` object containing the initialization instruction.
   */
  static async createProrataPresale(
    connection: Connection,
    programId: PublicKey,
    params: Omit<ICreateInitializePresaleIxParams, "program">
  ) {
    const initializePresaleIx = await createInitializeProrataPresaleIx({
      program: createPresaleProgram(connection, programId),
      ...params,
    });

    return buildTransactionWithOptimizedComputeUnit(
      connection,
      [initializePresaleIx],
      params.feePayerPubkey
    );
  }

  /**
   * Creates a transaction to initialize a First-Come-First-Serve (FCFS) presale on the Solana blockchain.
   *
   * This method constructs the required instruction for initializing an FCFS presale,
   * fetches the latest blockhash, and returns a `Transaction` object ready to be signed and sent.
   *
   * @param connection - The Solana connection object used to interact with the blockchain.
   * @param programId - The public key of the presale program.
   * @param params - The parameters required to initialize the presale, excluding the program reference.
   *                 Must include the fee payer's public key as `feePayerPubkey`.
   * @returns A `Transaction` object containing the initialization instruction for the FCFS presale.
   */
  static async createFcfsPresale(
    connection: Connection,
    programId: PublicKey,
    params: Omit<ICreateInitializePresaleIxParams, "program">
  ) {
    const initializePresaleIx = await createInitializeFcfsPresaleIx({
      program: createPresaleProgram(connection, programId),
      ...params,
    });

    return buildTransactionWithOptimizedComputeUnit(
      connection,
      [initializePresaleIx],
      params.feePayerPubkey
    );
  }

  /**
   * Creates a Solana transaction to initialize a fixed price presale.
   *
   * This method fetches mint account information, prepares the presale program,
   * constructs the initialization instruction, and returns a transaction ready to be signed and sent.
   *
   * @param connection - The Solana connection object.
   * @param programId - The public key of the presale program.
   * @param presaleParams - Parameters for initializing the presale, excluding the program reference.
   * @param fixedPriceParams - Parameters specific to the fixed price presale, including unsold token action, price, and rounding.
   * @returns A Promise that resolves to a Transaction containing the initialization instruction.
   */
  static async createFixedPricePresale(
    connection: Connection,
    programId: PublicKey,
    presaleParams: Omit<ICreateInitializePresaleIxParams, "program">,
    fixedPriceParams: {
      price: Decimal;
      rounding: Rounding;
    }
  ) {
    const [baseMintAccount, quoteMintAccount] =
      await connection.getMultipleAccountsInfo([
        presaleParams.baseMintPubkey,
        presaleParams.quoteMintPubkey,
      ]);

    const baseMint = unpackMint(presaleParams.baseMintPubkey, baseMintAccount);
    const quoteMint = unpackMint(
      presaleParams.quoteMintPubkey,
      quoteMintAccount
    );

    const program = createPresaleProgram(connection, programId);
    const initializePresaleIxs = await createInitializeFixedPricePresaleIx(
      {
        ...presaleParams,
        program,
      },
      {
        baseMintPubkey: presaleParams.baseMintPubkey,
        quoteMintPubkey: presaleParams.quoteMintPubkey,
        feePayerPubkey: presaleParams.feePayerPubkey,
        basePubkey: presaleParams.basePubkey,
        ownerPubkey: presaleParams.creatorPubkey,
        qPrice: uiPriceToQPrice(
          fixedPriceParams.price.toNumber(),
          baseMint.decimals,
          quoteMint.decimals,
          fixedPriceParams.rounding
        ),
        program,
      }
    );

    return buildTransactionWithOptimizedComputeUnit(
      connection,
      initializePresaleIxs,
      presaleParams.feePayerPubkey
    );
  }

  /**
   * Creates a transaction to close a fixed price presale on the blockchain.
   *
   * This static method constructs and returns a `Transaction` object that includes
   * the necessary instruction to close a fixed price presale, using the provided
   * connection, parameters, and program ID.
   *
   * @param connection - The Solana connection object to interact with the blockchain.
   * @param params - The parameters required to close the fixed price presale, excluding the presale program.
   * @param programId - The public key of the presale program.
   * @returns A Promise that resolves to a `Transaction` containing the close presale instruction.
   */
  static async closeFixedPricePresaleArgs(
    connection: Connection,
    params: Omit<ICreateCloseFixedPriceArgsParams, "presaleProgram">,
    programId: PublicKey
  ) {
    const presaleProgram = createPresaleProgram(connection, programId);

    const { baseMint, quoteMint, base, owner } = params;

    const closeFixedPricePresaleArgsIx = await createCloseFixedPriceArgsIx({
      presaleProgram,
      baseMint,
      quoteMint,
      base,
      owner,
    });

    return buildTransactionWithOptimizedComputeUnit(
      connection,
      [closeFixedPricePresaleArgsIx],
      params.owner
    );
  }

  /**
   * Creates a transaction to initialize a Merkle root configuration for a presale.
   *
   * This method constructs the necessary instruction using the provided parameters,
   * fetches the latest blockhash, and returns a `Transaction` object with the instruction added.
   *
   * @param params - The parameters required to create the Merkle root configuration, excluding the `presaleProgram`.
   * @returns A `Transaction` object containing the Merkle root configuration instruction.
   */
  async createMerkleRootConfig(
    params: Omit<
      ICreateMerkleRootConfigParams,
      "presaleProgram" | "presaleAddress"
    >
  ) {
    const initMerkleRootConfigIx = await createMerkleRootConfigIx({
      presaleProgram: this.program,
      presaleAddress: this.presaleAddress,
      ...params,
    });

    const { creator } = params;

    return buildTransactionWithOptimizedComputeUnit(
      this.program.provider.connection,
      [initMerkleRootConfigIx],
      creator
    );
  }

  /**
   * Creates Merkle root configuration transactions from a list of addresses.
   *
   * Splits the provided addresses into chunks (default size: 10,000), constructs a Merkle tree for each chunk,
   * and generates corresponding instructions to initialize Merkle root configs on-chain.
   * Returns an array of transactions, each containing the initialization instruction for a Merkle root config.
   *
   * @param params - The parameters for creating Merkle root configs.
   * @param params.addresses - Array of public keys to include in the Merkle trees.
   * @param params.addressPerTree - Optional. Number of addresses per Merkle tree chunk. Defaults to 10,000.
   * @param params.creator - The public key of the creator, used as the transaction fee payer.
   * @returns Promise resolving to an array of transactions, each containing an instruction to initialize a Merkle root config.
   */
  async createMerkleRootConfigFromAddresses(
    params: Omit<
      ICreateMerkleRootConfigParams,
      "presaleProgram" | "presaleAddress" | "version" | "root"
    > & {
      whitelistWallets: WhitelistedWallet[];
      walletPerTree?: number;
    }
  ) {
    let { whitelistWallets, walletPerTree, creator } = params;
    walletPerTree = walletPerTree || 10_000;

    const merkleTrees: BalanceTree[] = [];

    while (whitelistWallets.length > 0) {
      const chunkledWhitelistWallets = whitelistWallets.splice(
        0,
        walletPerTree
      );
      const balanceTree = new BalanceTree(chunkledWhitelistWallets);
      merkleTrees.push(balanceTree);
    }

    const initMerkleRootConfigsIx = await Promise.all(
      merkleTrees.map((tree, index) => {
        const root = tree.getRoot();
        return createMerkleRootConfigIx({
          presaleProgram: this.program,
          presaleAddress: this.presaleAddress,
          root,
          version: new BN(index),
          creator,
        });
      })
    );

    const latestBlockhashInfo =
      await this.program.provider.connection.getLatestBlockhash();

    return initMerkleRootConfigsIx.map((ix) => {
      return new Transaction({
        ...latestBlockhashInfo,
        feePayer: creator,
      }).add(ix);
    });
  }

  /**
   * Generates Merkle proof responses for a list of addresses, chunked by a specified size per Merkle tree.
   *
   * This method splits the provided addresses into chunks (default size: 10,000), constructs a Merkle tree for each chunk,
   * and derives a Merkle root configuration for each tree version. For every address, it generates a Merkle proof and
   * returns an object mapping each address (as a base58 string) to its corresponding Merkle proof response.
   *
   * @param params - The configuration parameters for generating Merkle proofs.
   * @param params.addresses - The list of public keys for which to generate Merkle proofs.
   * @param params.addressPerTree - Optional. The number of addresses per Merkle tree chunk. Defaults to 10,000.
   * @param params.creator - The creator's public key.
   * @returns A promise that resolves to an object mapping each address (base58 string) to its Merkle proof response.
   */
  async createMerkleProofResponse(
    params: Omit<
      ICreateMerkleRootConfigParams,
      "presaleProgram" | "presaleAddress" | "version" | "root" | "creator"
    > & {
      whitelistWallets: WhitelistedWallet[];
      walletPerTree?: number;
    }
  ): Promise<{
    [address: string]: MerkleProofResponse;
  }> {
    let { whitelistWallets, walletPerTree } = params;
    walletPerTree = walletPerTree || 10_000;

    let merkleProofs: {
      [address: string]: MerkleProofResponse;
    } = {};

    let version = 0;

    while (whitelistWallets.length > 0) {
      const chunkedWhitelistWallets = whitelistWallets.splice(0, walletPerTree);
      const balanceTree = new BalanceTree(chunkedWhitelistWallets);

      const merkleRootConfig = deriveMerkleRootConfig(
        this.presaleAddress,
        this.program.programId,
        new BN(version)
      );

      for (const whitelistWallet of chunkedWhitelistWallets) {
        const proof = balanceTree.getProof(whitelistWallet);
        const { account, depositCap, registryIndex } = whitelistWallet;
        const key = `${account.toBase58()}-${registryIndex.toString()}`;
        merkleProofs[key] = {
          merkle_root_config: merkleRootConfig.toBase58(),
          proof: proof.map((p) => Array.from(p)),
          deposit_cap: depositCap.toNumber(),
        };
      }

      version++;
    }

    return merkleProofs;
  }

  /**
   * Creates a permissionless escrow transaction for a presale.
   *
   * This method constructs and returns a `Transaction` object that initializes a permissionless escrow
   * using the provided parameters. The transaction includes the latest blockhash and sets the fee payer.
   *
   * @param params - The parameters required to create the permissionless escrow, excluding `presaleProgram` and `presaleAddress`.
   * @returns A `Transaction` object containing the instruction to initialize the permissionless escrow.
   */
  async createPermissionlessEscrow(
    params: Omit<
      ICreatePermissionlessEscrowParams,
      "presaleProgram" | "presaleAddress"
    >
  ) {
    const initPermissionlessEscrowIx = await createPermissionlessEscrowIx({
      presaleProgram: this.program,
      presaleAddress: this.presaleAddress,
      ...params,
    });

    return buildTransactionWithOptimizedComputeUnit(
      this.program.provider.connection,
      [initPermissionlessEscrowIx],
      params.payer
    );
  }

  /**
   * Creates a permissioned escrow by automatically fetching the Merkle proof from metadata.
   *
   * This method derives the Merkle proof metadata address using the presale address and program ID,
   * fetches the metadata state, constructs the Merkle proof API URL, and retrieves the Merkle proof
   * for the specified owner. It then calls `createPermissionedEscrowWithMerkleProof` with the fetched
   * proof and Merkle root configuration.
   *
   * @param params - The parameters required to create the permissioned escrow, excluding
   *                 `presaleProgram`, `presaleAddress`, `proof`, and `merkleRootConfig`.
   * @returns A promise that resolves to the result of `createPermissionedEscrowWithMerkleProof`.
   * @throws If the Merkle proof cannot be fetched from the constructed API URL.
   */
  async createPermissionedEscrowWithAutoFetchMerkleProofFromMetadata(
    params: Omit<
      ICreatePermissionedEscrowWithMerkleProofParams,
      "presaleProgram" | "presaleAddress" | "proof" | "merkleRootConfig"
    >
  ) {
    return autoFetchProofAndCreatePermissionedEscrowWithMerkleProofIx({
      presaleAddress: this.presaleAddress,
      presaleProgram: this.program,
      ...params,
    });
  }

  /**
   * Creates a permissioned escrow transaction with a Merkle proof.
   *
   * This method constructs and returns a `Transaction` object that initializes a permissioned escrow
   * using the provided parameters and a Merkle proof. The transaction includes the latest blockhash
   * and sets the fee payer as specified in the parameters.
   *
   * @param params - The parameters required to create the permissioned escrow, excluding `presaleProgram` and `presaleAddress`.
   * @returns A `Transaction` object containing the instruction to initialize the permissioned escrow.
   */
  async createPermissionedEscrowWithMerkleProof(
    params: Omit<
      ICreatePermissionedEscrowWithMerkleProofParams,
      "presaleProgram" | "presaleAddress"
    >
  ) {
    const initPermissionedEscrowIx =
      await createPermissionedEscrowWithMerkleProofIx({
        presaleProgram: this.program,
        presaleAddress: this.presaleAddress,
        ...params,
      });

    return buildTransactionWithOptimizedComputeUnit(
      this.program.provider.connection,
      [initPermissionedEscrowIx],
      params.payer
    );
  }

  /**
   * Creates a permissioned escrow transaction with a specified creator.
   *
   * This method constructs and returns a Solana `Transaction` that initializes a permissioned escrow
   * using the provided parameters. It internally calls `createPermissionedEscrowWithCreatorIx` to
   * generate the required instruction, fetches the latest blockhash, and sets the fee payer.
   *
   * @param params - The parameters required to create the permissioned escrow, excluding
   *                 `presaleProgram` and `presaleAddress` which are provided by the class instance.
   * @returns A `Transaction` object containing the initialization instruction for the permissioned escrow.
   */
  async createPermissionedEscrowWithCreator(
    params: Omit<
      ICreatePermissionedEscrowWithCreatorParams,
      "presaleProgram" | "presaleAddress"
    >
  ) {
    const initPermissionedEscrowWithCreatorIx =
      await createPermissionedEscrowWithCreatorIx({
        presaleProgram: this.program,
        presaleAddress: this.presaleAddress,
        ...params,
      });

    return buildTransactionWithOptimizedComputeUnit(
      this.program.provider.connection,
      [initPermissionedEscrowWithCreatorIx],
      params.payer
    );
  }

  /**
   * Creates a transaction to initialize an operator for the presale program.
   *
   * @param operator - The public key of the operator to be created.
   * @param creator - The public key of the creator who will pay the transaction fee.
   * @returns A `Transaction` object containing the instruction to initialize the operator.
   */
  async createOperator(params: Omit<ICreateOperatorParams, "presaleProgram">) {
    const { operator, creator } = params;

    const initOperatorIx = await createOperatorIx({
      presaleProgram: this.program,
      operator,
      creator,
    });

    const latestBlockhashInfo =
      await this.program.provider.connection.getLatestBlockhash();

    return new Transaction({
      ...latestBlockhashInfo,
      feePayer: creator,
    }).add(initOperatorIx);
  }

  /**
   * Creates a transaction to revoke an operator from the presale program.
   *
   * This method constructs a transaction that removes the specified operator's permissions,
   * using the provided creator's public key as the fee payer. The transaction includes
   * the latest blockhash for network validity.
   *
   * @param operator - The public key of the operator to be revoked.
   * @param creator - The public key of the creator initiating the revocation and paying the transaction fee.
   * @returns A `Transaction` object containing the revoke operator instruction.
   */
  static async revokeOperator(
    params: Omit<IRevokeOperatorParams, "presaleProgram"> & {
      connection: Connection;
      programId?: PublicKey;
    }
  ) {
    const { operator, creator, connection, programId } = params;
    const program = createPresaleProgram(
      connection,
      programId ?? PRESALE_PROGRAM_ID
    );

    const revokeOperatorIx = await createRevokeOperatorIx({
      presaleProgram: program,
      operator,
      creator,
    });

    return buildTransactionWithOptimizedComputeUnit(
      program.provider.connection,
      [revokeOperatorIx],
      creator
    );
  }

  /**
   * Asynchronously refetches the current state of the presale and updates the instance properties.
   *
   * This method calls a private helper to retrieve the latest `presaleAccount` and
   * `transferHookAccountInfo` from the blockchain, then updates the corresponding
   * properties on the class instance.
   *
   * @returns {Promise<void>} Resolves when the state has been successfully refetched and updated.
   */
  async refetchState() {
    const {
      presaleAccount,
      baseMintSliceAndTransferHookAccounts,
      quoteMintSliceAndTransferHookAccounts,
    } = await fetchAccountsForCache(this.program, this.presaleAddress);

    this.presaleAccount = presaleAccount;
    this.baseTransferHookAccountInfo = baseMintSliceAndTransferHookAccounts;
    this.quoteTransferHookAccountInfo = quoteMintSliceAndTransferHookAccounts;
  }

  /**
   * Deposits funds into the presale, handling different whitelist modes.
   *
   * Depending on the whitelist mode of the presale, this method may initialize an escrow account
   * before performing the deposit. For permissionless mode, it creates a permissionless escrow.
   * For permissioned mode with Merkle proof, it creates a permissioned escrow with Merkle proof.
   * Then, it creates and returns a transaction containing all necessary instructions.
   *
   * @param params - The parameters required for the deposit, excluding internal presale-related fields.
   * @returns A promise that resolves to a transaction ready to be sent.
   */
  async deposit(
    params: Omit<
      IDepositParams,
      | "presaleProgram"
      | "presaleAddress"
      | "presaleAccount"
      | "transferHookAccountInfo"
      | "transferHookRemainingAccounts"
    >
  ) {
    const whitelistMode = this.presaleAccount.whitelistMode;

    const preInstructions: TransactionInstruction[] = [];
    const registryIndex =
      params.registryIndex || DEFAULT_PERMISSIONLESS_REGISTRY_INDEX;

    switch (whitelistMode) {
      case WhitelistMode.Permissionless: {
        const initEscrowIx = await getOrCreatePermissionlessEscrowIx({
          presaleAddress: this.presaleAddress,
          presaleProgram: this.program,
          owner: params.owner,
          payer: params.owner,
        });

        if (initEscrowIx) {
          preInstructions.push(initEscrowIx);
        }
        break;
      }
      case WhitelistMode.PermissionWithMerkleProof: {
        const initEscrowIx =
          await getOrCreatePermissionedEscrowWithMerkleProofIx({
            presaleAddress: this.presaleAddress,
            presaleProgram: this.program,
            owner: params.owner,
            payer: params.owner,
            registryIndex,
          });

        if (initEscrowIx) {
          preInstructions.push(initEscrowIx);
        }
        break;
      }
      case WhitelistMode.PermissionWithAuthority: {
        const escrow = deriveEscrow(
          this.presaleAddress,
          params.owner,
          registryIndex,
          this.program.programId
        );
        const escrowState = await this.program.account.escrow.fetchNullable(
          escrow
        );

        if (!escrowState) {
          // Request partial signed transaction from server
          return fetchPartialSignedInitEscrowAndDepositTransactionFromOperator({
            presaleAddress: this.presaleAddress,
            presaleProgram: this.program,
            presaleAccount: this.presaleAccount,
            amount: params.amount,
            owner: params.owner,
            registryIndex,
          });
        }
      }
    }

    const depositIx = await createDepositIx({
      presaleAccount: this.presaleAccount,
      presaleProgram: this.program,
      presaleAddress: this.presaleAddress,
      transferHookAccountInfo: this.quoteTransferHookAccountInfo,
      registryIndex,
      ...params,
    });

    return buildTransactionWithOptimizedComputeUnit(
      this.program.provider.connection,
      [...preInstructions, ...depositIx],
      params.owner
    );
  }

  /**
   * Withdraws funds from the presale contract.
   *
   * This method constructs and returns a transaction for withdrawing funds,
   * using the provided parameters and internal presale state. It omits several
   * internal fields from the input parameters, which are automatically supplied
   * from the instance.
   *
   * @param params - The withdrawal parameters, excluding internal presale and transfer hook fields.
   * @returns A transaction object ready to be signed and sent.
   */
  async withdraw(
    params: Omit<
      IWithdrawParams,
      | "presaleProgram"
      | "presaleAddress"
      | "presaleAccount"
      | "transferHookAccountInfo"
      | "transferHookRemainingAccounts"
    >
  ) {
    const withdrawIxs = await createWithdrawIx({
      presaleAccount: this.presaleAccount,
      presaleProgram: this.program,
      presaleAddress: this.presaleAddress,
      transferHookAccountInfo: this.quoteTransferHookAccountInfo,
      ...params,
    });

    return buildTransactionWithOptimizedComputeUnit(
      this.program.provider.connection,
      withdrawIxs,
      params.owner
    );
  }

  /**
   * Claims tokens from the presale contract for the specified owner.
   *
   * This method constructs the necessary instructions to claim tokens,
   * using the provided parameters and internal presale state, and builds
   * a transaction ready for submission.
   *
   * @param params - The parameters required to claim tokens, excluding internal presale fields.
   * @returns A transaction object containing the claim instructions.
   */
  async claim(
    params: Omit<
      IClaimParams,
      | "presaleProgram"
      | "presaleAddress"
      | "presaleAccount"
      | "transferHookAccountInfo"
      | "transferHookRemainingAccounts"
    >
  ) {
    const claimIxs = await createClaimIx({
      presaleProgram: this.program,
      presaleAddress: this.presaleAddress,
      presaleAccount: this.presaleAccount,
      transferHookAccountInfo: this.baseTransferHookAccountInfo,
      ...params,
    });

    return buildTransactionWithOptimizedComputeUnit(
      this.program.provider.connection,
      claimIxs,
      params.owner
    );
  }

  /**
   * Withdraws the remaining quote tokens from the presale contract.
   *
   * This method constructs and sends a transaction to withdraw any remaining quote tokens
   * associated with the presale. It uses the provided parameters along with internal state
   * such as the presale program, address, account, and transfer hook information.
   *
   * @param params - The parameters required to withdraw the remaining quote tokens, excluding
   *                 presale program, presale address, presale account, transfer hook account info,
   *                 and transfer hook remaining accounts, which are provided internally.
   * @returns A promise that resolves to the built transaction for withdrawing the remaining quote tokens.
   */
  async withdrawRemainingQuote(
    params: Omit<
      IWithdrawRemainingQuoteParams,
      | "presaleProgram"
      | "presaleAddress"
      | "presaleAccount"
      | "transferHookAccountInfo"
      | "transferHookRemainingAccounts"
    >
  ) {
    const withdrawRemainingQuoteIxs = await createWithdrawRemainingQuoteIx({
      presaleProgram: this.program,
      presaleAddress: this.presaleAddress,
      presaleAccount: this.presaleAccount,
      transferHookAccountInfo: this.quoteTransferHookAccountInfo,
      ...params,
    });

    return buildTransactionWithOptimizedComputeUnit(
      this.program.provider.connection,
      withdrawRemainingQuoteIxs,
      params.owner
    );
  }

  /**
   * Performs an action on unsold base tokens in a presale context.
   *
   * This method constructs and executes the necessary instructions to handle unsold base tokens,
   * using the provided parameters and internal presale state. It omits several internal fields
   * from the input parameters, which are supplied automatically from the instance.
   *
   * @returns A transaction object representing the performed action.
   */
  async performUnsoldBaseTokenAction(payer: PublicKey) {
    const performUnsoldBaseTokenActionIxs =
      await createPerformUnsoldBaseTokenActionIx({
        presaleProgram: this.program,
        presaleAddress: this.presaleAddress,
        presaleAccount: this.presaleAccount,
        transferHookAccountInfo: this.baseTransferHookAccountInfo,
        creator: this.presaleAccount.owner,
      });

    return buildTransactionWithOptimizedComputeUnit(
      this.program.provider.connection,
      performUnsoldBaseTokenActionIxs,
      payer
    );
  }

  /**
   * Initiates a withdrawal transaction for the creator from the presale contract.
   *
   * This method constructs the necessary instructions for the creator to withdraw funds,
   * using the provided parameters and internal presale state. It omits the presale-specific
   * fields from the input parameters, as these are managed internally.
   *
   * @param params - The parameters required for the creator withdrawal, excluding
   *                 `presaleProgram`, `presaleAddress`, and `presaleAccount`.
   * @returns A transaction object ready to be signed and sent by the creator.
   */
  async creatorWithdraw(
    params: Omit<
      ICreatorWithdrawParams,
      | "presaleProgram"
      | "presaleAddress"
      | "presaleAccount"
      | "baseTransferHookAccountInfo"
      | "quoteTransferHookAccountInfo"
    >
  ) {
    const withdrawIxs = await createCreatorWithdrawIx({
      presaleAccount: this.presaleAccount,
      presaleProgram: this.program,
      presaleAddress: this.presaleAddress,
      baseTransferHookAccountInfo: this.baseTransferHookAccountInfo,
      quoteTransferHookAccountInfo: this.quoteTransferHookAccountInfo,
      ...params,
    });

    return buildTransactionWithOptimizedComputeUnit(
      this.program.provider.connection,
      withdrawIxs,
      params.creator
    );
  }

  /**
   * Closes the escrow account for the presale.
   *
   * This method creates and returns a transaction to close the escrow,
   * using the provided parameters. The transaction is built with the
   * necessary instructions and signed by the owner.
   *
   * @param params - Parameters required to close the escrow, excluding `presaleProgram` and `presaleAddress`.
   * @returns A promise that resolves to the transaction for closing the escrow.
   */
  async closeEscrow(
    params: Omit<ICloseEscrowParams, "presaleProgram" | "presaleAddress">
  ) {
    const closeEscrowIx = await createCloseEscrowIx({
      presaleProgram: this.program,
      presaleAddress: this.presaleAddress,
      ...params,
    });

    return buildTransactionWithOptimizedComputeUnit(
      this.program.provider.connection,
      [closeEscrowIx],
      params.owner
    );
  }

  /**
   * Creates and initializes permissioned server metadata for a presale.
   *
   * This method constructs an instruction to initialize permissioned server metadata
   * using the provided parameters, and builds a transaction for submission.
   *
   * @param params - The parameters required to create permissioned server metadata,
   *   excluding `presaleProgram` and `presaleAddress` which are provided by the instance.
   * @returns A transaction object containing the instruction to initialize permissioned server metadata.
   */
  async createPermissionedServerMetadata(
    params: Omit<
      ICreatePermissionedServerMetadataParams,
      "presaleProgram" | "presaleAddress"
    >
  ) {
    const createPermissionedServerMetadataIx =
      await createInitializePermissionedServerMetadataIx({
        presaleAddress: this.presaleAddress,
        presaleProgram: this.program,
        ...params,
      });

    return buildTransactionWithOptimizedComputeUnit(
      this.program.provider.connection,
      [createPermissionedServerMetadataIx],
      params.owner
    );
  }

  /**
   * Closes the permissioned server metadata for a presale.
   *
   * This method creates and returns a transaction to close the permissioned server metadata
   * associated with the current presale instance. It omits the `presaleProgram` and `presaleAddress`
   * fields from the input parameters, as these are provided by the instance itself.
   *
   * @param params - The parameters required to close the permissioned server metadata, excluding
   *                 `presaleProgram` and `presaleAddress`. Must include the owner.
   * @returns A promise that resolves to a transaction for closing the permissioned server metadata.
   */
  async closePermissionedServerMetadata(
    params: Omit<
      IClosePermissionedServerMetadataParams,
      "presaleProgram" | "presaleAddress"
    >
  ) {
    const closePermissionedServerMetadataIx =
      await createClosePermissionedServerMetadataIx({
        presaleAddress: this.presaleAddress,
        presaleProgram: this.program,
        ...params,
      });

    return buildTransactionWithOptimizedComputeUnit(
      this.program.provider.connection,
      [closePermissionedServerMetadataIx],
      params.owner
    );
  }

  /**
   * Refreshes the escrow state for the current presale instance.
   *
   * This method creates and returns a transaction to refresh the escrow,
   * using the provided parameters and the current presale program and address.
   *
   * @param params - The parameters required to refresh the escrow, excluding `presaleProgram` and `presaleAddress`.
   * @returns A promise that resolves to a transaction object for refreshing the escrow.
   */
  async refreshEscrow(
    params: Omit<IRefreshEscrowParams, "presaleProgram" | "presaleAddress">
  ) {
    const refreshEscrowIx = await createRefreshEscrowIx({
      presaleProgram: this.program,
      presaleAddress: this.presaleAddress,
      ...params,
    });

    return buildTransactionWithOptimizedComputeUnit(
      this.program.provider.connection,
      [refreshEscrowIx],
      params.owner
    );
  }

  /**
   * Collects the creator fee from the presale contract.
   *
   * This method generates the necessary instructions to collect the creator's fee
   * by invoking `createCreatorCollectFeeIx` with the current presale context.
   * It then builds and returns a transaction for the fee collection, signed by the
   * presale account owner.
   *
   * @returns {Promise<Transaction>} A promise that resolves to the constructed transaction for collecting the creator fee.
   *
   * @throws {Error} If instruction creation or transaction building fails.
   */
  async creatorCollectFee() {
    const creatorCollectFeeIxs = await createCreatorCollectFeeIx({
      presaleProgram: this.program,
      presaleAddress: this.presaleAddress,
      presaleAccount: this.presaleAccount,
      quoteTransferHookAccountInfo: this.quoteTransferHookAccountInfo,
    });

    return buildTransactionWithOptimizedComputeUnit(
      this.program.provider.connection,
      creatorCollectFeeIxs,
      this.presaleAccount.owner
    );
  }

  /**
   * Retrieves the presale escrow account associated with a specific owner.
   *
   * @param owner - The public key of the escrow owner.
   * @returns A promise that resolves to the escrow account data if it exists, or `null` if not found.
   */
  async getPresaleEscrowByOwner(owner: PublicKey): Promise<IEscrowWrapper[]> {
    const presaleWrapper = new PresaleWrapper(
      this.presaleAccount,
      this.baseMint.decimals,
      this.quoteMint.decimals
    );

    const initializedPresaleRegistries =
      presaleWrapper.getAllPresaleRegistries();

    const escrowAddresses = initializedPresaleRegistries.map((registry) => {
      return deriveEscrow(
        this.presaleAddress,
        owner,
        new BN(registry.getRegistryIndex()),
        this.program.programId
      );
    });

    const accounts =
      await this.program.provider.connection.getMultipleAccountsInfo([
        this.presaleAddress,
        ...escrowAddresses,
      ]);

    const [presaleAccount, ...escrowAccounts] = accounts;

    this.updatePresaleCache(presaleAccount);

    const validEscrowAccounts = escrowAccounts.filter(Boolean);

    return validEscrowAccounts.map((account) => {
      const decodedEscrow: EscrowAccount = this.program.coder.accounts.decode(
        "escrow",
        account.data
      );

      return new EscrowWrapper(
        decodedEscrow,
        this.presaleAccount,
        this.baseMint.decimals,
        this.quoteMint.decimals
      );
    });
  }

  /**
   * Retrieves all escrow accounts associated with the current presale.
   *
   * This method queries the blockchain for all accounts matching the escrow filters,
   * specifically filtering by the presale address. It fetches the public keys of the
   * matching escrow accounts, retrieves their full account data in batches, and decodes
   * each account into an `EscrowAccount` object.
   *
   * @returns A promise that resolves to an array of objects, each containing the public key
   *          and the decoded escrow account data.
   */
  async getEscrowsByPresale(): Promise<
    { pubkey: PublicKey; account: EscrowAccount }[]
  > {
    const escrowAddresses = await this.program.provider.connection
      .getProgramAccounts(this.program.programId, {
        filters: [
          getEscrowFilter(),
          getEscrowPresaleFilter(this.presaleAddress),
        ],
        encoding: "base64",
        dataSlice: {
          offset: 0,
          length: 0,
        },
      })
      .then((response) => {
        return response.map(({ pubkey }) => pubkey);
      });

    const accounts = await fetchMultipleAccountsAutoChunk(
      this.program.provider.connection,
      escrowAddresses
    );

    return accounts.map(({ pubkey, account }) => {
      return {
        pubkey,
        account: this.program.coder.accounts.decode("escrow", account.data),
      };
    });
  }

  async getEscrowsByPresaleRegistry(
    registryIndex: BN
  ): Promise<{ pubkey: PublicKey; account: EscrowAccount }[]> {
    const escrowAddresses = await this.program.provider.connection
      .getProgramAccounts(this.program.programId, {
        filters: [
          getEscrowFilter(),
          getEscrowPresaleFilter(this.presaleAddress),
          getEscrowRegistryIndexFilter(registryIndex),
        ],
        encoding: "base64",
        dataSlice: {
          offset: 0,
          length: 0,
        },
      })
      .then((response) => {
        return response.map(({ pubkey }) => pubkey);
      });

    const accounts = await fetchMultipleAccountsAutoChunk(
      this.program.provider.connection,
      escrowAddresses
    );

    return accounts.map(({ pubkey, account }) => {
      return {
        pubkey,
        account: this.program.coder.accounts.decode("escrow", account.data),
      };
    });
  }

  /**
   * Retrieves all presale accounts from the blockchain using the provided connection and optional program ID.
   *
   * This method fetches all accounts matching the presale filter, decodes their data using the presale program's coder,
   * and returns an array of objects containing the public key and decoded account data for each presale.
   *
   * @param connection - The Solana connection object to interact with the blockchain.
   * @param programId - (Optional) The public key of the presale program. Defaults to `PRESALE_PROGRAM_ID` if not provided.
   * @returns A promise that resolves to an array of objects, each containing:
   *   - `pubkey`: The public key of the presale account.
   *   - `account`: The decoded presale account data.
   */
  static async getPresales(
    connection: Connection,
    programId?: PublicKey
  ): Promise<{ pubkey: PublicKey; account: PresaleAccount }[]> {
    const presaleProgram = createPresaleProgram(
      connection,
      programId ?? PRESALE_PROGRAM_ID
    );

    const presaleAddresses = await connection
      .getProgramAccounts(programId ?? PRESALE_PROGRAM_ID, {
        filters: [getPresaleFilter()],
        encoding: "base64",
        dataSlice: {
          offset: 0,
          length: 0,
        },
      })
      .then((response) => {
        return response.map(({ pubkey }) => pubkey);
      });

    const accounts = await fetchMultipleAccountsAutoChunk(
      connection,
      presaleAddresses
    );

    return accounts.map(({ pubkey, account }) => {
      return {
        pubkey,
        account: presaleProgram.coder.accounts.decode("presale", account.data),
      };
    });
  }

  /**
   * Returns a parsed representation of the presale by creating a new `PresaleWrapper` instance.
   *
   * @returns {PresaleWrapper} An instance of `PresaleWrapper` initialized with the current presale account and mint decimals.
   */
  getParsedPresale() {
    return new PresaleWrapper(
      this.presaleAccount,
      this.baseMint.decimals,
      this.quoteMint.decimals
    );
  }

  private updatePresaleCache(account: AccountInfo<Buffer>) {
    const decodedPresale = this.program.coder.accounts.decode(
      "presale",
      account.data
    );

    this.presaleAccount = decodedPresale;
  }
}

export default Presale;
