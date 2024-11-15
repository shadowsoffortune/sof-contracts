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

  // deploy World contract
  const World = await ethers.getContractFactory("World");
  const world = await World.deploy();
  await world.waitForDeployment();
  const worldAddress = await world.getAddress();
  console.log("Deployed World contract at:", worldAddress);

  // Deploy Hero contract with initial parameters
  const Hero = await ethers.getContractFactory("Hero");
  const hero = await Hero.deploy("http://localhost:3000/api/metadata/", ownerAddress, ethers.parseEther("20"));
  await hero.waitForDeployment();
  const heroAddress = await hero.getAddress();
  console.log("Deployed Hero contract at:", heroAddress);

  // Deploy Hero contract with initial parameters
  const Game = await ethers.getContractFactory("Game");
  const game = await Game.deploy(heroAddress, worldAddress, { from: ownerAddress });
  await game.waitForDeployment();
  const gameAddress = await game.getAddress();
  console.log("Deployed Game contract at:", gameAddress);

  console.log("NEXT_PUBLIC_GAME_ADDRESS=", gameAddress);
  console.log("NEXT_PUBLIC_WORLD_ADDRESS=", worldAddress);
  console.log("NEXT_PUBLIC_HERO_ADDRESS=", heroAddress);

  // set the game address in the world and hero contract
  await world.setGameAddress(gameAddress);
  await hero.setGameAddress(gameAddress);


  const tx1 = await world.createNode("Maison 1");
  const receipt1 = await tx1.wait();
  const node1 = await world.getLastNodeId();


  const tx2 = await world.createNode("Maison 2");
  const receipt2 = await tx2.wait();
  const node2 = await world.getLastNodeId();

  const tx3 = await world.createNode("Maison 3");
  const receipt3 = await tx3.wait();
  const node3 = await world.getLastNodeId();


  console.log("Node 1 ID:", node1);
  console.log("Node 2 ID:", node2);
  console.log("Node 3 ID:", node3);

  // connect nodes together
  console.log("Connecting nodes together");
  await world.connectNodes(node1, node2);
  await world.connectNodes(node2, node3);

  // Mint a Hero NFT
  console.log("Minting 2 Hero NFT");
  const mintTx = await hero.mint(ownerAddress,);
  const mintReceipt = await mintTx.wait();

  // get hero token URI
  const tokenURI = await hero.tokenURI(0);
  console.log("Hero token URI:", tokenURI);

  const mintTx2 = await hero.mint(ownerAddress);
  const mintReceipt2 = await mintTx2.wait();

  const heroId = await hero.getLastHeroId();

  console.log("Minted Hero NFT with ID:", heroId.toString());

  // Check the balance of the owner
  console.log("Checking the balance of the owner");
  const balance = await hero.balanceOf(ownerAddress);
  console.log("Owner has ", balance.toString(), " Hero NFTs");

  // Check the token ids of the owner
  console.log("Checking the token ids of the owner");
  const tokenIds = await hero.tokensOfOwner(ownerAddress);
  console.log("Owner has the following token ids : ", tokenIds);

  // place hero in the world
  console.log("Placing hero in the world");
  const tx = await world.placeHero(heroId, node1);
  const receipt = await tx.wait();

  // get hero location
  console.log("Getting hero location");
  const location1 = await world.getHeroNode(heroId);
  console.log("Hero is in node : ", location1);
  console.log("Name of the node : ", await world.getNodeName(location1));

  // move hero in the world
  console.log("Moving hero in the world");
  await world.moveHero(heroId, node2);

  // get hero location
  console.log("Getting hero location");
  const location2 = await world.getHeroNode(heroId);
  console.log("Hero is in node : ", location2);
  console.log("Name of the node : ", await world.getNodeName(location2));


  // Vérification du contrat
  //   try {
  //     await hre.run("verify:verify", {
  //         address: characterAddress,
  //         constructorArguments: [],
  //     });

  // } catch (error) {
  //     console.log("Error verifying contract : ", error);
  // }


}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
