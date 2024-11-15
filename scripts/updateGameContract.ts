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

    const heroAddress = "0xbe209FF39eaaf7aBf2610750Ab4FA44dCBE1D64e"
    const worldAddress = "0x653669fCA0E31790d719E80033E55da7CA94dBE4"
    const heroEncountersAddress = "0x98436492AE0c12403cBCd29C5bee766Ae1B44f80"
    const heroInventoryAddress = "0x68168071a5127Fb5e4DD4C8Be37D2B4B9a19D42e"
    const itemsAddress = "0x4523502E8C5f6DD563A8fa962bcf822914Ff2816"
    const weaponsAndArmorsAddress = "0x741570150053fB81B781C31645b2BD8733b43BCF"

    // const game = ethers.getContractAt("Game", "0x770E080fdB1027cfFAF6D9CD0074354B6338700e");

    // const items = await (await game).itemsContract();
    // console.log("Items contract address:", items);

    // const weaponsAndArmors = await (await game).weaponsAndArmorsContract();
    // console.log("Weapons and Armors contract address:", weaponsAndArmors);

    //TODO deploy new contrat
    // const Game = await ethers.getContractFactory("Game");
    // const game = await Game.deploy(heroAddress, worldAddress, heroEncountersAddress, heroInventoryAddress, itemsAddress, weaponsAndArmorsAddress, { from: owner.address });
    // await game.waitForDeployment();
    // const gameAddress = await game.getAddress();
    // console.log("Deployed Game contract at:", gameAddress);

    const gameAddress = "0x19a4a5711381AdE12E7d7955b3A350fF1d1Aa296";

    const world = ethers.getContractAt("World", worldAddress);
    const hero = ethers.getContractAt("Hero", heroAddress);
    const heroEncounters = ethers.getContractAt("HeroEncounters", heroEncountersAddress);
    const HeroInventories = ethers.getContractAt("HeroInventories", heroInventoryAddress);
    const items = ethers.getContractAt("Items", itemsAddress);
    const weaponsAndArmors = ethers.getContractAt("WeaponsAndArmors", weaponsAndArmorsAddress);

    await (await world).setGameAddress(gameAddress);
    await (await hero).setGameAddress(gameAddress);
    await (await heroEncounters).setGameAddress(gameAddress);
    await (await HeroInventories).setGameAddress(gameAddress);
    await (await items).setGameAddress(gameAddress);
    await (await weaponsAndArmors).setGameAddress(gameAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});