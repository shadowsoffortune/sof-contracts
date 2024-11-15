import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Hero } from "../typechain-types/contracts/Hero";
import { World } from "../typechain-types/contracts/World";
import { AddressLike } from "ethers";
import hre from "hardhat";


let owner: SignerWithAddress; //0x93d8Fe3B509FDE9214cff0b95a1C7d7dFa2C10c5

async function main() {

  [owner] = await ethers.getSigners();
  const ownerAddress = owner.address;

  const monsters = ethers.getContractAt("Monsters", "0xAa0671c90b46f9c7E5b210206b1aB8bfDC645345");

  // update a monster
  const monsterId = 15;
  console.log("Updating monster stats");
  const tx = await (await monsters).setMonsterStats(monsterId, 6, 7, 9, 11, 4, 7, "1D3+0.15*AGI", 0);
  await tx.wait();
  console.log("Monster stats updated");

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});