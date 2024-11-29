import { ethers } from "hardhat";
import env from "hardhat";
import fs from "fs";
import { Hero } from "../typechain-types/contracts/Hero";
import { World } from "../typechain-types/contracts/World";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { HEROES } from "./classes";
import inputItems from "./items";
import { StatModifiersStructStruct } from '../typechain-types/contracts/Items';
import 'dotenv/config';

let owner: SignerWithAddress;
let addr1: SignerWithAddress; // minter
let addr2: SignerWithAddress; // team address
let addr3: SignerWithAddress; // game wallet
let addr4: SignerWithAddress; // game wallet 2 

async function main() {

  [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();

  const ownerAddress = owner.address;

  let nonce = await ethers.provider.getTransactionCount(ownerAddress);
  console.log("Current nonce:", nonce);
  console.log("Owner address:", ownerAddress);

  const gasOptions = {
    gasPrice: ethers.parseUnits("40", "gwei"),
    gasLimit: 8000000, 
  };

  async function sendTransactionWithRetry(txFunc: (overrides: any) => Promise<any>, maxRetries: number = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        nonce = await ethers.provider.getTransactionCount(ownerAddress);
        const currentNonce = nonce;
        const overrides = {
          ...gasOptions,
          nonce: currentNonce
        };

        // wait for 2 second
        if (env.network.name !== "localhost") {
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log(`Sending transaction with gasOptions price : ${Number(gasOptions.gasPrice)}, limit ${Number(gasOptions.gasLimit)} ,  nonce ${currentNonce} (attempt ${attempt})`);
        }
        // Appeler la fonction de transaction avec les overrides
        const tx = await txFunc(overrides);
        const receipt = await tx.wait();
        nonce++;

        return receipt;
      } catch (error: any) {
        if (error.message.includes("nonce too low") && attempt < maxRetries) {
          console.warn(`Nonce too low error, retrying transaction (attempt ${attempt})`);
          // Mettre à jour le nonce
          nonce = await ethers.provider.getTransactionCount(ownerAddress);
          // Attendre un peu avant de réessayer
          await new Promise(resolve => setTimeout(resolve, 1000));
          // Continuer à la prochaine tentative
        } else {
          console.error(`Transaction failed: ${error.message}`);
          console.log("Transaction failed: ", error);
          throw error;
        }
      }
    }
    throw new Error("Max retries reached for transaction");
  }

  // INITIALIZE THE CONTRACTS

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
  let baseURI = "http://localhost:3000";
  // change uri if network is not local
  if (env.network.name !== "localhost") {
    baseURI = process.env.DAPP_URL || "https://sof-dapp.vercel.app";
  }

  const hero = await Hero.deploy(baseURI, ownerAddress, ethers.parseEther("5"));
  await hero.waitForDeployment();
  const heroAddress = await hero.getAddress();
  console.log("Deployed Hero contract at:", heroAddress);

  const Items = await ethers.getContractFactory("Items");
  const items = await Items.deploy();
  await items.waitForDeployment();
  const itemsAddress = await items.getAddress();
  console.log("Deployed items contract at:", itemsAddress);

  const WeaponsAndArmors = await ethers.getContractFactory("WeaponsAndArmors");
  const weaponsAndArmors = await WeaponsAndArmors.deploy();
  await weaponsAndArmors.waitForDeployment();
  const weaponsAndArmorsAddress = await weaponsAndArmors.getAddress();
  console.log("Deployed weaponsAndArmors contract at:", weaponsAndArmorsAddress);

  const HeroInventory = await ethers.getContractFactory("HeroInventories");
  const heroInventory = await HeroInventory.deploy(heroAddress, itemsAddress, weaponsAndArmorsAddress);
  await heroInventory.waitForDeployment();
  const heroInventoryAddress = await heroInventory.getAddress();

  console.log("Deployed HeroInventories contract at:", heroInventoryAddress);

  await weaponsAndArmors.setInventoryAddress(heroInventoryAddress);

  // Deploy Hero contract with initial parameters
  const Game = await ethers.getContractFactory("Game");
  const game = await Game.deploy(heroAddress, worldAddress, heroEncountersAddress, heroInventoryAddress, itemsAddress, weaponsAndArmorsAddress, { from: owner.address });
  await game.waitForDeployment();
  const gameAddress = await game.getAddress();
  console.log("Deployed Game contract at:", gameAddress);

  // Deploy Hero contract with initial parameters
  const HeroClasses = await ethers.getContractFactory("HeroClasses");
  const heroClasses = await HeroClasses.deploy({ from: owner.address });
  await heroClasses.waitForDeployment();
  const heroClassessAddress = await heroClasses.getAddress();
  console.log("Deployed heroclasses contract at:", heroClassessAddress);

  // create monsters
  const Monsters = await ethers.getContractFactory("Monsters");
  const monsters = await Monsters.deploy();
  await monsters.waitForDeployment();
  const monstersAddress = await monsters.getAddress();
  console.log("Deployed monsters contract at:", monstersAddress);

  console.log("NEXT_PUBLIC_GAME_ADDRESS="+gameAddress);
  console.log("NEXT_PUBLIC_WORLD_ADDRESS="+worldAddress);
  console.log("NEXT_PUBLIC_HERO_ADDRESS="+heroAddress);
  console.log("NEXT_PUBLIC_HEROENCOUNTERS_ADDRESS="+await heroEncountersAddress);
  console.log("NEXT_PUBLIC_HEROCLASSES_ADDRESS="+await heroClassessAddress);
  console.log("NEXT_PUBLIC_MONSTERS_ADDRESS="+monstersAddress);
  console.log("NEXT_PUBLIC_HERO_INVENTORIES_ADDRESS="+heroInventoryAddress);

  // set the game address in the world and hero contract
  await world.setGameAddress(gameAddress);
  await hero.setGameAddress(gameAddress);
  await heroEncounters.setGameAddress(gameAddress);
  await hero.setHeroClassesAddress(heroClassessAddress);
  await heroInventory.setGameAddress(gameAddress);
  await items.setGameAddress(gameAddress);
  await weaponsAndArmors.setGameAddress(gameAddress);

  for (const heroClass of HEROES) {
    const tx = await heroClasses.addClass(heroClass.name, heroClass.description, heroClass.maleSkinURI, heroClass.femaleSkinURI);
    await tx.wait();
  }
  console.log(`Created hero classes`);

  console.log('fetching nodes from the dapp', `${process.env.DAPP_URL}/api/nodes`);
  const json = await fetch(`${process.env.DAPP_URL}/api/nodes`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '',
    },
  }
  ).then((response) => response.json())

  for (const object of json) {
    //node creation
    if (object.data.lng && object.data.lat) {
      console.log(`Creating node ${object.data.id}`);
      const coolDownHours = object.data.cooldown;
      const coolDown = Number(coolDownHours) * 3600;

      console.log("Creating node with parameters:", {
        nodeId: Number(object.data.id),
        name: object.data.id,
        isSearchable: true,
        searchDifficulty: object.data.search_difficulty,
        coolDown: coolDown,
        isShelter: object.data.is_shelter,
        dangerosity: object.data.dangerosity,
        monstersWeights: object.data.monsters_weights,
      });

      const tx = await sendTransactionWithRetry(() => world.createNode(Number(object.data.id), object.data.id, true, object.data.search_difficulty, coolDown, object.data.is_shelter, object.data.dangerosity, object.data.monsters_weights, { ...gasOptions, nonce: nonce++ }));
      // Add items to the node
      if (object.data.can_search === true && object.data.items_weights.length > 0) {
        const tx = await sendTransactionWithRetry(() => world.addItemsToNode(Number(object.data.id), object.data.items_weights, { ...gasOptions, nonce: nonce++ }));
        //console.log(`Added items to node ${object.data.id} with weights ${JSON.stringify(object.data.items_weights)}`);

        // check if items are added
        const items = await world.getLootForNode(Number(object.data.id));
        //console.log(`Items added to node ${object.data.id}: ${items}`);

      }
      //console.log(`Node created: ${object.data.id} with ID ${Number(object.data.id)}`);
    }
  }

  for (const object of json) {
    //node connection
    if (object.data.source && object.data.target) {
      const fromNodeId = object.data.source;
      const toNodeId = object.data.target;
      //console.log(`Connecting node ${fromNodeId} to node ${toNodeId}`);
      // console.log(`Dangerosity: ${object.data.monsters_weights}`);
      // console.log(object.data.monsters_weights);
      const tx = await sendTransactionWithRetry(() => world.connectNodes(fromNodeId, toNodeId, object.data.dangerosity, object.data.monsters_weights, { ...gasOptions, nonce: nonce++ }));
      //console.log(`Connected node ${fromNodeId} to node ${toNodeId} with dangerosity ${object.data.dangerosity}`);
    }
  }
  console.log("Graph construction complete.");


  // Add items to the world
  console.log('fetching items from the dapp', `${process.env.DAPP_URL}/api/items`);
  const itemsData = await fetch(`${process.env.DAPP_URL}/api/items`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '',
    }
  })
    .then((response) => response.json())

  let statModifiersFinal: StatModifiersStructStruct[] = [];

  for (const item of itemsData) {
    statModifiersFinal = [];
    console.log(`Creating item ${item.name}`);
    if (item.type === "consumable") {
      if (!Array.isArray(item.modifiers)) {
        // convert stats to bigint
        switch (item.modifiers.stat) {
          case "HP":
            item.modifiers.stat = 0;
            break;
          case "HPMax":
            item.modifiers.stat = 1;
            break;
          case "STR":
            item.modifiers.stat = 2;
            break;
          case "AGI":
            item.modifiers.stat = 3;
            break;
          case "PER":
            item.modifiers.stat = 4;
            break;
          case "INT":
            item.modifiers.stat = 5;
            break;
          case "CON":
            item.modifiers.stat = 6; break;
          case "XP":
            item.modifiers.stat = 7; break;
          case "ENERGY":
            item.modifiers.stat = 8; break;
          case "ARMOR":
            item.modifiers.stat = 10; break;
          case "DUR":
            item.modifiers.stat = 11; break;
            break;
        }

        const statModifierFinal: StatModifiersStructStruct = {
          stat: Number(item.modifiers.stat),
          amount: Number(item.modifiers.value),
          duration: BigInt(item.modifiers.duration),
        };

        statModifiersFinal.push(statModifierFinal);

      } else {
        // for (const modifier of item.modifiers) {
        //   const tx= await statModifier.connect(owner).addStatModifier(modifier);
        //   await tx.wait();
        // }
      }
      //console.log(`Modifiers for item ${item.name}: ${statModifiersFinal}`);
      const tx = await sendTransactionWithRetry(() => items.addConsumable(item.id, item.name, statModifiersFinal, { ...gasOptions, nonce: nonce++ }));
      //console.log(`Added consumable ${item.name}`);
    }
    else if (item.type === "armor") {
      let type = 0;
      if (item.armor_type === "head") { type = 0; }
      else if (item.armor_type === "torso") { type = 1; }
      else if (item.armor_type === "pants") { type = 2; }
      else if (item.armor_type === "boots") { type = 3; }
      const tx = await sendTransactionWithRetry(() => weaponsAndArmors.connect(owner).addArmorType(item.id, item.name, item.defense, item.durability, type, { ...gasOptions, nonce: nonce++ }));
      //console.log(`Added armor ${item.name}`);
    }
    else if (item.type === "weapon") {
      const tx = await sendTransactionWithRetry(() => weaponsAndArmors.connect(owner).addWeaponType(item.id, item.name, item.damage, item.durability, "", { ...gasOptions, nonce: nonce++ }));
      //console.log(`Added weapon ${item.name}`);
    }
    //console.log(`Created item ${item.name}`);
  }


  // Create monsters
  console.log('fetching monsters from the dapp', `${process.env.DAPP_URL}/api/monsters`);
  const monstersData = await fetch(`${process.env.DAPP_URL}/api/monsters`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '',
    }
  })
    .then((response) => response.json())

  for (const monster of monstersData) {
    //console.log(`Creating monster ${monster.name}`);
    const tx = await sendTransactionWithRetry(() => monsters.createMonster(monster.id, monster.name, monster.HP, monster.STR, monster.AGI, monster.PER, monster.INT, monster.CON, monster.DMG, monster.ARMOR, monster.XP, { ...gasOptions, nonce: nonce++ }));
    console.log(`Created monster ${monster.name}`);
  }

  // Add default monsters to the world
  const txDefaultMonsters = await world.addDefaultMonsters([1]);
  await txDefaultMonsters.wait();


  // Mint a Hero NFT
  //console.log("Minting a Hero NFT with player address" + owner.address + " to wallet address", '0x1E7405ACB69Fb1c00eAcE6b55C2464a50500c4b3');
  const mintTx = await game.connect(owner).mintHero('0x1E7405ACB69Fb1c00eAcE6b55C2464a50500c4b3', '0x1E7405ACB69Fb1c00eAcE6b55C2464a50500c4b3', "bob", 0, 7, 10, 13, 12, 8, false, { value: ethers.parseEther("5") });
  await mintTx.wait();
  const heroId = await hero.getLastHeroId();
  console.log("Minted Hero NFT with ID:", heroId.toString());
  const heroNode = await world.getHeroNode(heroId);
  console.log("Hero is placed on node:", heroNode.toString());

  // add wallet address to the authorized wallet of the game contract
  const wlTx = await game.authorizeAddress('0x1E7405ACB69Fb1c00eAcE6b55C2464a50500c4b3');
  await wlTx.wait();

  // Mint items to HeroInventories contract
  const weaponUniqueTx = await weaponsAndArmors.connect(owner).mintWeapon(heroInventory.getAddress(), 10013);
  const weapon1 = await weaponUniqueTx.wait();

  //console.log("Weapon minted to HeroInventories contract:", weapon1);

  // Add items to hero's inventory
  await heroInventory.connect(owner).addERC721ItemToHero(heroId, 1);


  // Test the consumable
  const txMint = await items.connect(owner).mint(heroInventoryAddress, 1, 1);
  await txMint.wait();
  const addItemTx = await heroInventory.connect(owner).addItemToHero(heroId, 1, 1);
  await addItemTx.wait();

  const txMint2 = await items.connect(owner).mint(heroInventoryAddress, 5, 1);
  await txMint2.wait();

  const addItemTx2 = await heroInventory.connect(owner).addItemToHero(heroId, 5, 1);
  await addItemTx2.wait();

  const txMint7 = await items.connect(owner).mint(heroInventoryAddress, 7, 1);
  await txMint7.wait();
  const addItemTx7 = await heroInventory.connect(owner).addItemToHero(heroId, 7, 1);
  await addItemTx7.wait();

  const txMint3 = await weaponsAndArmors.connect(owner).mintArmor(heroInventoryAddress, 20000);
  await txMint3.wait();

  const addItemTx3 = await heroInventory.connect(owner).addERC721ItemToHero(heroId, 2);
  await addItemTx3.wait();

  // get hero inventory
  const heroInventoryItems = await heroInventory.getHeroInventory(heroId);
  //console.log("Hero inventory items:", heroInventoryItems);

  // test the use of the consumable
  // const useItemTx = await game.connect(addr4).heroConsumeItem(heroId, 1);
  // await useItemTx.wait();

  //give xp to the hero
  const xpTx = await hero.addHeroXP(heroId, 400);
  await xpTx.wait();

  // Test the hero stats
  const heroStats = await hero.getHeroStats(heroId);
  //console.log(`Hero stats:  HP : ${heroStats[0]} XP : ${heroStats[1]}`);

  // get hero token URI
  const tokenURI = await hero.tokenURI(heroId);
  //console.log("Hero token URI:", tokenURI);

  // // get the hero node id
  // const heroNodeId = await world.getHeroNode(heroId);
  // console.log(`Hero is placed on node ${heroNodeId}`);

  // for (let node = 2; node <= 5; node++) {
  //   console.log(`Moving hero from node ${heroNodeId} to node ${node}`);
  //   const tx = await game.moveHero(heroId, node);
  //   await tx.wait();

  //   let isActive = await game.activeEncounters(heroId);
  //   console.log(`Hero is in an encounter? ${isActive[0]}`);

  //   if (Number(isActive[0]) !== 0) {
  //     await game.resolveEncounter(heroId, true, -4, 20);
  //     console.log(`Encounter resolved at node ${node}`);

  //     // show new hero stats : 
  //     const heroStats = await hero.getHeroStats(heroId);
  //     console.log(`Hero stats: 
  //     - HP : ${heroStats[0]}
  //     - XP : ${heroStats[1]}
  //     `);
  //   }
  //}

  // // Place the Hero on the starting node (assuming the first passage is the starting point)
  // const startNodeId = nodeIds[passages[0].title];
  // console.log(`Placing hero on the starting node: ${passages[0].title} with ID ${startNodeId}`);
  // const tx = await world.placeHero(heroId, startNodeId);
  // await tx.wait();

  // // Navigate through the graph
  // let currentNodeId = startNodeId;

  // console.log(nodeIds);

  // // récupère les liens du premier passage à partir du contrat
  // const firstPassage = passages[0];
  // const firstNodeId = nodeIds[firstPassage.title];
  // const firstPassageLinks = await world.getConnections(firstNodeId);
  // const firstPassageLinkName = await world.getNodeName(firstPassageLinks[0]);
  // console.log('firstPassageName',firstPassageLinkName);

  // 

  // for (const passage of passages) {
  //   if (passage.links.length > 0) {
  //     // Afficher le passage et les liens
  //     console.log(`Current node: ${passage.title} with ID ${currentNodeId}`);
  //     console.log("Links:");
  //     for (const link of passage.links) {
  //       console.log(`- ${link.label} -> ${link.target}`);
  //     }
  //     const nextLink = passage.links[0]; // Just take the first link for simplicity
  //     console.log(nextLink);
  //     const nextNodeId = nodeIds[nextLink.target];
  //     if (nextNodeId !== undefined) {
  //       // Vérifiez si les nœuds sont connectés avant de déplacer le héros
  //       const isConnected = await world.isConnected(currentNodeId, nextNodeId);
  //       if (isConnected) {
  //         console.log(`Moving hero from node ${currentNodeId} to node ${nextNodeId} (${nextLink.label})`);
  //         await world.moveHero(heroId, nextNodeId);
  //         currentNodeId = nextNodeId;
  //       } else {
  //         console.warn(`Cannot move hero, nodes ${currentNodeId} and ${nextNodeId} are not connected.`);
  //       }
  //     } else {
  //       console.warn(`Unable to move hero, target node for "${nextLink.target}" not found.`);
  //     }
  //   }
  // }

  console.log("Deployement complete.");
}

// Exécutez le script
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
