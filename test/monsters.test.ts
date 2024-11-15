import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
let owner: SignerWithAddress;
let addr1: SignerWithAddress; // minter
let addr2: SignerWithAddress; // team address
let addr3: SignerWithAddress; // game wallet


describe("Monster Contract Mint Tests", function () {

  async function deployTokenFixture() {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // deploy World contract
    const World = await ethers.getContractFactory("World");
    const world = await World.deploy();
    await world.waitForDeployment();
    const worldAddress = await world.getAddress();
    console.log("Deployed World contract at:", worldAddress);

    // deploy Encounters contract
    const HeroEncounters = await ethers.getContractFactory("HeroEncounters");
    const heroEncounters = await HeroEncounters.deploy();
    await heroEncounters.waitForDeployment();
    const heroEncountersAddress = await heroEncounters.getAddress();
    console.log("Deployed HeroEncounters contract at:", heroEncountersAddress);

    // Deploy EstforLibrary contract
    const EstforLibrary = await ethers.getContractFactory("EstforLibrary");
    const estforLibrary = await EstforLibrary.deploy();
    await estforLibrary.waitForDeployment();
    const estforLibraryAddress = await estforLibrary.getAddress();

    // Deploy HeroNFTLibrary contract
    const HeroNFTLibrary = await ethers.getContractFactory("HeroNFTLibrary");
    const heroNFTLibrary = await HeroNFTLibrary.deploy();
    await heroNFTLibrary.waitForDeployment();
    const heroNFTLibraryAddress = await heroNFTLibrary.getAddress();

    // Deploy Hero contract with initial parameters
    const Hero = await ethers.getContractFactory("Hero", {
      libraries: {
        EstforLibrary: estforLibraryAddress,
        HeroNFTLibrary: heroNFTLibraryAddress
      }
    });
    const hero = await Hero.deploy("http://localhost:3000/api/metadata/", addr2.address, ethers.parseEther("20"));
    await hero.waitForDeployment();
    const heroAddress = await hero.getAddress();
    console.log("Deployed Hero contract at:", heroAddress);

    const Items = await ethers.getContractFactory("Items");
    const items = await Items.deploy({ from: owner.address });
    await items.waitForDeployment();
    const itemsAddress = await items.getAddress();
    console.log("Deployed items contract at:", itemsAddress);

    const WeaponsAndArmors = await ethers.getContractFactory("WeaponsAndArmors");
    const weaponsAndArmors = await WeaponsAndArmors.deploy();
    await weaponsAndArmors.waitForDeployment();
    const weaponsAndArmorsAddress = await weaponsAndArmors.getAddress();
    console.log("Deployed items contract at:", weaponsAndArmorsAddress);

    const HeroInventory = await ethers.getContractFactory("HeroInventories");
    const heroInventory = await HeroInventory.deploy(heroAddress, itemsAddress, weaponsAndArmorsAddress);
    await heroInventory.waitForDeployment();
    const heroInventoryAddress = await heroInventory.getAddress();
    console.log("Deployed HeroInventories contract at:", heroInventoryAddress);

    // Deploy Hero contract with initial parameters
    const Game = await ethers.getContractFactory("Game");
    const game = await Game.deploy(heroAddress, worldAddress, heroEncountersAddress, heroInventory, itemsAddress, weaponsAndArmorsAddress, { from: owner.address });
    await game.waitForDeployment();
    const gameAddress = await game.getAddress();
    console.log("Deployed Game contract at:", heroAddress);


    // init the world with 10 nodes
    for (let i = 0; i < 10; i++) {
      const tx = await world.createNode(i, 'Maison' + i, true, 10, 0, false);
      await tx.wait();
    }

    // Deploy Monster contract with initial parameters
    const Monsters = await ethers.getContractFactory("Monsters");
    const monsters = await Monsters.deploy({ from: owner.address });
    await monsters.waitForDeployment();
    const monstersAddress = await monsters.getAddress();
    console.log("Deployed monsters contract at:", monstersAddress);

    // Deploy Hero contract with initial parameters
    const HeroClasses = await ethers.getContractFactory("HeroClasses");
    const heroClasses = await HeroClasses.deploy({ from: owner.address });
    await heroClasses.waitForDeployment();
    const heroClassessAddress = await heroClasses.getAddress();
    console.log("Deployed heroclasses contract at:", heroClassessAddress);

    console.log("NEXT_PUBLIC_GAME_ADDRESS=", gameAddress);
    console.log("NEXT_PUBLIC_WORLD_ADDRESS=", worldAddress);
    console.log("NEXT_PUBLIC_HERO_ADDRESS=", heroAddress);
    console.log("NEXT_PUBLIC_HEROCLASSES_ADDRESS=", await heroClassessAddress);
    console.log("NEXT_PUBLIC_MONSTERS_ADDRESS=", await monstersAddress);

    // set the game address in the world and hero contract
    await world.setGameAddress(gameAddress);
    await hero.setGameAddress(gameAddress);
    await heroInventory.setGameAddress(gameAddress);
    await hero.setHeroClassesAddress(heroClassessAddress);

    return { game, hero, owner, addr1, addr2, addr3, heroAddress, world, worldAddress, heroClasses, heroClassessAddress, monsters, monstersAddress };
  }

  it("Should create a monster successfully", async function () {
    const { monsters } = await loadFixture(deployTokenFixture);
    const tx = await monsters.createMonster(1,"Zombi", 10, 8, 8, 8, 8, 8, "1D2", 0, 10);
    await tx.wait();

    const monster = await monsters.getMonster(1);
    console.log("Monster:", monster);
    expect(monster[0]).to.equal("Zombi");
  });

});
