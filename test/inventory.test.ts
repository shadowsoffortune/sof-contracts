// test_inventory.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployTokenFixture } from "./fixtures";
import { addHeroClass } from "./utils";
import { StatModifiersStructStruct } from '../typechain-types/contracts/Items';
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Inventory Contract Tests", function () {

  it("Should prevent non-owners from adding items to a hero's inventory", async function () {
    const { game, gameAddress, hero, world, items, statModifier, heroInventory, heroClasses, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);

    // Ajouter une classe de héros
    await addHeroClass(heroClasses);

    // Ajouter un modificateur pour les objets de recherche
    const statModifierHeal: StatModifiersStructStruct = {
      stat: 0,
      amount: 20,
      duration: BigInt(0),
    };

    // Ajouter un consommable avec ce modificateur
    const consumableId = 1005;
    const consumableName = "Energy Potion";
    await items.connect(owner).addConsumable(
      consumableId,
      consumableName,
      [statModifierHeal],
    );

    // Ajouter le consommable à un noeud spécifique, par exemple Node1
    await world.connect(owner).addItemsToNode(1, [
      { id: consumableId, name: consumableName, weight: 100 },
    ]);

    // Mint un héros pour addr1 dans Node1
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

    // Vérifier que le héros est placé dans Node1
    const heroNode = await world.getHeroNode(heroId);
    expect(heroNode).to.equal(1);

    // Approve le Game contract pour gérer les items d'addr1
    await items.connect(addr1).setApprovalForAll(gameAddress, true);

    // Autoriser addr1 dans le Game contract
    await game.connect(owner).authorizeAddress(addr1.address);

    await game.connect(owner).authorizeAddress(addr2.address);


    // Tenter d'ajouter des items à partir d'une adresse non propriétaire (addr2)
    await expect(
      game.connect(addr2).addItemsToHero(heroId, consumableId, 1)
    ).to.be.revertedWith("Not the hero owner");
  });

  it("Should prevent adding more items than available in inventory", async function () {
    const { game, gameAddress, hero, world, items, statModifier, heroInventory, heroClasses, owner, addr1 } = await loadFixture(deployTokenFixture);

    // Ajouter une classe de héros
    await addHeroClass(heroClasses);

    // Mint un héros pour addr1 dans Node1
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

    // Vérifier que le héros est placé dans Node1
    const heroNode = await world.getHeroNode(heroId);
    expect(heroNode).to.equal(1);

    // Approve le Game contract pour gérer les items d'addr1
    await items.connect(addr1).setApprovalForAll(gameAddress, true);

    // Autoriser addr1 dans le Game contract
    await game.connect(owner).authorizeAddress(addr1.address);

    // Effectuer une recherche pour obtenir 1 consommable
    await game.connect(addr1).heroSearch(heroId, 1);

    // Vérifier que le héros possède 1 consommable
    const balance = await heroInventory.getHeroItemBalance(heroId, 11);
    expect(balance).to.be.gt(1);

    // Tenter d'ajouter 2 consommables au héros alors qu'il n'en a qu'un
    await expect(
      game.connect(addr1).addItemsToHero(heroId, 11, 2)
    ).to.be.revertedWith("Not the owner of the item");
  });

  it("Should prevent minting items to unauthorized contracts", async function () {
    const { game, gameAddress, hero, world, items, statModifier, heroInventory, heroClasses, owner, addr1 } = await loadFixture(deployTokenFixture);

    // Ajouter une classe de héros
    await addHeroClass(heroClasses);

    // Ajouter un modificateur pour les objets de recherche
    const statModifierHeal: StatModifiersStructStruct = {
      stat: 0,
      amount: 20,
      duration: BigInt(0),
    };

    // Ajouter un consommable avec ce modificateur
    const consumableId = 1007;
    const consumableName = "Agility Potion";
    await items.connect(owner).addConsumable(
      consumableId,
      consumableName,
      [statModifierHeal],
    );

    // Ajouter le consommable à un noeud spécifique, par exemple Node1
    await world.connect(owner).addItemsToNode(1, [
      { id: consumableId, name: consumableName, weight: 100 },
    ]);

    // Mint un héros pour addr1 dans Node1
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

    // Vérifier que le héros est placé dans Node1
    const heroNode = await world.getHeroNode(heroId);
    expect(heroNode).to.equal(1);

    // addr1 tente de mint un objet directement via Items contract sans autorisation
    await expect(
      items.connect(addr1).mint(addr1.address, consumableId, 1)
    ).to.be.revertedWith("Not authorized: Only Game or Owner can perform this action"); // Assuming only owner can mint

    // authorize the address
    const txauth = await game.authorizeAddress(addr1.address);
    await txauth.wait();

    // Tenter de mint via Game contract sans autorisation
    await expect(
      game.connect(addr1).addItemsToHero(heroId, consumableId, 1)
    ).to.be.revertedWith("Not the owner of the item"); // As per the addItemsToHero function
  });

  it("Should increase hero's energy by 10 points when consuming an Energy Potion", async function () {
    const { game, hero, world, items, heroInventory, owner, addr1, heroClasses } = await loadFixture(deployTokenFixture);

    // Ajouter une classe de héros
    await addHeroClass(heroClasses);

    // Ajouter un modificateur pour l'objet consommable qui augmente l'énergie de 10
    const statModifierEnergy: StatModifiersStructStruct = {
      stat: 8, // Assuming 1 represents 'energy' in your contract
      amount: 10, // Amount of energy to increase
      duration: BigInt(0), // Duration is 0 since it’s an instant effect
    };

    // Créer et ajouter un objet consommable qui augmente l'énergie de 10
    const consumableId = 1006;
    const consumableName = "Energy Potion";
    await items.connect(owner).addConsumable(
      consumableId,
      consumableName,
      [statModifierEnergy],
    );

    // Ajouter le consommable à un nœud, par exemple Node1
    await world.connect(owner).addItemsToNode(1, [
      { id: consumableId, name: consumableName, weight: 100 },
    ]);

    // Mint un héros pour addr1
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


    // Placer le héros dans Node1 et lui donner le consommable
    const heroNode = await world.getHeroNode(heroId);
    expect(heroNode).to.equal(1);

    await items
      .connect(owner)
      .mint(heroInventory.getAddress(),consumableId, 1);

    // Add 1 consumables to hero's inventory
    const tx = await heroInventory.connect(owner).addItemToHero(heroId, consumableId, 1);
    await tx.wait();

    // Vérifier que le héros possède 1 Energy Potion dans son inventaire
    const potionBalance = await heroInventory.getHeroItemBalance(heroId, consumableId);
    expect(potionBalance).to.equal(1);

    await hero.connect(owner).changeEnergy(heroId, -20);

    // Obtenir l'énergie actuelle du héros
    const initialEnergy = await hero.getHeroEnergy(heroId);
    console.log("Initial Energy: ", initialEnergy);

    // Consommer l'objet pour augmenter l'énergie
    await game.connect(addr1).heroConsumeItem(heroId, consumableId);

    // Vérifier que l'énergie du héros a augmenté de 10 points
    const updatedEnergy = await hero.getHeroEnergy(heroId);
    expect(updatedEnergy).to.equal(Number(initialEnergy) + 10);
  });
  
  it("Hero can throw an item he owns", async function () {

    const { game, hero, world, items, heroInventory, owner, addr1, heroClasses } = await loadFixture(deployTokenFixture);

    // Ajouter une classe de héros
    await addHeroClass(heroClasses);

    // Mint un héros pour addr1
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

    //add an item to the hero
    await items.connect(owner).mint(heroInventory.getAddress(), 1, 1);

    // Add 1 consumables to hero's inventory
    const tx = await heroInventory.connect(owner).addItemToHero(heroId, 1, 1);
    await tx.wait();

    // Vérifier que le héros possède 1 Energy Potion dans son inventaire
    const potionBalance = await heroInventory.getHeroItemBalance(heroId, 1);

    expect(potionBalance).to.equal(1);

    // jeter l'objet
    await game.connect(addr1).heroThowItems(heroId, 1, 1);

    // Vérifier que le héros ne possède plus l'objet
    const updatedBalance = await heroInventory.getHeroItemBalance(heroId, 1);
    expect(updatedBalance).to.equal(0);

  });

});