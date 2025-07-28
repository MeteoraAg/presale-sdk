/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/presale.json`.
 */
export type Presale = {
  "address": "2TEbURHCQNsVyGFUm2appkEsuSShKkUUdVqtC5Xn7zw9",
  "metadata": {
    "name": "presale",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "claim",
      "discriminator": [
        62,
        198,
        214,
        193,
        213,
        159,
        108,
        210
      ],
      "accounts": [
        {
          "name": "presale",
          "writable": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "baseTokenVault",
          "writable": true,
          "relations": [
            "presale"
          ]
        },
        {
          "name": "baseMint",
          "relations": [
            "presale"
          ]
        },
        {
          "name": "presaleAuthority",
          "address": "GwyAYgXqXaMAC5cHmwecU7uuu2bGiPHiP8eQY2kSNnkc"
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "ownerBaseToken"
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "memoProgram",
          "address": "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "remainingAccountsInfo",
          "type": {
            "defined": {
              "name": "remainingAccountsInfo"
            }
          }
        }
      ]
    },
    {
      "name": "closeEscrow",
      "discriminator": [
        139,
        171,
        94,
        146,
        191,
        91,
        144,
        50
      ],
      "accounts": [
        {
          "name": "presale",
          "writable": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "rentReceiver",
          "writable": true
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "closeFixedPricePresaleArgs",
      "discriminator": [
        125,
        65,
        70,
        247,
        99,
        200,
        42,
        225
      ],
      "accounts": [
        {
          "name": "fixedPricePresaleArgs",
          "writable": true
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "fixedPricePresaleArgs"
          ]
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "closeMerkleProofMetadata",
      "discriminator": [
        23,
        52,
        170,
        30,
        252,
        47,
        100,
        129
      ],
      "accounts": [
        {
          "name": "presale",
          "relations": [
            "merkleProofMetadata"
          ]
        },
        {
          "name": "merkleProofMetadata",
          "writable": true
        },
        {
          "name": "rentReceiver",
          "writable": true
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "presale"
          ]
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "createMerkleProofMetadata",
      "discriminator": [
        151,
        46,
        163,
        52,
        181,
        178,
        47,
        227
      ],
      "accounts": [
        {
          "name": "presale"
        },
        {
          "name": "merkleProofMetadata",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  114,
                  107,
                  108,
                  101,
                  95,
                  112,
                  114,
                  111,
                  111,
                  102
                ]
              },
              {
                "kind": "account",
                "path": "presale"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "presale"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "proofUrl",
          "type": "string"
        }
      ]
    },
    {
      "name": "createMerkleRootConfig",
      "discriminator": [
        55,
        243,
        253,
        240,
        78,
        186,
        232,
        166
      ],
      "accounts": [
        {
          "name": "presale"
        },
        {
          "name": "merkleRootConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  114,
                  107,
                  108,
                  101,
                  95,
                  114,
                  111,
                  111,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "presale"
              },
              {
                "kind": "arg",
                "path": "params.version"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createMerkleRootConfigParams"
            }
          }
        }
      ]
    },
    {
      "name": "createOperator",
      "discriminator": [
        145,
        40,
        238,
        75,
        181,
        252,
        59,
        11
      ],
      "accounts": [
        {
          "name": "operator",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  101,
                  114,
                  97,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "account",
                "path": "operatorOwner"
              }
            ]
          }
        },
        {
          "name": "operatorOwner"
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "createPermissionedEscrowWithCreator",
      "discriminator": [
        131,
        130,
        26,
        39,
        200,
        38,
        18,
        173
      ],
      "accounts": [
        {
          "name": "presale",
          "writable": true
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "presale"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner"
        },
        {
          "name": "operator"
        },
        {
          "name": "operatorOwner",
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "createPermissionedEscrowWithMerkleProof",
      "discriminator": [
        62,
        200,
        54,
        145,
        59,
        239,
        91,
        5
      ],
      "accounts": [
        {
          "name": "presale",
          "writable": true,
          "relations": [
            "merkleRootConfig"
          ]
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "presale"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner"
        },
        {
          "name": "merkleRootConfig"
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "vec": {
              "array": [
                "u8",
                32
              ]
            }
          }
        }
      ]
    },
    {
      "name": "createPermissionlessEscrow",
      "discriminator": [
        241,
        26,
        9,
        26,
        248,
        201,
        151,
        0
      ],
      "accounts": [
        {
          "name": "presale",
          "writable": true
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "presale"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner"
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "creatorWithdraw",
      "discriminator": [
        92,
        117,
        206,
        254,
        174,
        108,
        37,
        106
      ],
      "accounts": [
        {
          "name": "presale",
          "writable": true
        },
        {
          "name": "presaleAuthority",
          "address": "GwyAYgXqXaMAC5cHmwecU7uuu2bGiPHiP8eQY2kSNnkc"
        },
        {
          "name": "ownerToken",
          "writable": true
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "presale"
          ]
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "memoProgram",
          "address": "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "remainingAccountsInfo",
          "type": {
            "defined": {
              "name": "remainingAccountsInfo"
            }
          }
        }
      ]
    },
    {
      "name": "deposit",
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "presale",
          "writable": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "quoteTokenVault",
          "writable": true,
          "relations": [
            "presale"
          ]
        },
        {
          "name": "quoteMint",
          "relations": [
            "presale"
          ]
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "payerQuoteToken",
          "writable": true
        },
        {
          "name": "payer",
          "signer": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "maxAmount",
          "type": "u64"
        },
        {
          "name": "remainingAccountInfo",
          "type": {
            "defined": {
              "name": "remainingAccountsInfo"
            }
          }
        }
      ]
    },
    {
      "name": "initializeFixedPricePresaleArgs",
      "docs": [
        "Create presale vault related functions"
      ],
      "discriminator": [
        224,
        80,
        127,
        193,
        204,
        143,
        243,
        194
      ],
      "accounts": [
        {
          "name": "fixedPricePresaleParams",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  105,
                  120,
                  101,
                  100,
                  95,
                  112,
                  114,
                  105,
                  99,
                  101,
                  95,
                  112,
                  97,
                  114,
                  97,
                  109
                ]
              },
              {
                "kind": "arg",
                "path": "params.presale"
              }
            ]
          }
        },
        {
          "name": "owner"
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "initializeFixedPricePresaleExtraArgs"
            }
          }
        }
      ]
    },
    {
      "name": "initializePresale",
      "discriminator": [
        9,
        174,
        12,
        126,
        150,
        119,
        68,
        100
      ],
      "accounts": [
        {
          "name": "presaleMint"
        },
        {
          "name": "presale",
          "docs": [
            "presale address"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  101,
                  115,
                  97,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "base"
              },
              {
                "kind": "account",
                "path": "presaleMint"
              },
              {
                "kind": "account",
                "path": "quoteTokenMint"
              }
            ]
          }
        },
        {
          "name": "presaleAuthority",
          "address": "GwyAYgXqXaMAC5cHmwecU7uuu2bGiPHiP8eQY2kSNnkc"
        },
        {
          "name": "quoteTokenMint"
        },
        {
          "name": "presaleVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  115,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "presale"
              }
            ]
          }
        },
        {
          "name": "quoteTokenVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  111,
                  116,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "presale"
              }
            ]
          }
        },
        {
          "name": "payerPresaleToken",
          "writable": true
        },
        {
          "name": "creator"
        },
        {
          "name": "base",
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "baseTokenProgram"
        },
        {
          "name": "quoteTokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "initializePresaleArgs"
            }
          }
        },
        {
          "name": "remainingAccountInfo",
          "type": {
            "defined": {
              "name": "remainingAccountsInfo"
            }
          }
        }
      ]
    },
    {
      "name": "performUnsoldBaseTokenAction",
      "discriminator": [
        101,
        141,
        8,
        65,
        176,
        225,
        47,
        110
      ],
      "accounts": [
        {
          "name": "presale",
          "writable": true
        },
        {
          "name": "baseTokenVault",
          "writable": true,
          "relations": [
            "presale"
          ]
        },
        {
          "name": "baseMint",
          "writable": true,
          "relations": [
            "presale"
          ]
        },
        {
          "name": "presaleAuthority",
          "address": "GwyAYgXqXaMAC5cHmwecU7uuu2bGiPHiP8eQY2kSNnkc"
        },
        {
          "name": "creatorBaseToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "presale"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "baseMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "memoProgram",
          "address": "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "remainingAccountsInfo",
          "type": {
            "defined": {
              "name": "remainingAccountsInfo"
            }
          }
        }
      ]
    },
    {
      "name": "refreshEscrow",
      "discriminator": [
        68,
        237,
        17,
        237,
        147,
        201,
        27,
        169
      ],
      "accounts": [
        {
          "name": "presale",
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "revokeOperator",
      "discriminator": [
        185,
        25,
        87,
        77,
        88,
        8,
        30,
        175
      ],
      "accounts": [
        {
          "name": "operator",
          "writable": true
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true,
          "relations": [
            "operator"
          ]
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "withdraw",
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "presale",
          "writable": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "quoteTokenVault",
          "writable": true,
          "relations": [
            "presale"
          ]
        },
        {
          "name": "quoteMint",
          "relations": [
            "presale"
          ]
        },
        {
          "name": "presaleAuthority",
          "address": "GwyAYgXqXaMAC5cHmwecU7uuu2bGiPHiP8eQY2kSNnkc"
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "ownerQuoteToken",
          "writable": true
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "memoProgram",
          "address": "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "remainingAccountInfo",
          "type": {
            "defined": {
              "name": "remainingAccountsInfo"
            }
          }
        }
      ]
    },
    {
      "name": "withdrawRemainingQuote",
      "discriminator": [
        54,
        253,
        188,
        34,
        100,
        145,
        59,
        127
      ],
      "accounts": [
        {
          "name": "presale",
          "writable": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "quoteTokenVault",
          "writable": true,
          "relations": [
            "presale"
          ]
        },
        {
          "name": "quoteMint",
          "relations": [
            "presale"
          ]
        },
        {
          "name": "presaleAuthority",
          "address": "GwyAYgXqXaMAC5cHmwecU7uuu2bGiPHiP8eQY2kSNnkc"
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "ownerQuoteToken",
          "writable": true
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "memoProgram",
          "address": "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "remainingAccountsInfo",
          "type": {
            "defined": {
              "name": "remainingAccountsInfo"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "escrow",
      "discriminator": [
        31,
        213,
        123,
        187,
        186,
        22,
        218,
        155
      ]
    },
    {
      "name": "fixedPricePresaleExtraArgs",
      "discriminator": [
        75,
        139,
        198,
        148,
        132,
        54,
        191,
        83
      ]
    },
    {
      "name": "merkleProofMetadata",
      "discriminator": [
        133,
        24,
        30,
        217,
        240,
        20,
        222,
        100
      ]
    },
    {
      "name": "merkleRootConfig",
      "discriminator": [
        103,
        2,
        222,
        217,
        73,
        50,
        187,
        39
      ]
    },
    {
      "name": "operator",
      "discriminator": [
        219,
        31,
        188,
        145,
        69,
        139,
        204,
        117
      ]
    },
    {
      "name": "presale",
      "discriminator": [
        38,
        215,
        222,
        14,
        115,
        220,
        52,
        168
      ]
    }
  ],
  "events": [
    {
      "name": "evtClaim",
      "discriminator": [
        219,
        247,
        169,
        104,
        92,
        196,
        174,
        1
      ]
    },
    {
      "name": "evtCreatorWithdraw",
      "discriminator": [
        88,
        189,
        89,
        236,
        7,
        65,
        245,
        77
      ]
    },
    {
      "name": "evtDeposit",
      "discriminator": [
        245,
        7,
        99,
        173,
        152,
        218,
        66,
        168
      ]
    },
    {
      "name": "evtEscrowClose",
      "discriminator": [
        25,
        236,
        63,
        221,
        35,
        39,
        134,
        197
      ]
    },
    {
      "name": "evtEscrowCreate",
      "discriminator": [
        206,
        39,
        252,
        12,
        21,
        45,
        79,
        56
      ]
    },
    {
      "name": "evtEscrowRefresh",
      "discriminator": [
        122,
        224,
        203,
        206,
        253,
        154,
        149,
        172
      ]
    },
    {
      "name": "evtFixedPricePresaleArgsClose",
      "discriminator": [
        232,
        209,
        108,
        196,
        129,
        150,
        155,
        161
      ]
    },
    {
      "name": "evtFixedPricePresaleArgsCreate",
      "discriminator": [
        150,
        2,
        196,
        99,
        99,
        233,
        14,
        134
      ]
    },
    {
      "name": "evtMerkleProofMetadataClose",
      "discriminator": [
        89,
        204,
        254,
        22,
        230,
        127,
        117,
        103
      ]
    },
    {
      "name": "evtMerkleProofMetadataCreate",
      "discriminator": [
        58,
        148,
        90,
        56,
        95,
        57,
        98,
        175
      ]
    },
    {
      "name": "evtMerkleRootConfigCreate",
      "discriminator": [
        124,
        71,
        226,
        147,
        30,
        112,
        202,
        20
      ]
    },
    {
      "name": "evtOperatorCreate",
      "discriminator": [
        102,
        33,
        72,
        210,
        83,
        100,
        255,
        79
      ]
    },
    {
      "name": "evtPerformUnsoldBaseTokenAction",
      "discriminator": [
        101,
        134,
        249,
        143,
        220,
        171,
        228,
        130
      ]
    },
    {
      "name": "evtPresaleVaultCreate",
      "discriminator": [
        215,
        193,
        132,
        209,
        72,
        47,
        198,
        176
      ]
    },
    {
      "name": "evtWithdraw",
      "discriminator": [
        149,
        193,
        150,
        199,
        244,
        166,
        129,
        114
      ]
    },
    {
      "name": "evtWithdrawRemainingQuote",
      "discriminator": [
        128,
        150,
        147,
        65,
        211,
        26,
        124,
        208
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidMintMetadata",
      "msg": "Invalid mint metadata"
    },
    {
      "code": 6001,
      "name": "invalidTokenInfo",
      "msg": "Invalid token info"
    },
    {
      "code": 6002,
      "name": "invalidTokenSupply",
      "msg": "Invalid token supply"
    },
    {
      "code": 6003,
      "name": "invalidPresaleInfo",
      "msg": "Invalid presale info"
    },
    {
      "code": 6004,
      "name": "invalidQuoteMint",
      "msg": "Invalid quote mint"
    },
    {
      "code": 6005,
      "name": "invalidBaseMint",
      "msg": "Invalid base mint"
    },
    {
      "code": 6006,
      "name": "invalidLockVestingInfo",
      "msg": "Invalid lock vesting info"
    },
    {
      "code": 6007,
      "name": "invalidTokenPrice",
      "msg": "Invalid token price"
    },
    {
      "code": 6008,
      "name": "missingPresaleExtraParams",
      "msg": "Missing presale extra params account"
    },
    {
      "code": 6009,
      "name": "zeroTokenAmount",
      "msg": "Zero token amount"
    },
    {
      "code": 6010,
      "name": "unsupportedToken2022MintOrExtension",
      "msg": "Token2022 extensions or native mint is not supported"
    },
    {
      "code": 6011,
      "name": "invalidCreatorAccount",
      "msg": "Invalid creator account"
    },
    {
      "code": 6012,
      "name": "presaleNotOpenForDeposit",
      "msg": "Presale is not open for deposit"
    },
    {
      "code": 6013,
      "name": "presaleNotOpenForWithdraw",
      "msg": "Presale is not open for withdraw"
    },
    {
      "code": 6014,
      "name": "presaleNotOpenForWithdrawRemainingQuote",
      "msg": "Presale is not open for withdraw remaining quote"
    },
    {
      "code": 6015,
      "name": "invalidPresaleWhitelistMode",
      "msg": "Invalid presale whitelist mode"
    },
    {
      "code": 6016,
      "name": "presaleEnded",
      "msg": "Presale is ended"
    },
    {
      "code": 6017,
      "name": "presaleNotOpenForClaim",
      "msg": "Presale is not open for claim"
    },
    {
      "code": 6018,
      "name": "invalidMerkleProof",
      "msg": "Invalid merkle proof"
    },
    {
      "code": 6019,
      "name": "depositAmountOutOfCap",
      "msg": "Deposit amount out of cap"
    },
    {
      "code": 6020,
      "name": "mathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6021,
      "name": "insufficientEscrowBalance",
      "msg": "Insufficient escrow balance"
    },
    {
      "code": 6022,
      "name": "remainingQuoteAlreadyWithdrawn",
      "msg": "Remaining quote has already been withdrawn"
    },
    {
      "code": 6023,
      "name": "presaleNotCompleted",
      "msg": "Presale not completed"
    },
    {
      "code": 6024,
      "name": "noUnsoldTokens",
      "msg": "No unsold tokens"
    },
    {
      "code": 6025,
      "name": "escrowNotEmpty",
      "msg": "Escrow is not empty"
    },
    {
      "code": 6026,
      "name": "invalidUnsoldTokenAction",
      "msg": "Invalid unsold token action"
    },
    {
      "code": 6027,
      "name": "creatorAlreadyWithdrawn",
      "msg": "Creator has already withdrawn"
    },
    {
      "code": 6028,
      "name": "escrowNotRefreshed",
      "msg": "Escrow not refreshed"
    },
    {
      "code": 6029,
      "name": "undeterminedError",
      "msg": "Undetermined error"
    },
    {
      "code": 6030,
      "name": "invalidTokenVault",
      "msg": "Invalid token vault"
    },
    {
      "code": 6031,
      "name": "invalidRemainingAccountSlice",
      "msg": "Invalid remaining account slice"
    },
    {
      "code": 6032,
      "name": "duplicatedRemainingAccountTypes",
      "msg": "Duplicated remaining account types"
    },
    {
      "code": 6033,
      "name": "missingRemainingAccountForTransferHook",
      "msg": "Missing remaining account for transfer hook"
    },
    {
      "code": 6034,
      "name": "noTransferHookProgram",
      "msg": "No transfer hook program"
    },
    {
      "code": 6035,
      "name": "invalidOperator",
      "msg": "Invalid operator"
    },
    {
      "code": 6036,
      "name": "noUnsoldBaseTokens",
      "msg": "No unsold base tokens"
    },
    {
      "code": 6037,
      "name": "unsoldBaseTokenActionAlreadyPerformed",
      "msg": "Unsold base token action already performed"
    }
  ],
  "types": [
    {
      "name": "accountsType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "transferHookBase"
          },
          {
            "name": "transferHookQuote"
          }
        ]
      }
    },
    {
      "name": "createMerkleRootConfigParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "root",
            "docs": [
              "The 256-bit merkle root."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Version"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "escrow",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "presale",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "totalDeposit",
            "type": "u64"
          },
          {
            "name": "totalClaimedToken",
            "type": "u64"
          },
          {
            "name": "isRemainingQuoteWithdrawn",
            "type": "u8"
          },
          {
            "name": "padding0",
            "type": {
              "array": [
                "u8",
                7
              ]
            }
          },
          {
            "name": "pendingClaimToken",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "u64"
          },
          {
            "name": "lastRefreshedAt",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "evtClaim",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "presale",
            "type": "pubkey"
          },
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "claimAmount",
            "type": "u64"
          },
          {
            "name": "escrowTotalClaimAmount",
            "type": "u64"
          },
          {
            "name": "presaleTotalClaimAmount",
            "type": "u64"
          },
          {
            "name": "owner",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "evtCreatorWithdraw",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "presale",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "presaleProgress",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "evtDeposit",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "presale",
            "type": "pubkey"
          },
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "depositAmount",
            "type": "u64"
          },
          {
            "name": "escrowTotalDepositAmount",
            "type": "u64"
          },
          {
            "name": "presaleTotalDepositAmount",
            "type": "u64"
          },
          {
            "name": "owner",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "evtEscrowClose",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "presale",
            "type": "pubkey"
          },
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "rentReceiver",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "evtEscrowCreate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "presale",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "whitelistMode",
            "type": "u8"
          },
          {
            "name": "totalEscrowCount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "evtEscrowRefresh",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "presale",
            "type": "pubkey"
          },
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "currentTimestamp",
            "type": "u64"
          },
          {
            "name": "pendingClaimToken",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "evtFixedPricePresaleArgsClose",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "presale",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "fixedPricePresaleArgs",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "evtFixedPricePresaleArgsCreate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "presale",
            "type": "pubkey"
          },
          {
            "name": "unsoldTokenAction",
            "type": "u8"
          },
          {
            "name": "qPrice",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "evtMerkleProofMetadataClose",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "presale",
            "type": "pubkey"
          },
          {
            "name": "merkleProofMetadata",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "evtMerkleProofMetadataCreate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "presale",
            "type": "pubkey"
          },
          {
            "name": "merkleProofMetadata",
            "type": "pubkey"
          },
          {
            "name": "proofUrl",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "evtMerkleRootConfigCreate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "config",
            "type": "pubkey"
          },
          {
            "name": "presale",
            "type": "pubkey"
          },
          {
            "name": "version",
            "type": "u64"
          },
          {
            "name": "root",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "evtOperatorCreate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "operator",
            "type": "pubkey"
          },
          {
            "name": "operatorOwner",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "evtPerformUnsoldBaseTokenAction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "presale",
            "type": "pubkey"
          },
          {
            "name": "totalTokenUnsold",
            "type": "u64"
          },
          {
            "name": "unsoldBaseTokenAction",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "evtPresaleVaultCreate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "baseMint",
            "type": "pubkey"
          },
          {
            "name": "quoteMint",
            "type": "pubkey"
          },
          {
            "name": "buyerMaximumDepositCap",
            "type": "u64"
          },
          {
            "name": "buyerMinimumDepositCap",
            "type": "u64"
          },
          {
            "name": "lockDuration",
            "type": "u64"
          },
          {
            "name": "vestDuration",
            "type": "u64"
          },
          {
            "name": "whitelistMode",
            "type": "u8"
          },
          {
            "name": "presaleMode",
            "type": "u8"
          },
          {
            "name": "presaleStartTime",
            "type": "u64"
          },
          {
            "name": "presaleEndTime",
            "type": "u64"
          },
          {
            "name": "presaleMaximumCap",
            "type": "u64"
          },
          {
            "name": "presaleMinimumCap",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "evtWithdraw",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "presale",
            "type": "pubkey"
          },
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "withdrawAmount",
            "type": "u64"
          },
          {
            "name": "escrowTotalDepositAmount",
            "type": "u64"
          },
          {
            "name": "presaleTotalDepositAmount",
            "type": "u64"
          },
          {
            "name": "owner",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "evtWithdrawRemainingQuote",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "presale",
            "type": "pubkey"
          },
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "amountRefunded",
            "type": "u64"
          },
          {
            "name": "presaleTotalRefundedQuoteToken",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "fixedPricePresaleExtraArgs",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "unsoldTokenAction",
            "type": "u8"
          },
          {
            "name": "padding0",
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "qPrice",
            "type": "u128"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "presale",
            "type": "pubkey"
          },
          {
            "name": "padding1",
            "type": {
              "array": [
                "u128",
                4
              ]
            }
          }
        ]
      }
    },
    {
      "name": "initializeFixedPricePresaleExtraArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "presale",
            "type": "pubkey"
          },
          {
            "name": "unsoldTokenAction",
            "type": "u8"
          },
          {
            "name": "qPrice",
            "type": "u128"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                4
              ]
            }
          }
        ]
      }
    },
    {
      "name": "initializePresaleArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenomic",
            "type": {
              "defined": {
                "name": "tokenomicArgs"
              }
            }
          },
          {
            "name": "presaleParams",
            "type": {
              "defined": {
                "name": "presaleArgs"
              }
            }
          },
          {
            "name": "lockedVestingParams",
            "type": {
              "option": {
                "defined": {
                  "name": "lockedVestingArgs"
                }
              }
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                4
              ]
            }
          }
        ]
      }
    },
    {
      "name": "lockedVestingArgs",
      "docs": [
        "Vest user bought token"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lockDuration",
            "docs": [
              "Lock duration until buyer can claim the token"
            ],
            "type": "u64"
          },
          {
            "name": "vestDuration",
            "docs": [
              "Vesting duration until buyer can claim the token"
            ],
            "type": "u64"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                4
              ]
            }
          }
        ]
      }
    },
    {
      "name": "merkleProofMetadata",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "presale",
            "docs": [
              "Presale address"
            ],
            "type": "pubkey"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                16
              ]
            }
          },
          {
            "name": "proofUrl",
            "docs": [
              "Merkle root proof URL"
            ],
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "merkleRootConfig",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "root",
            "docs": [
              "The 256-bit merkle root."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "padding0",
            "docs": [
              "Padding for future use"
            ],
            "type": "u64"
          },
          {
            "name": "presale",
            "docs": [
              "Presale pubkey that config is belong"
            ],
            "type": "pubkey"
          },
          {
            "name": "version",
            "docs": [
              "Version"
            ],
            "type": "u64"
          },
          {
            "name": "padding",
            "docs": [
              "Padding for further use"
            ],
            "type": {
              "array": [
                "u128",
                4
              ]
            }
          }
        ]
      }
    },
    {
      "name": "operator",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                4
              ]
            }
          }
        ]
      }
    },
    {
      "name": "presale",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "docs": [
              "Owner of presale"
            ],
            "type": "pubkey"
          },
          {
            "name": "quoteMint",
            "docs": [
              "Quote token mint"
            ],
            "type": "pubkey"
          },
          {
            "name": "baseMint",
            "docs": [
              "Base token"
            ],
            "type": "pubkey"
          },
          {
            "name": "baseTokenVault",
            "docs": [
              "Base token vault"
            ],
            "type": "pubkey"
          },
          {
            "name": "quoteTokenVault",
            "docs": [
              "Quote token vault"
            ],
            "type": "pubkey"
          },
          {
            "name": "base",
            "docs": [
              "Base key"
            ],
            "type": "pubkey"
          },
          {
            "name": "presaleMaximumCap",
            "docs": [
              "Presale target raised capital"
            ],
            "type": "u64"
          },
          {
            "name": "presaleMinimumCap",
            "docs": [
              "Presale minimum raised capital. Else, presale consider as failed."
            ],
            "type": "u64"
          },
          {
            "name": "presaleStartTime",
            "docs": [
              "When presale starts"
            ],
            "type": "u64"
          },
          {
            "name": "presaleEndTime",
            "docs": [
              "When presale ends. Presale can be ended earlier by creator if raised capital is reached (based on presale mode)"
            ],
            "type": "u64"
          },
          {
            "name": "buyerMinimumDepositCap",
            "docs": [
              "This is the minimum amount of quote token that a user can deposit to the presale"
            ],
            "type": "u64"
          },
          {
            "name": "buyerMaximumDepositCap",
            "docs": [
              "This is the maximum amount of quote token that a user can deposit to the presale"
            ],
            "type": "u64"
          },
          {
            "name": "presaleSupply",
            "docs": [
              "Total base token supply that can be bought by presale participants"
            ],
            "type": "u64"
          },
          {
            "name": "totalDeposit",
            "docs": [
              "Total deposited quote token"
            ],
            "type": "u64"
          },
          {
            "name": "totalEscrow",
            "docs": [
              "Total number of depositors. For statistic purpose only"
            ],
            "type": "u64"
          },
          {
            "name": "createdAt",
            "docs": [
              "When was the presale created"
            ],
            "type": "u64"
          },
          {
            "name": "lockDuration",
            "docs": [
              "Duration of bought token will be locked until claimable"
            ],
            "type": "u64"
          },
          {
            "name": "vestDuration",
            "docs": [
              "Duration of bought token will be vested until claimable"
            ],
            "type": "u64"
          },
          {
            "name": "lockStartTime",
            "docs": [
              "When the lock starts"
            ],
            "type": "u64"
          },
          {
            "name": "lockEndTime",
            "docs": [
              "When the lock ends"
            ],
            "type": "u64"
          },
          {
            "name": "vestingStartTime",
            "docs": [
              "When the vesting starts"
            ],
            "type": "u64"
          },
          {
            "name": "vestingEndTime",
            "docs": [
              "When the vesting ends"
            ],
            "type": "u64"
          },
          {
            "name": "totalClaimedToken",
            "docs": [
              "Total claimed base token. For statistic purpose only"
            ],
            "type": "u64"
          },
          {
            "name": "totalRefundedQuoteToken",
            "docs": [
              "Total refunded quote token. For statistic purpose only"
            ],
            "type": "u64"
          },
          {
            "name": "padding0",
            "type": "u64"
          },
          {
            "name": "whitelistMode",
            "docs": [
              "Whitelist mode"
            ],
            "type": "u8"
          },
          {
            "name": "presaleMode",
            "docs": [
              "Presale mode"
            ],
            "type": "u8"
          },
          {
            "name": "hasCreatorWithdrawn",
            "docs": [
              "Determine whether creator withdrawn the raised capital"
            ],
            "type": "u8"
          },
          {
            "name": "baseTokenProgramFlag",
            "docs": [
              "Base token program flag"
            ],
            "type": "u8"
          },
          {
            "name": "quoteTokenProgramFlag",
            "docs": [
              "Quote token program flag"
            ],
            "type": "u8"
          },
          {
            "name": "fixedPricePresaleUnsoldTokenAction",
            "docs": [
              "What to do with unsold base token. Only applicable for fixed price presale mode"
            ],
            "type": "u8"
          },
          {
            "name": "isFixedPricePresaleUnsoldTokenActionPerformed",
            "type": "u8"
          },
          {
            "name": "padding2",
            "type": {
              "array": [
                "u8",
                17
              ]
            }
          },
          {
            "name": "fixedPricePresaleQPrice",
            "docs": [
              "Presale rate. Only applicable for fixed price presale mode"
            ],
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "presaleArgs",
      "docs": [
        "Presale parameters"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "presaleMaximumCap",
            "type": "u64"
          },
          {
            "name": "presaleMinimumCap",
            "type": "u64"
          },
          {
            "name": "buyerMinimumDepositCap",
            "type": "u64"
          },
          {
            "name": "buyerMaximumDepositCap",
            "type": "u64"
          },
          {
            "name": "presaleStartTime",
            "type": "u64"
          },
          {
            "name": "presaleEndTime",
            "type": "u64"
          },
          {
            "name": "whitelistMode",
            "type": "u8"
          },
          {
            "name": "presaleMode",
            "type": "u8"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                4
              ]
            }
          }
        ]
      }
    },
    {
      "name": "remainingAccountsInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "slices",
            "type": {
              "vec": {
                "defined": {
                  "name": "remainingAccountsSlice"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "remainingAccountsSlice",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "accountsType",
            "type": {
              "defined": {
                "name": "accountsType"
              }
            }
          },
          {
            "name": "length",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tokenomicArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "presalePoolSupply",
            "type": "u64"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                4
              ]
            }
          }
        ]
      }
    }
  ]
};
