import { HardhatUserConfig } from "hardhat/config";
import 'dotenv/config';
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";

const config: HardhatUserConfig = {
  etherscan: {
    apiKey: {
      sonic: "sonic", // apiKey is not required, just set a placeholder
    },
    customChains: [
      {
        network: "sonic",
        chainId: 64165,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/testnet/evm/64165/etherscan",
          browserURL: "https://scan.soniclabs.com"
        }
      }
    ]
  },
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 10,
          },
          viaIR: true,
        },
      }
    ],
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: [process.env.LOCALHOST_PRIVATE_KEY || '',
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
        "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
        "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a"
      ],
    },
    sonicTestnet: {
      url: process.env.SONIC_TESTNET_URL || "https://rpc.sonic.fantom.network/",
      accounts: [process.env.SONIC_PRIVATE_KEY || '',
      ],
      // avoid nonce issues
      gas: 666200000,
      gasPrice: "auto",
      gasMultiplier: 1.5,
      blockGasLimit: 60000000
    },
  },
  sourcify: {
    // Disabled by default
    // Doesn't need an API key
    enabled: true
  }
};

export default config;
