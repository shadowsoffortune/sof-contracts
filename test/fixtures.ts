import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { StatModifiersStructStruct } from '../typechain-types/contracts/Items';


export async function deployTokenFixture() {
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress; // minter
    let addr2: SignerWithAddress; // team address
    let addr3: SignerWithAddress; // game wallet

    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // Contrats déployés
    let game: any;
    let hero: any;
    let world: any;
    let items: any;
    let weaponsAndArmors: any;
    let statModifier: any;
    let heroInventory: any;
    let heroClasses: any;
    let monsters: any;

    // deploy World contract
    const World = await ethers.getContractFactory("World");
    world = await World.deploy();
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
    hero = await Hero.deploy("http://localhost:3000/api/metadata/", addr2.address, ethers.parseEther("20"));
    await hero.waitForDeployment();
    const heroAddress = await hero.getAddress();
    console.log("Deployed Hero contract at:", heroAddress);

    const StatModifier = await ethers.getContractFactory("StatModifier");
    statModifier = await StatModifier.deploy();
    await statModifier.waitForDeployment();
    const statModifierAddress = await statModifier.getAddress();
    console.log("Deployed StatModifier contract at:", statModifierAddress);

    const Items = await ethers.getContractFactory("Items");
    items = await Items.deploy();
    await items.waitForDeployment();
    const itemsAddress = await items.getAddress();
    console.log("Deployed items contract at:", itemsAddress);

    const WeaponsAndArmors = await ethers.getContractFactory("WeaponsAndArmors");
    weaponsAndArmors = await WeaponsAndArmors.deploy();
    await weaponsAndArmors.waitForDeployment();
    const weaponsAndArmorsAddress = await weaponsAndArmors.getAddress();
    console.log("Deployed items contract at:", weaponsAndArmorsAddress);

    const HeroInventory = await ethers.getContractFactory("HeroInventories");
    heroInventory = await HeroInventory.deploy(heroAddress, itemsAddress, weaponsAndArmorsAddress);
    await heroInventory.waitForDeployment();
    const heroInventoryAddress = await heroInventory.getAddress();
    console.log("Deployed HeroInventories contract at:", heroInventoryAddress);

    // Deploy Hero contract with initial parameters
    const Game = await ethers.getContractFactory("Game");
    game = await Game.deploy(heroAddress, worldAddress, heroEncountersAddress, heroInventoryAddress, itemsAddress, weaponsAndArmorsAddress, { from: owner.address });
    await game.waitForDeployment();
    const gameAddress = await game.getAddress();
    console.log("Deployed Game contract at:", heroAddress);

    // Deploy Hero contract with initial parameters
    const HeroClasses = await ethers.getContractFactory("HeroClasses");
    heroClasses = await HeroClasses.deploy({ from: owner.address });
    await heroClasses.waitForDeployment();
    const heroClassessAddress = await heroClasses.getAddress();
    console.log("Deployed heroclasses contract at:", heroClassessAddress);

    console.log("NEXT_PUBLIC_GAME_ADDRESS=", gameAddress);
    console.log("NEXT_PUBLIC_WORLD_ADDRESS=", worldAddress);
    console.log("NEXT_PUBLIC_HERO_ADDRESS=", heroAddress);
    console.log("NEXT_PUBLIC_HEROCLASSES_ADDRESS=", await heroClassessAddress);

    // set the game address in the world and hero contract
    await world.setGameAddress(gameAddress);
    await hero.setGameAddress(gameAddress);
    await heroEncounters.setGameAddress(gameAddress);
    await hero.setHeroClassesAddress(heroClassessAddress);
    await heroInventory.setGameAddress(gameAddress);
    await items.setGameAddress(gameAddress);
    await weaponsAndArmors.setGameAddress(gameAddress);

    // price of minting a hero
    console.log("Price of minting a hero:", await hero.price());

    let nodeDifficulty = 1;
    // init the world with 10 nodes
    for (let i = 0; i < 10; i++) {
        let cooldownPeriod = 0; // Utiliser le cooldown par défaut de 6 heures

        if (i === 5) {
            cooldownPeriod = 12 * 3600; // 12 heures pour le nœud 5
        }

        if (i == 2) {
            nodeDifficulty = 4;
        } else {
            if (i == 1) {
                nodeDifficulty = 0;
            }
            else {
                nodeDifficulty = 1;
            }
        }
        const tx = await world.createNode(i, "Maison " + i, true, 1, cooldownPeriod, false, nodeDifficulty, [{ id: 1, weight: 50 }]);
        await tx.wait();

        if (i < 9) {
            // creer l'ojet 
            const createItem = await items.addConsumable(i * 10 + 1, `Item${i * 10 + 1}`, []);

            // Ajouter des objets à chaque noeud
            const itemsToAdd = [
                { id: i * 10 + 1, name: `Item${i}A`, weight: 100 },
            ];
            await world.addItemsToNode(i, itemsToAdd);
        }

    }

    // connect nodes together
    console.log("Connecting nodes together");
    await world.connectNodes(1, 2, 1, [{ id: 1, weight: 50 }]);
    await world.setConnectionDangerosity(1, 2, 0); // Setting danger level low to avoid encounter
    await world.connectNodes(2, 3, 1, [{ id: 1, weight: 50 }]);
    await world.setConnectionDangerosity(2, 3, 0); // Setting danger level high to ensure encounter
    await world.connectNodes(3, 4, 1, [{ id: 1, weight: 50 }]);
    await world.setConnectionDangerosity(3, 4, 0); // Setting danger level high to ensure encounter
    await world.connectNodes(4, 5, 1, [{ id: 1, weight: 50 }]);
    await world.setConnectionDangerosity(4, 5, 0); // Setting danger level high to ensure encounter
    await world.connectNodes(5, 6, 1, [{ id: 1, weight: 50 }]);
    await world.setConnectionDangerosity(5, 6, 0); // Setting danger level high to ensure encounter
    await world.connectNodes(6, 7, 1, [{ id: 1, weight: 50 }]);
    await world.setConnectionDangerosity(6, 7, 0); // Setting danger level high to ensure encounter
    await world.connectNodes(7, 8, 1, [{ id: 1, weight: 50 }]);
    await world.setConnectionDangerosity(7, 8, 0); // Setting danger level high to ensure encounter
    await world.connectNodes(8, 9, 1, [{ id: 1, weight: 50 }]);
    await world.setConnectionDangerosity(8, 9, 0); // Setting danger level high to ensure encounter
    await world.connectNodes(8, 2, 1, [{ id: 1, weight: 50 }]);
    await world.setConnectionDangerosity(8, 2, 0); // Setting danger level high to ensure encounter


    // create monsters
    const Monsters = await ethers.getContractFactory("Monsters");
    monsters = await Monsters.deploy();
    await monsters.waitForDeployment();
    const monstersAddress = await monsters.getAddress();
    console.log("Deployed monsters contract at:", monstersAddress);

    const txMon = await monsters.createMonster(1, "Zombi", 10, 8, 8, 8, 8, 8, "1D2", 0, 10);
    await txMon.wait();

    const add = await world.addDefaultMonsters([1]);
    await add.wait();

    return {
        game,
        gameAddress,
        heroEncounters,
        hero,
        owner,
        addr1,
        addr2,
        addr3,
        heroAddress,
        world,
        worldAddress,
        items,
        statModifier,
        heroInventory,
        heroClasses,
    };
}