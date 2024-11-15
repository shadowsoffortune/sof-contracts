import { expect } from "chai";
import { ethers } from "hardhat";
import { deployTokenFixture } from "./fixtures";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { mintHero } from "./utils"; // Import the mintHero function

describe("World Contract Tests - Cooldown Functionality", function () {
  // Load the fixture to deploy contracts
  async function deployContracts() {
    const {
      game,
      hero,
      owner,
      addr1,
      addr2,
      addr3,
      world,
      items,
      statModifier,
      heroInventory,
      heroClasses,
    } = await loadFixture(deployTokenFixture);

    return {
      game,
      hero,
      owner,
      addr1,
      addr2,
      addr3,
      world,
      items,
      statModifier,
      heroInventory,
      heroClasses,
    };
  }

  it("Should use default cooldown period when none is specified", async function () {
    const { world, owner } = await deployContracts();

    // Créer un nœud sans spécifier de cooldownPeriod
    await expect(
      world.connect(owner).createNode(
        1001,
        "Default Cooldown Node",
        true,
        1,
        0, // Pas de cooldownPeriod spécifié,
        false
      )
    ).to.emit(world, "NodeCreated");

    const node = await world.getNode(1001);
    expect(node.cooldownPeriod).to.equal(6 * 3600); // 6 heures par défaut
  });

  it("Should set cooldown when a hero searches a node", async function () {
    const { game, hero, owner, addr1, world } = await deployContracts();

    // Use node 1
    const nodeId = 1;

    // Get the node details
    const node = await world.getNode(nodeId);
    const cooldownPeriod = node.cooldownPeriod;

    // Create a hero using the mintHero function
    const heroName = "Test Hero";
    const classIndex = 0;

    const heroId = await mintHero(addr1, game, hero, heroName, classIndex);

    // Authorize addr1 to call heroSearch
    await game.connect(owner).authorizeAddress(addr1.address);

    // Hero searches the node
    await game.connect(addr1).heroSearch(heroId, nodeId);

    // Check that the cooldown is set
    const lastSearchTime = await world.heroNodeLastSearchTime(heroId, nodeId);
    expect(lastSearchTime).to.be.gt(0);

    // Try to search again immediately, should fail
    await expect(
      game.connect(addr1).heroSearch(heroId, nodeId)
    ).to.be.revertedWith("Node is in cooldown for this hero");

    // Fast forward time
    await time.increase(Number(cooldownPeriod) + 1);

    // Try to search again, should succeed
    await game.connect(addr1).heroSearch(heroId, nodeId);

    // Check that last search time is updated
    const newLastSearchTime = await world.heroNodeLastSearchTime(heroId, nodeId);
    expect(newLastSearchTime).to.be.gt(lastSearchTime);
  });

  it("Should prevent searching the same node before cooldown expires", async function () {
    const { game, hero, owner, addr1, world } = await deployContracts();

    const nodeId = 1;

    // Get the node details
    const node = await world.getNode(nodeId);
    const cooldownPeriod = node.cooldownPeriod;

    // Create a hero using the mintHero function
    const heroName = "Test Hero 2";
    const classIndex = 0;

    const heroId = await mintHero(addr1, game, hero, heroName, classIndex);

    // Authorize addr1
    await game.connect(owner).authorizeAddress(addr1.address);

    // Hero searches the node
    await game.connect(addr1).heroSearch(heroId, nodeId);

    // Attempt to search again immediately
    await expect(
      game.connect(addr1).heroSearch(heroId, nodeId)
    ).to.be.revertedWith("Node is in cooldown for this hero");

    // Check the remaining cooldown time
    const timeUntilNextSearch = await world.getTimeUntilNextSearch(heroId, nodeId);
    expect(timeUntilNextSearch).to.be.gt(0);

  });

  it("Should allow hero to search other nodes not in cooldown and search the same node after cooldown expires", async function () {
    const { game, hero, owner, addr1, world } = await deployContracts();

    const nodeId1 = 1;
    const nodeId2 = 2;

    // Create a hero using the mintHero function
    const heroName = "Test Hero 3";
    const classIndex = 0;

    const heroId = await mintHero(addr1, game, hero, heroName, classIndex);

    // Authorize addr1
    await game.connect(owner).authorizeAddress(addr1.address);

    // Move hero to node 2
    await game.connect(addr1).moveHero(heroId, nodeId2);

    // Hero searches node 2
    await game.connect(addr1).heroSearch(heroId, nodeId2);

    // Hero tries to search node 2 again, should fail
    await expect(
      game.connect(addr1).heroSearch(heroId, nodeId2)
    ).to.be.revertedWith("Node is in cooldown for this hero");

    // Hero can still search node 1
    await game.connect(addr1).moveHero(heroId, nodeId1);
    await game.connect(addr1).heroSearch(heroId, nodeId1);
  });

  it("Cooldown should be per hero per node", async function () {
    const { game, hero, owner, addr1, addr2, world } = await deployContracts();

    const nodeId = 1;

    // Create two heroes using the mintHero function
    const heroName1 = "Test Hero 4";
    const heroName2 = "Test Hero 5";
    const classIndex = 0;

    const heroId1 = await mintHero(addr1, game, hero, heroName1, classIndex);
    const heroId2 = await mintHero(addr2, game, hero, heroName2, classIndex);

    // Authorize addr1 and addr2
    await game.connect(owner).authorizeAddress(addr1.address);
    await game.connect(owner).authorizeAddress(addr2.address);

    // Both heroes are at node 1

    // Hero 1 searches node 1
    await game.connect(addr1).heroSearch(heroId1, nodeId);

    // Hero 2 can still search node 1
    await game.connect(addr2).heroSearch(heroId2, nodeId);

    // Hero 1 cannot search node 1 again before cooldown
    await expect(
      game.connect(addr1).heroSearch(heroId1, nodeId)
    ).to.be.revertedWith("Node is in cooldown for this hero");

    // Hero 2 cannot search node 1 again before cooldown
    await expect(
      game.connect(addr2).heroSearch(heroId2, nodeId)
    ).to.be.revertedWith("Node is in cooldown for this hero");

    // Fast forward time
    const node = await world.getNode(nodeId);
    const cooldownPeriod = node.cooldownPeriod;
    await time.increase(Number(cooldownPeriod) + 1);

    // Both heroes can search again
    await game.connect(addr1).heroSearch(heroId1, nodeId);
    await game.connect(addr2).heroSearch(heroId2, nodeId);
  });

  it("getNodesInCooldown should return correct nodes", async function () {
    const { game, hero, owner, addr1, world } = await deployContracts();

    const nodeId1 = 1;
    const nodeId2 = 2;

    // Create a hero using the mintHero function
    const heroName = "Test Hero 6";
    const classIndex = 0;

    const heroId = await mintHero(addr1, game, hero, heroName, classIndex);

    // Authorize addr1
    await game.connect(owner).authorizeAddress(addr1.address);

    // Move hero to node 2
    await game.connect(addr1).moveHero(heroId, nodeId2);

    // Hero searches node 2
    await game.connect(addr1).heroSearch(heroId, nodeId2);

    // Get nodes in cooldown
    const nodesInCooldown = await world.getNodesInCooldown(heroId);
    expect(nodesInCooldown.length).to.equal(1);
    expect(nodesInCooldown[0]).to.equal(nodeId2);

    // Move hero back to node 1
    await game.connect(addr1).moveHero(heroId, nodeId1);

    // Hero searches node 1
    await game.connect(addr1).heroSearch(heroId, nodeId1);

    // Get nodes in cooldown
    const nodesInCooldown2 = await world.getNodesInCooldown(heroId);
    expect(nodesInCooldown2.length).to.equal(2);
    expect(nodesInCooldown2).to.include(BigInt(nodeId1));
    expect(nodesInCooldown2).to.include(BigInt(nodeId2));

    // Fast forward time
    const node = await world.getNode(nodeId1);
    const cooldownPeriod = node.cooldownPeriod;
    await time.increase(Number(cooldownPeriod) + 1);

    // Get nodes in cooldown
    const nodesInCooldown3 = await world.getNodesInCooldown(heroId);
    expect(nodesInCooldown3.length).to.equal(0);
  });

  it("Cooldown functions correctly after cooldown period has passed", async function () {
    const { game, hero, owner, addr1, world } = await deployContracts();

    const nodeId = 1;

    // Create a hero using the mintHero function
    const heroName = "Test Hero 7";
    const classIndex = 0;

    const heroId = await mintHero(addr1, game, hero, heroName, classIndex);

    // Authorize addr1
    await game.connect(owner).authorizeAddress(addr1.address);

    // Hero searches node
    await game.connect(addr1).heroSearch(heroId, nodeId);

    // Fast forward time
    const node = await world.getNode(nodeId);
    const cooldownPeriod = node.cooldownPeriod;
    await time.increase(Number(cooldownPeriod) + 1);

    // Hero can search again
    await game.connect(addr1).heroSearch(heroId, nodeId);

    // Verify that last search time is updated
    const lastSearchTime = await world.heroNodeLastSearchTime(heroId, nodeId);
    expect(lastSearchTime).to.be.gt(0);
  });

  it("Should return correct nodes, connections, dangerosities, cooldowns, and last search times for a hero", async function () {
    const { game, hero, owner, addr1, world } = await deployTokenFixture();

    // Utiliser les nœuds déjà créés : Maison 1, Maison 2, et Maison 3
    const nodeId1 = 1; // Maison 1
    const nodeId2 = 2; // Maison 2
    const nodeId3 = 3; // Maison 3

    // Créer un héros
    const heroName = "Test Hero";
    const classIndex = 0;
    const heroId = await mintHero(addr1, game, hero, heroName, classIndex);

    await game.connect(owner).authorizeAddress(addr1.address);

    // Déplacer le héros à Maison 1 (nodeId1)
    await world.connect(owner).placeHero(heroId, nodeId1);

    // Récupérer les informations des nœuds, connexions, dangerosités, cooldowns et dernières recherches
    const result = await world.getAllNodesAndConnectionsForHero(heroId);

    const nodes = result[0]; // Liste des nœuds
    const fromNodeIds = result[1]; // Connexions "de"
    const toNodeIds = result[2]; // Connexions "à"
    const dangerosities = result[3]; // Dangerosités des connexions
    const cooldowns = result[4]; // Cooldowns des nœuds pour ce héros
    const lastSearchTimes = result[5]; // Derniers temps de recherche

    // Vérifier que les nœuds sont bien récupérés
    expect(nodes.length).to.be.at.least(3); // Au moins 3 nœuds doivent être récupérés
    expect(nodes[0].name).to.equal("Maison 0");
    expect(nodes[1].name).to.equal("Maison 1");
    expect(nodes[2].name).to.equal("Maison 2");

    console.log("Nodes: ", nodes);
    console.log("From Node IDs: ", fromNodeIds);
    console.log("To Node IDs: ", toNodeIds);
    console.log("Dangerosities: ", dangerosities);
    console.log("Cooldowns: ", cooldowns);
    console.log("Last Search Times: ", lastSearchTimes);


    // Vérifier que les connexions sont bien récupérées
    expect(fromNodeIds.length).to.equal(18); // Il doit y avoir 2 connexions
    expect(toNodeIds.length).to.equal(18);
    expect(fromNodeIds[0]).to.equal(nodeId1); // Connexion de Maison 1 à Maison 2
    expect(toNodeIds[0]).to.equal(nodeId2);
    expect(fromNodeIds[1]).to.equal(nodeId2); // Connexion de Maison 2 à Maison 3
    expect(toNodeIds[1]).to.equal(nodeId1);

    // Vérifier les dangerosités des connexions
    expect(dangerosities.length).to.equal(18);
    expect(dangerosities[0]).to.equal(0); // Dangerosité entre Maison 1 et Maison 2
    expect(dangerosities[1]).to.equal(0); // Dangerosité entre Maison 2 et Maison 3

    // Vérifier les cooldowns
    expect(cooldowns.length).to.equal(10);
    expect(cooldowns[0]).to.equal(0); // Cooldown de Maison 1
    expect(cooldowns[1]).to.equal(0); // Cooldown de Maison 2
    expect(cooldowns[2]).to.equal(0); // Cooldown de Maison 3

    // Vérifier que le héros n'a pas encore cherché sur aucun nœud (donc les dernières recherches doivent être 0)
    expect(lastSearchTimes.length).to.equal(10);
    expect(lastSearchTimes[0]).to.equal(0);
    expect(lastSearchTimes[1]).to.equal(0);
    expect(lastSearchTimes[2]).to.equal(0);

    // Faire rechercher le héros sur Maison 1 (nodeId1)
    await game.connect(addr1).heroSearch(heroId, nodeId1);

    // Récupérer les informations après la recherche
    const resultAfterSearch = await world.getAllNodesAndConnectionsForHero(heroId);
    console.log("After search: ", resultAfterSearch);
    const newLastSearchTimes = resultAfterSearch[5];

    // Vérifier que le temps de recherche sur Maison 1 a été mis à jour
    expect(newLastSearchTimes[1]).to.be.gt(0); // Le héros a cherché sur Maison 1
    expect(newLastSearchTimes[0]).to.equal(0); // Pas de recherche sur Maison 2
    expect(newLastSearchTimes[2]).to.equal(0); // Pas de recherche sur Maison 3
  });

  it("Should return correct cooldowns for all nodes for a given hero", async function () {
    const { game, hero, owner, addr1, world } = await deployTokenFixture();

    // Utiliser les nœuds existants : Maison 1, Maison 2, et Maison 3
    const nodeId1 = 1; // Maison 1
    const nodeId2 = 2; // Maison 2
    const nodeId3 = 3; // Maison 3

    // Créer un héros
    const heroName = "Test Hero Cooldowns";
    const classIndex = 0;
    const heroId = await mintHero(addr1, game, hero, heroName, classIndex);

    await game.connect(owner).authorizeAddress(addr1.address);


    // Déplacer le héros à Maison 1 (nodeId1)
    await world.connect(owner).placeHero(heroId, nodeId1);

    // Vérifier que les cooldowns du héros sont tous à 0 (car aucune recherche n'a été faite)
    const initialCooldowns = await world.getAllHeroCoolDowns(heroId);
    expect(initialCooldowns.length).to.equal(10); // Vérifier que 10 nœuds existent
    for (let i = 0; i < initialCooldowns.length; i++) {
      expect(initialCooldowns[i]).to.equal(0); // Tous les cooldowns doivent être à 0 initialement
    }

    // Faire rechercher le héros sur Maison 1 (nodeId1)
    await game.connect(addr1).heroSearch(heroId, nodeId1);

    // Récupérer les cooldowns après la recherche
    const cooldownsAfterSearch = await world.getAllHeroCoolDowns(heroId);

    console.log('Cooldowns after search: ', cooldownsAfterSearch);

    // Vérifier que le cooldown du nœud Maison 1 a été mis à jour
    expect(cooldownsAfterSearch[nodeId1]).to.be.gt(0); // Le cooldown sur Maison 1 doit être supérieur à 0

    // Vérifier que les autres nœuds n'ont pas de cooldown
    expect(cooldownsAfterSearch[nodeId2]).to.equal(0); // Pas de recherche sur Maison 2
    expect(cooldownsAfterSearch[nodeId3]).to.equal(0); // Pas de recherche sur Maison 3
  });

  it("Should return correct nodes and remaining cooldown times for a hero", async function () {
    const { game, hero, owner, addr1, world } = await deployTokenFixture();

    // Utiliser les nœuds déjà créés : Maison 1, Maison 2, et Maison 3
    const nodeId1 = 1; // Maison 1
    const nodeId2 = 2; // Maison 2
    const nodeId3 = 3; // Maison 3

    // Créer un héros
    const heroName = "Test Hero Cooldown";
    const classIndex = 0;
    const heroId = await mintHero(addr1, game, hero, heroName, classIndex);

    await game.connect(owner).authorizeAddress(addr1.address);

    // Déplacer le héros à Maison 1 (nodeId1)
    await world.connect(owner).placeHero(heroId, nodeId1);

    // Faire rechercher le héros sur Maison 1 (nodeId1)
    await game.connect(addr1).heroSearch(heroId, nodeId1);

    // Récupérer les nœuds en cooldown et les temps restants
    const [nodeIdsInCooldown, timeLeftInCooldown] = await world.getNodesInCooldownForHero(heroId);

    console.log('Nodes in cooldown: ', nodeIdsInCooldown);
    console.log('Time left in cooldown: ', timeLeftInCooldown);

    // Vérifier que Maison 1 est en cooldown et que le temps restant est supérieur à 0
    expect(nodeIdsInCooldown.length).to.be.greaterThan(0);
    expect(nodeIdsInCooldown[0]).to.equal(nodeId1); // Maison 1 doit être en cooldown
    expect(timeLeftInCooldown[0]).to.be.gt(0); // Le temps restant doit être supérieur à 0

    // Vérifier que Maison 2 et Maison 3 ne sont pas en cooldown
    expect(nodeIdsInCooldown).to.not.include(nodeId2);
    expect(nodeIdsInCooldown).to.not.include(nodeId3);

    // avancer dans le temps
    await time.increase(Number(timeLeftInCooldown[0]) + 1);

    // vérifier que le nœud n'est plus en cooldown
    const [nodeIdsInCooldownAfter, timeLeftInCooldownAfter] = await world.getNodesInCooldownForHero(heroId);
    expect(nodeIdsInCooldownAfter.length).to.equal(0);
    expect(timeLeftInCooldownAfter.length).to.equal(0);
    
});


});
