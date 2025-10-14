# Meteora Presale Client SDK

## Overview

Meteora token presale enables users conduct a token presale with any tokens.

It does not manage the deployment of liquidity for the raised capital. This means the presale creator must manually withdraw the raised funds and deploy the liquidity themselves.

# Program ID

The same program ID applies to both mainnet and devnet:

```
presSVxnf9UU8jMxhgSMqaRwNiT36qeBdNeTRKjTdbj
```

## Presale Mode

### Fixed price

- The token will be sold at fixed price
- The presale will end earlier once the target cap reached
- User can withdraw at anytime

### FCFS (First come first serve)

- The token price will be dynamically priced based on supply and demand
- The presale will end earlier once the target cap reached
- User cannot withdraw once deposited

### Prorata

- The token price will be dynamically priced based on supply and demand
- The presale can be oversubscribed. The oversubscribed amount will be refunded to the user
- User can withdraw at anytime

## Whitelist Mode

### Authority

- Permissioned escrow creation using operator partial sign mechanism
- Creator need to host a server to create partial signed escrow creation transaction for any whitelisted wallets

### Merkle Tree

- Permissioned escrow creation using merkle tree mechanism
- Creator need to host merkle proof

### Permissionless

- Anyone can deposit

## Usage

| Function                                | Description                                                                                          | Example                                                                                                                                                                                                                                                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| createProrataPresale                    | Create a prorata presale                                                                             | [initialize_prorata_presale.ts](./examples/initialize_presale/initialize_prorata_presale.ts)                                                                                                                                                                                                                |
| createFcfsPresale                       | Create a FCFS presale                                                                                | [initialize_fcfs_presale.ts](./examples/initialize_presale/initialize_fixed_price_presale.ts)                                                                                                                                                                                                               |
| createFixedPricePresale                 | Create a fixed price presale                                                                         | [initialize_fixed_price_presale.ts](./examples/initialize_presale/initialize_fixed_price_presale.ts)                                                                                                                                                                                                        |
| createMerkleRootConfig                  | Create merkle roof config to sure merkle proof                                                       | [initialize_merkle_tree_permissioned_fixed_price_presale.ts](./examples/initialize_presale/initialize_merkle_tree_permissioned_fixed_price_presale.ts)                                                                                                                                                      |
| createPermissionlessEscrow              | Create an escrow account permissionlessly                                                            | [permissionless_deposit.ts](./examples/deposit/permissionless_deposit.ts)                                                                                                                                                                                                                                   |
| createPermissionedEscrowWithMerkleProof | Create an escrow account permissioned with merkle proof                                              | [permissioned_with_merkle_proof_deposit.ts](./examples/deposit/permissioned_with_merkle_proof_deposit.ts)                                                                                                                                                                                                   |
| createPermissionedEscrowWithCreator     | Create an escrow account permissioned with authority / creator                                       | [permissioned_with_authority_deposit.ts](./examples/deposit/permissioned_with_authority_deposit.ts)                                                                                                                                                                                                         |
| createOperator                          | Whitelist an address as an operator to sign for permissioned escrow creation transaction             | [permissioned_with_authority_deposit.ts](./examples/deposit/permissioned_with_authority_deposit.ts)                                                                                                                                                                                                         |
| revokeOperator                          | Revoke a whitelisted operator                                                                        | [revoke_operator.ts](./examples/revoke_operator.ts)                                                                                                                                                                                                                                                         |
| deposit                                 | User deposit                                                                                         | [permissionless_deposit.ts](./examples/deposit/permissionless_deposit.ts) & [permissioned_with_merkle_proof_deposit.ts](./examples/deposit/permissioned_with_merkle_proof_deposit.ts) & [permissioned_with_authority_deposit.ts](./examples/deposit/permissioned_with_authority_deposit.ts)                 |
| withdraw                                | User withdraw                                                                                        | [withdraw.ts](./examples/withdraw.ts)                                                                                                                                                                                                                                                                       |
| claim                                   | Claim bought token                                                                                   | [claim.ts](./examples/claim.ts)                                                                                                                                                                                                                                                                             |
| withdrawRemainingQuote                  | Withdraw remaining oversubscribed quote token. Only applicable to prorata                            | [withdraw_remaining_quote.ts](./examples/withdraw_remaining_quote.ts)                                                                                                                                                                                                                                       |
| performUnsoldBaseTokenAction            | Burn/refund unsold tokens                                                                            | [perform_unsold_base_token_action.ts](./examples/perform_unsold_base_token_action.ts)                                                                                                                                                                                                                       |
| creatorWithdraw                         | Creator withdraw raised capital                                                                      | [creator_withdraw.ts](./examples/creator_withdraw.ts)                                                                                                                                                                                                                                                       |
| closeEscrow                             | Close user escrow                                                                                    | [close_escrow.ts](./examples/close_escrow.ts)                                                                                                                                                                                                                                                               |
| createPermissionedServerMetadata        | Create server metadata (URL) which used to retrieve merkle proof / partial signed escrow transaction | [initialize_authority_permissioned_fixed_price_presale.ts](./examples/initialize_presale/initialize_authority_permissioned_fixed_price_presale.ts) & [initialize_merkle_tree_permissioned_fixed_price_presale.ts](./examples/initialize_presale/initialize_merkle_tree_permissioned_fixed_price_presale.ts) |
| refreshEscrow                           | Refresh escrow to accumulate pending claimable bought token                                          | [claim.ts](./examples/claim.ts)                                                                                                                                                                                                                                                                             |
| creatorCollectFee                       | Creator collect deposit fee                                                                          | [creator_collect_fee.ts](./examples/creator_collect_fee.ts)                                                                                                                                                                                                                                                 |

## Useful helpers

| Class                  | Description                                                                                                                                                                                                                                                       | Example                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| PresaleWrapper         | Wrap around presale account and provide more detailed information. For example: total base token sold, presale progress percentage, status on whether user can deposit / withdraw / claim / withdraw remaining quote and creator can withdraw / collect fee, etc. | [show_presale_details.ts](./examples/show_presale_details.ts) |
| PresaleRegistryWrapper | Wrap around presale account's registry (bucket) and provide more detailed information. For example: total base token sold, token price, collected deposit fee and etc.                                                                                            | [show_presale_details.ts](./examples/show_presale_details.ts) |
| EscrowWrapper          | Wrap around escrow account and provide more detailed information. For example: remaining deposit-able amount, claimable amount, status on whether user can withdraw oversubscribed amount and etc.                                                                | [show_escrow_details.ts](./examples/show_escrow_details.ts)   |

## API specification

API specification for permissioned escrow creation

### Authority (Creator)

| Request                                                | Description                                                                                                                                                                                             | Type | Response                                                           | Example                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| /auth-sign/:presaleAddress/:registryIndex/:userAddress | presaleAddress is a string represent the presale account address. registryIndex is an integer which presale registry user is depositing to. userAddress is a string represent the user who's depositing | GET  | A base64 encoded transaction that partially signed by the operator | [permissioned_with_authority_deposit.ts](./examples/deposit/permissioned_with_authority_deposit.ts) |

### Merkle Tree

| Request                                                   | Description                                                                                                                                                                                             | Type | Response                                                                                    | Example                                                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| /merkle-proof/:presaleAddress/:registryIndex/:userAddress | presaleAddress is a string represent the presale account address. registryIndex is an integer which presale registry user is depositing to. userAddress is a string represent the user who's depositing | GET  | MerkleProofResponse { merkle_root_config: string; deposit_cap: number; proof: number[][]; } | [permissioned_with_merkle_proof_deposit.ts](./examples/deposit/permissioned_with_merkle_proof_deposit.ts) |
