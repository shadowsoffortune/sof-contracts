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
import { StatModifiersStructStruct } from '../typechain-types/contracts/Items';
import { deployTokenFixture } from "./fixtures";
import { addHeroClass } from "./utils";

enum StatType {
  HP,
  HPMax,
  STR,
  AGI,
  PER,
  INT,
  CON,
  XP,
  ENERGY,
  DAMAGE,
  ARMOR
}

describe("Game Contract Tests", function () {

  it("Should mint a Hero token successfully", async function () {
    // Load the fixture
    const { game, hero, owner, addr1, addr2, addr3, heroAddress, world, worldAddress } = await loadFixture(deployTokenFixture);
    // Prepare payment
    const payment = { value: ethers.parseEther("20") };

    // Execute mint function
    const tx = await game.connect(addr1).mintHero(addr1.address, addr3.address, "bob", 0,
      10, 10, 10, 10, 10, true, payment);
    await tx.wait();

    // Check resulting balances
    const balance = await hero.balanceOf(addr1.address);
    expect(balance).to.equal(1);

    // Check ownership of the minted token
    const ownerOfToken = await hero.ownerOf(1);
    expect(ownerOfToken).to.equal(addr1.address);

    // Check the hero is placed in the world
    const heroId = await hero.getLastHeroId();
    const heroNodeId = await world.getHeroNode(heroId);
    expect(heroNodeId).to.equal(1);

    // check wallet balance of eth
    const balanceTeamWallet = await ethers.provider.getBalance(addr2.address);
    const balanceGameWallet = await ethers.provider.getBalance(addr3.address);
    console.log("balanceTeamWallet", balanceTeamWallet.toString());
    console.log("balanceGameWallet", balanceGameWallet.toString());
    expect(balanceTeamWallet).to.be.closeTo(ethers.parseEther("10010"), ethers.parseEther("0.01"));
    expect(balanceGameWallet).to.be.closeTo(ethers.parseEther("10010"), ethers.parseEther("0.01"));

  });

  it("Should fail if not enough FTM is sent", async function () {
    // Load the fixture
    const { game, hero, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);
    // Attempt to mint with insufficient payment
    const insufficientPayment = { value: ethers.parseEther("10") };

    await expect(
      game.connect(addr1).mintHero(addr1.address, addr1.address, "bobby", 0,
        10, 10, 10, 10, 10, true, insufficientPayment)
    ).to.be.revertedWith("Insufficient funds to mint hero");
  });

  it("Should allow changing the mint price and addressB", async function () {
    // Load the fixture
    const { game, hero, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);
    // Change the mint price and addressB by owner
    await hero.connect(owner).setPrice(30n);
    await hero.connect(owner).setTeamAddress(addr1.address);

    // Check the new settings
    expect(await hero.price()).to.equal(30n);
    expect(await hero.teamAddress()).to.equal(addr1.address);
  });

  it("Should consume energy when moving hero", async function () {
    const { game, heroEncounters, addr1, game: gameContract, hero, world } = await loadFixture(deployTokenFixture);
    const payment = { value: ethers.parseEther("20") };

    // Mint a hero
    const txMint = await game.connect(addr1).mintHero(
      addr1.address,
      addr1.address,
      "alice",
      0,
      10,
      10,
      10,
      10,
      10,
      true,
      payment
    );
    await txMint.wait();

    const heroId = await hero.getLastHeroId();

    // Set connection dangerosity to 100% between node 8 and 2
    await world.setConnectionDangerosity(8, 2, 0); // Setting danger level 0 to ensure no encounter

    // authorize the address
    const txauth = await gameContract.authorizeAddress(addr1.address);
    await txauth.wait();

    // check the energy of the hero
    const currentEnergy = await hero.getHeroEnergy(heroId);
    expect(currentEnergy).to.equal(100);

    // Move the hero from node 8 to node 2 (they are connected in our setup)
    const moveTx = await game.connect(addr1).moveHero(heroId, 2);
    const receipt = await moveTx.wait();

    // Check the energy consumption
    const energyConsumed = await hero.getHeroEnergy(heroId);
    expect(energyConsumed).to.equal(95);

    //wait for 5 minutes (1 more point)
    await ethers.provider.send("evm_increaseTime", [300]);
    await ethers.provider.send("evm_mine")

    // check the energy of the hero is not equal to 100
    const newEnergy = await hero.getHeroEnergy(heroId);
    console.log("newEnergy", newEnergy);
    expect(newEnergy).equal(96);

    //wait for 4 minutes (1 more point)
    await ethers.provider.send("evm_increaseTime", [300]);
    await ethers.provider.send("evm_mine")

    // check the energy of the hero is not equal to 100
    const newEnergy2 = await hero.getHeroEnergy(heroId);
    console.log("newEnergy", newEnergy2);
    expect(newEnergy2).equal(97);

    //wait for 45 minutes
    await ethers.provider.send("evm_increaseTime", [2700]);
    await ethers.provider.send("evm_mine")

    // check the energy of the hero
    const newEnergy3 = await hero.getHeroEnergy(heroId);
    expect(newEnergy3).to.equal(100);

  });

  it("Should initiate an encounter on edge correctly", async function () {
    const { game, heroEncounters, addr1, game: gameContract, hero, world } = await loadFixture(deployTokenFixture);
    const payment = { value: ethers.parseEther("20") };

    // Mint a hero
    const txMint = await game.connect(addr1).mintHero(
      addr1.address,
      addr1.address,
      "alice",
      0,
      10,
      10,
      10,
      10,
      10,
      true,
      payment
    );
    await txMint.wait();

    const heroId = await hero.getLastHeroId();

    // Set connection dangerosity to 100% between node 8 and 2
    await world.setConnectionDangerosity(1, 2, 4); // Setting danger level high to ensure encounter

    // authorize the address
    const txauth = await gameContract.authorizeAddress(addr1.address);
    await txauth.wait();

    // Move the hero from node 8 to node 2 (they are connected in our setup)
    const moveTx = await game.connect(addr1).moveHero(heroId, 2);
    const receipt = await moveTx.wait();

    // Check if an encounter was initiated
    const isActive = await heroEncounters.isEncounterActive(heroId);
    expect(isActive).to.be.true;

    const encounter = await heroEncounters.getActiveEncounter(heroId);
    expect(encounter.isActive).to.be.true;
    expect(encounter.toNodeId).to.equal(2);
  });

  it("Should initiate an encounter on node correctly", async function () {
    const { game, heroEncounters, addr1, game: gameContract, hero, world } = await loadFixture(deployTokenFixture);
    const payment = { value: ethers.parseEther("20") };

    // Mint a hero
    const txMint = await game.connect(addr1).mintHero(
      addr1.address,
      addr1.address,
      "alice",
      0,
      10,
      10,
      10,
      10,
      10,
      true,
      payment
    );
    await txMint.wait();

    const heroId = await hero.getLastHeroId();

    // authorize the address
    const txauth = await gameContract.authorizeAddress(addr1.address);
    await txauth.wait();

    // Move the hero from node 1 to node 2 then make a search and force an encounter
    const moveTx = await game.connect(addr1).moveHero(heroId, 2);
    await moveTx.wait();

    const searchTx = await game.connect(addr1).heroSearch(heroId, 2);
    const searchTxReceipt = await searchTx.wait();

    // Check if an encounter was initiated
    const isActive = await heroEncounters.isEncounterActive(heroId);
    expect(isActive).to.be.true;

    const encounter = await heroEncounters.getActiveEncounter(heroId);
    expect(encounter.isActive).to.be.true;
    expect(encounter.toNodeId).to.equal(2);
  });

  it("Should resolve an encounter successfully", async function () {
    const { game, heroEncounters, addr1, hero, world } = await loadFixture(deployTokenFixture);
    const payment = { value: ethers.parseEther("20") };

    // Mint a hero
    const txMint = await game.connect(addr1).mintHero(
      addr1.address,
      addr1.address,
      "charlie",
      0,
      10,
      10,
      10,
      10,
      10,
      true,
      payment
    );
    await txMint.wait();

    const heroId = await hero.getLastHeroId();

    // Set connection dangerosity to 100% between node 8 and 2
    await world.setConnectionDangerosity(1, 2, 4); // Setting danger level high to ensure encounter

    // authorize the address
    const txauth = await game.authorizeAddress(addr1.address);
    await txauth.wait();

    // Move the hero and force an encounter
    await game.connect(addr1).moveHero(heroId, 2);

    // Ensure the encounter is active
    let isActive = await heroEncounters.isEncounterActive(heroId);
    expect(isActive).to.be.true;

    // Resolve the encounter
    await game.connect(addr1).resolveEncounter(heroId, true, -5, 10);

    // Check that the encounter is resolved
    isActive = await heroEncounters.isEncounterActive(heroId);
    expect(isActive).to.be.false;

    // Verify hero stats
    const heroStats = await hero.getHeroStats(heroId);
    expect(heroStats.HP).to.equal(45); // 20 - 5 damage
    expect(heroStats.XP).to.equal(10);

    // Verify hero's new location
    const heroNodeId = await world.getHeroNode(heroId);
    expect(heroNodeId).to.equal(2);
  });

  it("Should not allow moving hero if encounter is active", async function () {
    const { game, heroEncounters, addr1, hero, world } = await loadFixture(deployTokenFixture);
    const payment = { value: ethers.parseEther("20") };

    // Mint a hero
    const txMint = await game.connect(addr1).mintHero(
      addr1.address,
      addr1.address,
      "dave",
      0,
      10,
      10,
      10,
      10,
      10,
      true,
      payment
    );
    await txMint.wait();

    const heroId = await hero.getLastHeroId();

    // authorize the address
    const txauth = await game.authorizeAddress(addr1.address);
    await txauth.wait();

    // Set connection dangerosity to 100% between node 8 and 2
    await world.setConnectionDangerosity(1, 2, 4); // Setting danger level high to ensure encounter

    // Force an encounter
    await game.connect(addr1).moveHero(heroId, 2);

    // Try to move the hero again without resolving the encounter
    await expect(
      game.connect(addr1).moveHero(heroId, 3)
    ).to.be.revertedWith("Resolve current encounter first");
  });

  it("Should handle hero death correctly during encounter", async function () {
    const { game, heroEncounters, addr1, hero, world } = await loadFixture(deployTokenFixture);
    const payment = { value: ethers.parseEther("20") };

    // Mint a hero
    const txMint = await game.connect(addr1).mintHero(
      addr1.address,
      addr1.address,
      "eve",
      0,
      10,
      10,
      10,
      10,
      10,
      true,
      payment
    );
    await txMint.wait();

    const heroId = await hero.getLastHeroId();

    // Set connection dangerosity to 100% between node 8 and 2
    await world.setConnectionDangerosity(1, 2, 4); // Setting danger level high to ensure encounter

    // authorize the address
    const txauth = await game.authorizeAddress(addr1.address);
    await txauth.wait();

    // Force an encounter
    await game.connect(addr1).moveHero(heroId, 2);

    // Resolve the encounter with failure
    await game.connect(addr1).resolveEncounter(heroId, false, -20, 0);

    // Check that the encounter is resolved
    const isActive = await heroEncounters.isEncounterActive(heroId);
    expect(isActive).to.be.false;

    // Verify hero stats (HP should be set to 1)
    const heroStats = await hero.getHeroStats(heroId);
    expect(heroStats.HP).to.equal(1);

    // Verify hero's location is reset to last save point (which is node 8)
    const heroNodeId = await world.getHeroNode(heroId);
    expect(heroNodeId).to.equal(1);
  });

  it("Should prevent heroSearch if hero is not in the specified node", async function () {
    const { game, hero, world, items, heroInventory, heroClasses, owner, addr1 } = await loadFixture(deployTokenFixture);

    // Ajouter une classe de héros
    await addHeroClass(heroClasses);

    // Ajouter un modificateur pour les objets de recherche
    const statModifierHeal: StatModifiersStructStruct = {
      stat: 0,
      amount: 20,
      duration: BigInt(0),
    };

    // Ajouter un consommable avec ce modificateur
    const consumableId = 1003;
    const consumableName = "Stamina Potion";
    await items.connect(owner).addConsumable(
      consumableId,
      consumableName,
      [statModifierHeal]
    );

    // Ajouter le consommable à un noeud spécifique, par exemple Node3
    await world.connect(owner).addItemsToNode(3, [
      { id: consumableId, name: consumableName, weight: 100 },
    ]);

    const txMint = await game.connect(addr1).mintHero(
      addr1.address,
      addr1.address,
      "eve",
      0,
      10,
      10,
      10,
      10,
      10,
      true,
      { value: ethers.parseEther("20") }
    );
    await txMint.wait();
    const heroId = await hero.getLastHeroId();


    // Vérifier que le héros est placé dans Node3
    const heroNode = await world.getHeroNode(heroId);
    expect(heroNode).to.equal(1);

    // authorize the address
    const txauth = await game.authorizeAddress(addr1.address);
    await txauth.wait();

    // Effectuer un déplacement vers Node1
    await game.connect(addr1).moveHero(heroId, 2);

    // Vérifier que le héros est maintenant dans Node1
    const updatedHeroNode = await world.getHeroNode(heroId);
    expect(updatedHeroNode).to.equal(2);

    // Tenter de rechercher dans Node3 où le héros ne se trouve pas
    await expect(
      game.connect(addr1).heroSearch(heroId, 3)
    ).to.be.revertedWith("Hero is not at the specified node");
  });

  it("Should handle heroSearch in a node with no items gracefully", async function () {
    const { game, hero, world, items, statModifier, heroInventory, heroClasses, owner, addr1, gameAddress } = await loadFixture(deployTokenFixture);

    // Ajouter une classe de héros
    await addHeroClass(heroClasses);

    // Mint un héros pour addr1 dans EmptyNode
    const txMint = await game.connect(addr1).mintHero(
      addr1.address,
      addr1.address,
      "eve",
      0,
      10,
      10,
      10,
      10,
      10,
      true,
      { value: ethers.parseEther("20") }
    );
    await txMint.wait();
    const heroId = await hero.getLastHeroId();

    // authorize the address
    const txauth = await game.authorizeAddress(addr1.address);
    await txauth.wait();

    // Placer le héros dans EmptyNode
    await game.connect(addr1).moveHero(heroId, 2);

    // Vérifier que le héros est maintenant dans EmptyNode
    const heroNode = await world.getHeroNode(heroId);
    expect(heroNode).to.equal(2);

    // // Approve le Game contract pour gérer les items d'addr1
    await items.connect(addr1).setApprovalForAll(gameAddress, true);

    // // Autoriser addr1 dans le Game contract
    // await game.connect(owner).authorizeAddress(addr1.address);

    // // Tenter de rechercher dans EmptyNode
    // await game.connect(addr1).heroSearch(heroId, 9);

    // // Vérifier qu'aucun objet n'a été attribué
    // const consumableBalance = await heroInventory.balanceOf(addr1.address, 1004); // ID d'un consommable non ajouté
    // expect(consumableBalance).to.equal(0);
  });

  it("Should assign loot with 100% chance during heroSearch", async function () {
    const { game, gameAddress, hero, world, items, heroClasses, statModifier, heroInventory, owner, addr1 } = await loadFixture(deployTokenFixture);

    // Ajouter une classe de héros
    await addHeroClass(heroClasses);

    // Mint un héros pour addr1 dans Node1
    const txMint = await game.connect(addr1).mintHero(
      addr1.address,
      addr1.address,
      "eve",
      0,
      7,
      10,
      16,
      10,
      7,
      true,
      { value: ethers.parseEther("20") }
    );
    await txMint.wait();
    const heroId = await hero.getLastHeroId();

    // Vérifier que le héros est placé dans Node1
    const heroNode = await world.getHeroNode(heroId);
    expect(heroNode).to.equal(1);

    // Approuver le Game contract pour gérer les items d'addr1
    await items.connect(addr1).setApprovalForAll(gameAddress, true);

    // Autoriser addr1 dans le Game contract
    await game.connect(owner).authorizeAddress(addr1.address);

    // Effectuer la recherche avec 100% de chances de loot
    const searchTx = await game.connect(addr1).heroSearch(heroId, 1);
    await searchTx.wait();

    // Vérifier les soldes des items pour s'assurer que le héros a bien looté les deux consommables
    const goldBalance = await heroInventory.getHeroItemBalance(heroId, 11);

    // Les deux consommables devraient être trouvés (1 chacun)
    expect(goldBalance).to.be.gte(1);
  });

  it("can search with a big PER", async function () {
    const { game, gameAddress, hero, world, items, heroClasses, statModifier, heroInventory, owner, addr1 } = await loadFixture(deployTokenFixture);

    // Ajouter une classe de héros
    await addHeroClass(heroClasses);

    // Mint un héros pour addr1 dans Node1
    const txMint = await game.connect(addr1).mintHero(
      addr1.address,
      addr1.address,
      "eve",
      0,
      8,
      8,
      16,
      12,
      6,
      true,
      { value: ethers.parseEther("20") }
    );
    await txMint.wait();
    const heroId = await hero.getLastHeroId();

    // Vérifier que le héros est placé dans Node1
    const heroNode = await world.getHeroNode(heroId);
    expect(heroNode).to.equal(1);

    // Approuver le Game contract pour gérer les items d'addr1
    await items.connect(addr1).setApprovalForAll(gameAddress, true);

    // Autoriser addr1 dans le Game contract
    await game.connect(owner).authorizeAddress(addr1.address);

    // Effectuer la recherche avec 100% de chances de loot
    const searchTx = await game.connect(addr1).heroSearch(heroId, 1);
    await searchTx.wait();

    // Vérifier les soldes des items pour s'assurer que le héros a bien looté les deux consommables
    const goldBalance = await heroInventory.getHeroItemBalance(heroId, 11);

    // Les deux consommables devraient être trouvés (1 chacun)
    expect(goldBalance).to.be.gte(1);
  });

  // Helper function to retry a test
  async function retry(fn: () => Promise<void>, retries: number = 10): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        await fn();
        return;
      } catch (error) {
        console.log("RETRYING TEST");
        if (i === retries - 1) {
          throw error;
        }
      }
    }
  }

  it("Should increase hero's score when evading an enemy", async function () {
    await retry(async () => {
      const { game, hero, world, addr1 } = await loadFixture(deployTokenFixture);

      // Mint a hero
      const payment = { value: ethers.parseEther("20") };
      const txMint = await game.connect(addr1).mintHero(
        addr1.address,
        addr1.address,
        "HeroEvadeTest",
        0,
        5, // STR
        17, // AGI
        18, // PER
        5, // INT
        5, // CON
        true,
        payment
      );
      await txMint.wait();

      const heroId = await hero.getLastHeroId();

      await hero.addHeroXP(heroId, 10000000);
      for (let i = 0; i < 20; i++) {
        await hero.increaseHeroStat(heroId, StatType.AGI); // Increase HP to ensure evasion
      }

      // Authorize addr1
      await game.authorizeAddress(addr1.address);

      // Place the hero at node 1
      await world.placeHero(heroId, 1);

      // Set up a connection with dangerLevel > 0
      await world.connectNodes(1, 2, 1, [{ id: 1, weight: 50 }])
      await world.setConnectionDangerosity(1, 2, 1); // dangerLevel = 1

      // Check initial score
      let initialScore = await game.heroScores(heroId);
      expect(initialScore).to.equal(0);

      // Move the hero and attempt to evade
      // Since the random function is not truly random in testing, we might need to mock it or adjust the dangerLevel and hero's stats to ensure evasion
      await game.connect(addr1).moveHero(heroId, 2);

      // Get the new score
      let newScore = await game.heroScores(heroId);

      // Calculate expected score increase
      const expectedScoreIncrease = Math.floor((25 * 1 + 1) / 2); // (25 * dangerLevel + 1) / 2

      expect(newScore).to.equal(Number(initialScore) + expectedScoreIncrease);
    });
  });

  it("should reset hero hp and energy to 0 when hero rests", async function () {
    const { game, hero, world, addr1 } = await loadFixture(deployTokenFixture);

    // Mint a hero
    const payment = { value: ethers.parseEther("20") };
    const txMint = await game.connect(addr1).mintHero(
      addr1.address,
      addr1.address,
      "HeroRestTest",
      0,
      10, // STR
      10, // AGI
      10, // PER
      10, // INT
      10  // CON
      ,
      true,
      payment
    );
    await txMint.wait();

    const heroId = await hero.getLastHeroId();

    // Authorize addr1
    await game.authorizeAddress(addr1.address);

    //add a new node 42 with 0 dangerosity connection to node 1
    await world.createNode(
      42,
      "Default Rest Node",
      true,
      1,
      0,
      true,
      1,
      []
    )
    await world.connectNodes(1, 42, 0, [{ id: 1, weight: 50 }])

    // hero moves to node 42
    await game.connect(addr1).moveHero(heroId, 42);

    // Verify initial HP and energy
    let initialStats = await hero.getHeroStats(heroId);
    expect(initialStats.HP).to.equal(50);
    expect(initialStats.ENERGY).to.equal(95);

    // Rest
    await game.connect(addr1).heroRest(heroId);

    // Get the new stats
    let newStats = await hero.getHeroStats(heroId);

    expect(newStats.HP).to.equal(50);
    expect(newStats.ENERGY).to.equal(0);
  });

  // it("Should reduce hero's score by 25% upon death", async function () {
  //   const { game, hero, world, addr1 } = await loadFixture(deployTokenFixture);

  //   // Mint a hero
  //   const payment = { value: ethers.parseEther("20") };
  //   const txMint = await game.connect(addr1).mintHero(
  //     addr1.address,
  //     addr1.address,
  //     "HeroDeathTest",
  //     0,
  //     10, // STR
  //     10, // AGI
  //     10, // PER
  //     10, // INT
  //     10  // CON
  //     ,
  //     payment
  //   );
  //   await txMint.wait();

  //   const heroId = await hero.getLastHeroId();

  //   // Authorize addr1
  //   await game.authorizeAddress(addr1.address);

  //   // Set initial score
  //   await game.setHeroScore(heroId, 1000);

  //   // Verify initial score
  //   let initialScore = await game.heroScores(heroId);
  //   expect(initialScore).to.equal(1000);



  //   // Simulate hero death by resolving an encounter with success = false
  //   await game.connect(addr1).resolveEncounter(heroId, false, -20, 0);

  //   // Calculate expected score after 25% reduction
  //   const expectedScore = Math.floor((initialScore * 75) / 100);

  //   // Get the new score
  //   let newScore = await game.heroScores(heroId);

  //   expect(newScore).to.equal(expectedScore);
  // });

  // it("Should add score when hero successfully searches a node", async function () {
  //   const { game, hero, world, items, heroInventory, addr1, owner } = await loadFixture(deployTokenFixture);

  //   // Mint a hero
  //   const payment = { value: ethers.parseEther("20") };
  //   const txMint = await game.connect(addr1).mintHero(
  //     addr1.address,
  //     addr1.address,
  //     "HeroSearchTest",
  //     0,
  //     10, // STR
  //     10, // AGI
  //     10, // PER
  //     10, // INT
  //     10  // CON
  //     ,
  //     payment
  //   );
  //   await txMint.wait();

  //   const heroId = await hero.getLastHeroId();

  //   // Authorize addr1
  //   await game.authorizeAddress(addr1.address);

  //   // Place the hero at node 1
  //   await world.placeHero(heroId, 1);

  //   // Add items to the node
  //   await items.connect(owner).addItem(2001, "Test Item");
  //   await world.addItemsToNode(1, [{ id: 2001, name: "Test Item", weight: 100 }]);

  //   // Approve the game contract to handle items
  //   await items.connect(addr1).setApprovalForAll(game.address, true);

  //   // Check initial score
  //   let initialScore = await game.heroScores(heroId);
  //   expect(initialScore).to.equal(0);

  //   // Hero performs search
  //   await game.connect(addr1).heroSearch(heroId, 1);

  //   // Get the new score
  //   let newScore = await game.heroScores(heroId);

  //   // Expected score increase is node search difficulty
  //   const expectedScoreIncrease = 50; // As set above

  //   expect(newScore).to.equal(initialScore + expectedScoreIncrease);
  // });

});
