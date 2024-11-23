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

import { StatModifiersStructStruct } from '../typechain-types/contracts/Items'


describe("Hero Contract Mint Tests", function () {

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
    const game = await Game.deploy(heroAddress, worldAddress, heroEncountersAddress, heroInventoryAddress, itemsAddress, weaponsAndArmorsAddress, { from: owner.address });
    await game.waitForDeployment();
    const gameAddress = await game.getAddress();
    console.log("Deployed Game contract at:", heroAddress);

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
    console.log("NEXT_PUBLIC_ITEMS_ADDRESS=", await itemsAddress);

    // set the game address in the world and hero contract
    await world.setGameAddress(gameAddress);
    await hero.setGameAddress(gameAddress);
    await heroInventory.setGameAddress(gameAddress);
    await hero.setHeroClassesAddress(heroClassessAddress);

    // init the world with 10 nodes
    for (let i = 0; i < 10; i++) {
      const tx = await world.createNode(i, 'Maison' + i, true, 10, 0, false, 1, []);
      await tx.wait();
    }


    return { game, gameAddress, hero, owner, addr1, addr2, addr3, heroAddress, world, worldAddress, heroClasses, heroClassessAddress, monsters, monstersAddress, items, itemsAddress, heroInventoryAddress };
  }


  it("Should create a Hero class successfully", async function () {
    const { heroClasses } = await loadFixture(deployTokenFixture);
    const tx = await heroClasses.addClass(
      "Veteran",
      "A Veteran is a hero who has seen many battles and has the scars to prove it.",
      "/api/metadata/hero/veteran/male.png",
      "/api/metadata/hero/veteran/female.png",
    )
    await tx.wait();
    const heroClass = await heroClasses.getClass(0);
    expect(heroClass.name).to.equal("Veteran");
  });

  it("Should mint a Hero token successfully", async function () {
    // Load the fixture
    const { game, hero, owner, addr1, addr2, addr3, heroAddress, world, worldAddress } = await loadFixture(deployTokenFixture);
    // Prepare payment
    const payment = { value: ethers.parseEther("20") };

    // Execute mint function
    const tx = await game.connect(addr1).mintHero(addr1.address, addr3.address, "edmond", 0, 10, 10, 10, 10, 10, true, payment);
    await tx.wait();

    // Check the minted hero
    const heroId = await hero.getLastHeroId();
    expect(heroId).to.equal(1);

    // check tokensOfOwner
    const tokens = await hero.connect(addr1).tokensOfOwner(addr1.address);
    expect(tokens.length).to.equal(1);
  });

  it("Should display the correct hero metadata", async function () {
    // Load the fixture
    const { game, hero, owner, addr1, addr2, addr3, heroAddress, world, worldAddress, heroClasses } = await loadFixture(deployTokenFixture);
    // Prepare payment
    const payment = { value: ethers.parseEther("20") };

    const txclass = await heroClasses.addClass(
      "Veteran",
      "A Veteran is a hero who has seen many battles and has the scars to prove it.",
      "/api/metadata/hero/veteran/male.png",
      "/api/metadata/hero/veteran/female.png",
    )
    await txclass.wait();

    // Execute mint function
    const tx = await game.connect(addr1).mintHero(addr1.address, addr3.address, "edmond", 0, 10, 10, 10, 10, 10, true, payment);
    await tx.wait();

    // Check the minted hero
    const heroId = await hero.getLastHeroId();
    expect(heroId).to.equal(1);

    // check tokensOfOwner
    const tokens = await hero.connect(addr1).tokensOfOwner(addr1.address);
    expect(tokens.length).to.equal(1);

    // check metadata
    const metadata = await hero.tokenURI(1);
    console.log(metadata);

    // check metadata is a valid json
    const json = JSON.parse(metadata.replace("data:application/json;utf8,", ""));
    expect(json.name).to.equal("edmond");
  });

  it("Should consume a consumable item and update hero stats accordingly", async function () {
    const { items, hero, game, gameAddress, addr1, heroAddress, heroInventoryAddress } = await loadFixture(deployTokenFixture);

    // Ajouter un modificateur
    const statModifierPoison: StatModifiersStructStruct = {
      stat: 0, // HP
      amount: -5,
      duration: BigInt(0),
    }

    const poisonModifierId = 1;
    const consumablePoison = "Poison Potion";
    await items.connect(owner).addConsumable(
      poisonModifierId,
      consumablePoison,
      [statModifierPoison],
    );

    // Ajouter un modificateur
    const statModifierPotion: StatModifiersStructStruct = {
      stat: 0, // HP
      amount: 10,
      duration: BigInt(0),
    }

    // Ajouter un consommable
    const consumableId = 3;
    const potionModifierId = 2;
    const consumableName = "Healing Potion";
    const healAmount = 5; // Par exemple, chaque potion restaure 20 HP
    await items.connect(owner).addConsumable(
      consumableId,
      consumableName,
      [statModifierPotion], // modifierIds si applicable
    );

    // Mint l'item consommable à addr1
    await items.connect(owner).mint(addr1.address, consumableId, 2); // addr1 a 2 potions

    // Mint l'item poison à addr1
    await items.connect(owner).mint(addr1.address, poisonModifierId, 2); // addr1 a 2 poisons

    // Vérifier le solde initial
    let balance = await items.balanceOf(addr1.address, consumableId);
    expect(balance).to.equal(2);

    // Créer et mint un héros pour addr1
    const tokenId = 1;
    const txMint = await game.connect(addr1).mintHero(addr1.address, addr1.address, "HeroName", 1, 10, 10, 10, 10, 10, true, { value: ethers.parseEther("20") });
    await txMint.wait();

    const heroId = await hero.getLastHeroId();
    console.log("HeroId:", heroId);

    // authorize the address
    const txauth = await game.authorizeAddress(addr1.address);
    await txauth.wait();

    // approuver que game puisse transférer les items
    const txApprove2 = await items.connect(addr1).setApprovalForAll(gameAddress, true);
    await txApprove2.wait();

    // ajoute l'item consommable à l'inventaire du héros
    const txAddItem = await game.connect(addr1).addItemsToHero(heroId, poisonModifierId, 1);
    await txAddItem.wait();

    // ajoute l'item consommable à l'inventaire du héros
    const txAddItem2 = await game.connect(addr1).addItemsToHero(heroId, consumableId, 1);
    await txAddItem2.wait();

    // Vérifier les stats du héros avant la consommation
    let heroStats = await hero.getHeroStats(tokenId);
    const initialHP = heroStats.HP;

    // Utiliser un poison
    const consume = await game.connect(addr1).heroConsumeItem(heroId, poisonModifierId);
    await consume.wait();

    // Vérifier les stats du héros après la mise à jour
    heroStats = await hero.getHeroStats(heroId);
    expect(heroStats.HP).to.equal(Number(initialHP) - 5);

    // Utiliser une potion de soin
    await game.connect(addr1).heroConsumeItem(heroId, consumableId);

    // Vérifier le solde après consommation
    balance = await items.balanceOf(addr1.address, consumableId);
    expect(balance).to.equal(1);

    // Vérifier les stats du héros après consommation
    heroStats = await hero.getHeroStats(heroId);
    expect(heroStats.HP).to.equal(Number(initialHP));

    // Assurez-vous que HP ne dépasse pas HPMax si applicable
    if (heroStats.HP > heroStats.HPMax) {
      expect(heroStats.HP).to.equal(heroStats.HPMax);
    }
  });


  // tester que le wallet de jeu du héros peut extraire un objet de l'inventaire du héros
  it("Should be able to extract an item from the hero's inventory", async function () {
    const { items, hero, game, gameAddress, addr1, heroAddress, heroInventoryAddress } = await loadFixture(deployTokenFixture);

    // Ajouter un modificateur
    const statModifierPoison: StatModifiersStructStruct = {
      stat: 0, // HP
      amount: -5,
      duration: BigInt(0),
    }

    const poisonModifierId = 1;
    const consumablePoison = "Poison Potion";
    await items.connect(owner).addConsumable(
      poisonModifierId,
      consumablePoison,
      [statModifierPoison],
    );

    // Ajouter un modificateur
    const statModifierPotion: StatModifiersStructStruct = {
      stat: 0, // HP
      amount: 5,
      duration: BigInt(0),
    }

    // Ajouter un consommable
    const consumableId = 3;
    const potionModifierId = 2;
    const consumableName = "Healing Potion";
    const healAmount = 5; // Par exemple, chaque potion restaure 20 HP
    await items.connect(owner).addConsumable(
      consumableId,
      consumableName,
      [statModifierPoison], // modifierIds si applicable
    );

    // Mint l'item consommable à addr1
    await items.connect(owner).mint(addr1.address, consumableId, 2); // addr1 a 2 potions

    // Mint l'item poison à addr1
    await items.connect(owner).mint(addr1.address, poisonModifierId, 2); // addr1 a 2 poisons

    // Vérifier le solde initial
    let balance = await items.balanceOf(addr1.address, consumableId);
    expect(balance).to.equal(2);

    // Créer et mint un héros pour addr1
    const tokenId = 1;
    const txMint = await game.connect(addr1).mintHero(addr1.address, addr1.address, "HeroName", 1, 10, 10, 10, 10, 10, true, { value: ethers.parseEther("20") });
    await txMint.wait();

    const heroId = await hero.getLastHeroId();
    console.log("HeroId:", heroId);

    // authorize the address
    const txauth = await game.authorizeAddress(addr1.address);
    await txauth.wait();

    // approuver que game puisse transférer les items
    const txApprove2 = await items.connect(addr1).setApprovalForAll(gameAddress, true);
    await txApprove2.wait();

    // ajoute l'item consommable à l'inventaire du héros
    const txAddItem = await game.connect(addr1).addItemsToHero(heroId, poisonModifierId, 1);
    await txAddItem.wait();

    //TODO : extrait l'item consommable de l'inventaire du héros vers le wallet du jeu
    //const txExtractItem = await game.connect(addr1).extractItemFromHero(heroId, poisonModifierId, 1);
  });
  
  it("Should split payment between team wallet and player wallet correctly", async function () {
    const { hero, addr1, addr2, game } = await loadFixture(deployTokenFixture);
  
    // Initial balances
    const initialTeamBalance = await ethers.provider.getBalance(addr2.address);
    const initialPlayerBalance = await ethers.provider.getBalance(addr1.address);

    console.log("Initial player balance:", ethers.formatEther(initialPlayerBalance).toString());
    console.log("Initial team balance:", ethers.formatEther(initialTeamBalance).toString());
  
    // Prepare payment
    const paymentAmount = ethers.parseEther("20"); // Assurez-vous que ce montant correspond au prix du minting
  
    // Execute mint function with payment
    const tx = await game.connect(addr1).mintHero(addr1.address, addr3.address, "edmond", 0, 10, 10, 10, 10, 10, true, { value: paymentAmount });
    await tx.wait();
  
    // Expected split payment
    const splitPayment = paymentAmount / BigInt(2);
  
    // Final balances
    const finalTeamBalance = await ethers.provider.getBalance(addr2.address);
    const finalPlayerBalance = await ethers.provider.getBalance(addr1.address);
  
    console.log("Final player balance:", ethers.formatEther(finalPlayerBalance).toString());
    console.log("Final team balance:", ethers.formatEther(finalTeamBalance).toString());

    // Check if the team wallet received the correct amount
    expect(finalTeamBalance).to.equal(initialTeamBalance + splitPayment);
  
    // Check if the player wallet received the correct refund (if any)
    expect(finalPlayerBalance).to.be.closeTo(initialPlayerBalance - paymentAmount, ethers.parseEther("0.5")); // Considering gas costs
  });

});
