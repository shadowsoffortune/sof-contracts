import { ethers } from "hardhat";
import fs from "fs";
import { Hero } from "../typechain-types/contracts/Hero";
import { World } from "../typechain-types/contracts/World";
import { Game } from "../typechain-types/contracts/Game";
import { Monsters } from "../typechain-types/contracts/Monsters";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

let owner: SignerWithAddress;
let gameWallet: SignerWithAddress; // game wallet

async function main() {

  // Déployez les contrats
  [owner, gameWallet] = await ethers.getSigners();
  
  const ownerAddress = owner.address;

  // get World contract from address
  const world = ethers.getContractAt("World", "0x5FbDB2315678afecb367f032d93F642f64180aa3");
  const hero = ethers.getContractAt("Hero", "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9");
  const game = ethers.getContractAt("Game", "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853");
  const monsters = ethers.getContractAt("Monsters", "0x923203a3f3Ee6C70A9509eF6D7e96aDBdc916997");

  // create a monster
  const monsterId = 5;
  const tx = await (await monsters).createMonster(monsterId, "Emaciated", 10, 10, 4, 4, 1, 12, "1D2+0.15*STR", 0, 10);


  // move the hero
  // const tx = await (await hero).tokenURI(BigInt(1))
  // console.log("res",tx);
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

  console.log("Hero navigation complete.");
}

// Exécutez le script
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
