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


describe("Items Contract Mint Tests", function () {

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

    await weaponsAndArmors.setInventoryAddress(heroInventoryAddress);

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
    await heroEncounters.setGameAddress(gameAddress);
    await items.setGameAddress(gameAddress);
    await weaponsAndArmors.setGameAddress(gameAddress);


    // init the world with 10 nodes
    for (let i = 0; i < 10; i++) {
      const tx = await world.createNode(i, 'Maison' + i, true, 20, 0, false, 1, []);
      await tx.wait();
    }

    // Créer et mint un héros pour addr1
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

    return { heroEncounters, game, hero, owner, addr1, addr2, addr3, heroAddress, world, worldAddress, heroClasses, heroClassessAddress, monsters, monstersAddress, items, itemsAddress, weaponsAndArmors, weaponsAndArmorsAddress, heroInventory, heroInventoryAddress, gameAddress, heroId };
  }

  it("Should add multiple items using adjusted addItems function", async function () {
    const { items, owner } = await loadFixture(deployTokenFixture);

    // Prepare ItemInput array
    const inputItems = [
      {
        id: 1,
        name: "Test Sword",
        itemType: 0, // ItemType.Weapon
        defense: 0,
        durability: 100,
        damage: "1D6+1",
        damageType: "Physical",
        armorType: 0,
        statModifiers: []
      },
      {
        id: 2,
        name: "Plastron",
        itemType: 1, // ItemType.Armor
        damage: "",
        defense: 5,
        durability: 80,
        damageType: "",
        armorType: 1, // Torso
        statModifiers: []
      },
      {
        id: 3,
        name: "Healing Potion",
        itemType: 2, // ItemType.Consumable
        damage: "",
        defense: 0,
        durability: 0,
        damageType: "",
        armorType: 0,
        statModifiers: []
      }
    ];

    // Call addItems
    await items.connect(owner).addItems(inputItems);

    // Verify items were added

    // Item 1: Weapon
    const item1 = await items.items(1);
    expect(item1.id).to.equal(1);
    expect(item1.name).to.equal("Test Sword");
    expect(item1.itemType).to.equal(0); // Weapon

    const weapon1 = await items.getWeapon(1);
    expect(weapon1.id).to.equal(1);
    expect(weapon1.damage).to.equal("1D6+1");
    expect(weapon1.durability).to.equal(100);
    expect(weapon1.damageType).to.equal("Physical");

    // Item 2: Armor
    const item2 = await items.items(2);
    expect(item2.id).to.equal(2);
    expect(item2.name).to.equal("Plastron");
    expect(item2.itemType).to.equal(1); // Armor

    const armor2Defense = await items.getArmorDefense(2);
    expect(armor2Defense).to.equal(5);

    // Item 3: Consumable
    const item3 = await items.items(3);
    expect(item3.id).to.equal(3);
    expect(item3.name).to.equal("Healing Potion");
    expect(item3.itemType).to.equal(2); // Consumable

    const consumable3 = await items.getConsumable(3);
    expect(consumable3.id).to.equal(3);
    expect(consumable3.statModifiers.length).to.equal(0); // Empty modifierIds for now
  });

  it("Should create an item successfully", async function () {
    const { items, owner } = await loadFixture(deployTokenFixture);

    // Define item details
    const itemId = 1;
    const itemName = "Sword of Testing";
    const description = "A powerful test sword";
    const damage = "1D6+1";
    const durability = 100;
    const damageType = "Physical";

    // Add a weapon item
    await items.connect(owner).addWeapon(
      itemId,
      itemName,
      damage,
      durability,
      damageType
    );

    // Retrieve the item to verify it was added
    const item = await items.items(itemId);
    const weapon = await items.getWeapon(itemId);

    // Assertions
    expect(item.id).to.equal(itemId);
    expect(item.name).to.equal(itemName);
    expect(item.itemType).to.equal(0); // ItemType.Weapon

    expect(weapon.id).to.equal(itemId);
    expect(weapon.damage).to.equal(damage);
    expect(weapon.durability).to.equal(durability);
    expect(weapon.damageType).to.equal(damageType);
  });

  it("Should mint an item successfully", async function () {
    const { items, owner, addr1 } = await loadFixture(deployTokenFixture);

    // Define item details
    const itemId = 2;
    const itemName = "Plastron of Testing";
    const defense = 15;
    const durability = 80;
    const armorType = 1;

    // Add an armor item
    await items.connect(owner).addArmor(
      itemId,
      itemName,
      defense,
      durability,
      armorType
    );

    // Mint the item to addr1
    await items.connect(owner).mint(addr1.address, itemId, 1);

    // Check the balance of addr1 for the item
    const balance = await items.balanceOf(addr1.address, itemId);
    expect(balance).to.equal(1);
  }
  );


  it("Should enforce inventory limit of 12 items per hero", async function () {
    const {
      items,
      hero,
      heroInventory,
      owner,
      addr1,
      game,
      gameAddress,
      heroId
    } = await loadFixture(deployTokenFixture);

    // Prepare ItemInput array and add items to Items contract
    const inputItems = [];
    for (let i = 1; i <= 15; i++) {
      inputItems.push({
        id: i,
        name: `Item ${i}`,
        itemType: 2, // ItemType.Consumable
        damage: "",
        defense: 0,
        durability: 0,
        damageType: "",
        armorType: 0,
        statModifiers: [],
      });
    }
    await items.connect(owner).addItems(inputItems);

    // Mint items to the HeroInventories contract (since it holds the items)
    for (let i = 1; i <= 15; i++) {
      await items
        .connect(owner)
        .mint(heroInventory.getAddress(), i, 1);
    }

    // Set HeroInventory contract as operator for items (if necessary)
    // Not required here as HeroInventory is already holding items

    // Attempt to add 12 items to hero's inventory
    for (let i = 1; i <= 12; i++) {
      await heroInventory
        .connect(owner)
        .addItemToHero(heroId, i, 1); // Should succeed
    }

    // Check that the hero has 12 items
    const totalItems = await heroInventory.getHeroTotalItems(heroId);
    expect(totalItems).to.equal(12);

    // Attempt to add one more item (13th item)
    await expect(
      heroInventory.connect(owner).addItemToHero(heroId, 13, 1)
    ).to.be.revertedWith("Cannot exceed 12 items per hero");

    // Remove an item from hero's inventory
    await heroInventory
      .connect(owner)
      .removeItemsFromHero(heroId, 1, 1); // Remove item with id 1

    // Check that the total items count is now 11
    const totalItemsAfterRemoval = await heroInventory.getHeroTotalItems(
      heroId
    );
    expect(totalItemsAfterRemoval).to.equal(11);

    // Now, attempt to add another item (should succeed as total items are now 11)
    await heroInventory
      .connect(owner)
      .addItemToHero(heroId, 13, 1); // Should succeed

    // Verify total items count is back to 12
    const totalItemsAfterAddition = await heroInventory.getHeroTotalItems(
      heroId
    );
    expect(totalItemsAfterAddition).to.equal(12);

    // Try to add another item (should fail again)
    await expect(
      heroInventory.connect(owner).addItemToHero(heroId, 14, 1)
    ).to.be.revertedWith("Cannot exceed 12 items per hero");

    // Consume a consumable item
    await heroInventory
      .connect(owner)
      .consumeConsumable(heroId, 2); // Consume item with id 2

    // Check that total items count is now 11
    const totalItemsAfterConsumption = await heroInventory.getHeroTotalItems(
      heroId
    );
    expect(totalItemsAfterConsumption).to.equal(11);

    // Attempt to add another item (should succeed)
    await heroInventory
      .connect(owner)
      .addItemToHero(heroId, 14, 1); // Should succeed

    // Verify total items count is back to 12
    const finalTotalItems = await heroInventory.getHeroTotalItems(heroId);
    expect(finalTotalItems).to.equal(12);
  });

  it("Should not allow adding items if total would exceed 12", async function () {
    const { items, hero, heroInventory, owner, addr1, game, gameAddress, heroId } = await loadFixture(
      deployTokenFixture
    );

    // Add a single item to Items contract
    await items.connect(owner).addItems([
      {
        id: 1,
        name: "Item 1",
        itemType: 2, // ItemType.Consumable
        damage: "",
        defense: 0,
        durability: 0,
        damageType: "",
        armorType: 0,
        statModifiers: [],
      },
    ]);

    // Mint 13 units of the item to the HeroInventories contract
    await items
      .connect(owner)
      .mint(heroInventory.getAddress(), 1, 13);

    // Attempt to add 13 units of the item to hero's inventory
    await expect(
      heroInventory.connect(owner).addItemToHero(heroId, 1, 13)
    ).to.be.revertedWith("Cannot exceed 12 items per hero");

    // Add 12 units instead (should succeed)
    await heroInventory.connect(owner).addItemToHero(heroId, 1, 12);

    // Verify total items count is 12
    const totalItems = await heroInventory.getHeroTotalItems(heroId);
    expect(totalItems).to.equal(12);

    // Attempt to add one more unit (should fail)
    await expect(
      heroInventory.connect(owner).addItemToHero(heroId, 1, 1)
    ).to.be.revertedWith("Cannot exceed 12 items per hero");
  });

  it("Should accurately update total items when removing items", async function () {
    const {
      items,
      hero,
      heroInventory,
      owner,
      addr1,
      game,
      gameAddress,
      heroId
    } = await loadFixture(deployTokenFixture);

    // Add items to Items contract
    await items.connect(owner).addItems([
      {
        id: 1,
        name: "Item 1",
        itemType: 2, // Consumable
        damage: "",
        defense: 0,
        durability: 0,
        damageType: "",
        armorType: 0,
        statModifiers: [],
      },
    ]);

    // Mint items to HeroInventories contract
    await items
      .connect(owner)
      .mint(heroInventory.getAddress(), 1, 12);

    // Add 12 items to hero's inventory
    await heroInventory.connect(owner).addItemToHero(heroId, 1, 12);

    // Verify total items count is 12
    let totalItems = await heroInventory.getHeroTotalItems(heroId);
    expect(totalItems).to.equal(12);

    // Remove 5 items from hero's inventory
    await heroInventory.connect(owner).removeItemsFromHero(heroId, 1, 5);

    // Verify total items count is now 7
    totalItems = await heroInventory.getHeroTotalItems(heroId);
    expect(totalItems).to.equal(7);

    // Remove remaining 7 items
    await heroInventory.connect(owner).removeItemsFromHero(heroId, 1, 7);

    // Verify total items count is now 0
    totalItems = await heroInventory.getHeroTotalItems(heroId);
    expect(totalItems).to.equal(0);

    // Attempt to remove items when none are left (should fail)
    await expect(
      heroInventory.connect(owner).removeItemsFromHero(heroId, 1, 1)
    ).to.be.revertedWith("Not enough items to remove");
  });

  it("Should accurately update total items when consuming consumables", async function () {
    const {
      items,
      hero,
      heroInventory,
      owner,
      addr1,
      game,
      gameAddress,
      heroId
    } = await loadFixture(deployTokenFixture);

    // Add consumable item to Items contract
    await items.connect(owner).addItems([
      {
        id: 1,
        name: "Healing Potion",
        itemType: 2, // Consumable
        damage: "",
        defense: 0,
        durability: 0,
        damageType: "",
        armorType: 0,
        statModifiers: [],
      },
    ]);

    // Mark item as consumable (if required by your contract logic)
    // Assuming isConsumable is determined by itemType == 2

    // Mint consumable items to HeroInventories contract
    await items
      .connect(owner)
      .mint(heroInventory.getAddress(), 1, 5);

    // Add 5 consumables to hero's inventory
    await heroInventory.connect(owner).addItemToHero(heroId, 1, 5);

    // Verify total items count is 5
    let totalItems = await heroInventory.getHeroTotalItems(heroId);
    expect(totalItems).to.equal(5);

    // Consume a consumable item
    await heroInventory.connect(owner).consumeConsumable(heroId, 1);

    // Verify total items count is now 4
    totalItems = await heroInventory.getHeroTotalItems(heroId);
    expect(totalItems).to.equal(4);

    // Attempt to consume more than available (should fail when items run out)
    for (let i = 0; i < 4; i++) {
      await heroInventory.connect(owner).consumeConsumable(heroId, 1);
    }

    // Now total items should be 0
    totalItems = await heroInventory.getHeroTotalItems(heroId);
    expect(totalItems).to.equal(0);

    // Attempt to consume when none are left (should fail)
    await expect(
      heroInventory.connect(owner).consumeConsumable(heroId, 1)
    ).to.be.revertedWith("Not enough consumables to consume");
  });

  it("Should equip an item successfully", async function () {
    const {
      items,
      weaponsAndArmors,
      heroInventory,
      owner,
      addr1,
      game,
      heroId,
      gameAddress,
    } = await loadFixture(deployTokenFixture);

    // Prepare ItemInput array and add items to Items contract
    const inputItems = [
      {
        id: 1,
        name: "Test Sword",
        itemType: 0, // ItemType.Weapon
        damage: "",
        defense: 0,
        durability: 100,
        damageType: "Physical",
        armorType: 0,
        statModifiers: [],
      },
      {
        id: 2,
        name: "Test Helmet",
        itemType: 1, // ItemType.Armor
        damage: "",
        defense: 5,
        durability: 80,
        damageType: "",
        armorType: 0, // ArmorType.Head
        statModifiers: [],
      },
    ];
    await weaponsAndArmors.connect(owner).addWeaponType(inputItems[0].id, inputItems[0].name, inputItems[0].damage, inputItems[0].durability, inputItems[0].damageType);
    await weaponsAndArmors.connect(owner).addArmorType(inputItems[1].id, inputItems[1].name, inputItems[1].defense, inputItems[1].durability, inputItems[1].armorType);

    // Mint items to HeroInventories contract
    const weaponUniqueTx = await weaponsAndArmors.connect(owner).mintWeapon(heroInventory.getAddress(), 1);
    const weapon1 = await weaponUniqueTx.wait();
    const armorUniqueIdTx = await weaponsAndArmors.connect(owner).mintArmor(heroInventory.getAddress(), 2);
    const armor1 = await armorUniqueIdTx.wait();
    console.log("ArmorId:", armor1);
    // Add items to hero's inventory
    await heroInventory.connect(owner).addERC721ItemToHero(heroId, 1);
    await heroInventory.connect(owner).addERC721ItemToHero(heroId, 2);

    // Equip the weapon (Test Sword) in Weapon slot
    await game.connect(addr1).heroEquip(heroId, 1, 4); // EquipmentSlot.Weapon

    // Verify that the item is equipped
    const equippedWeapon = await heroInventory.heroEquipment(heroId);
    expect(equippedWeapon.Weapon).to.equal(1);

    // Verify that the item is removed from the inventory
    const itemBalance = await heroInventory.getHeroItemBalance(heroId, 1);
    expect(itemBalance).to.equal(0);

    // Verify total items count decreased
    const totalItems = await heroInventory.getHeroTotalItems(heroId);
    expect(totalItems).to.equal(1); // Only the helmet remains in inventory
  });

  it("Should not equip an item to an occupied slot", async function () {
    const {
      items,
      weaponsAndArmors,
      heroInventory,
      owner,
      game,
      heroId,
    } = await loadFixture(deployTokenFixture);

    // Prepare items
    const inputItems = [
      {
        id: 1,
        name: "Test Sword",
        itemType: 0, // Weapon
        damage: "1D6+1",
        defense: 0,
        durability: 100,
        damageType: "Physical",
        armorType: 0,
        statModifiers: [],
      },
      {
        id: 3,
        name: "Test Axe",
        itemType: 0, // Weapon
        damage: "1D8+0.20*STR",
        defense: 0,
        durability: 90,
        damageType: "Physical",
        armorType: 0,
        statModifiers: [],
      },
    ];

    await weaponsAndArmors.connect(owner).addWeaponType(inputItems[0].id, inputItems[0].name, inputItems[0].damage, inputItems[0].durability, inputItems[0].damageType);
    await weaponsAndArmors.connect(owner).addWeaponType(inputItems[1].id, inputItems[1].name, inputItems[1].damage, inputItems[1].durability, inputItems[1].damageType);

    // Mint items to HeroInventories contract
    const weaponUniqueTx = await weaponsAndArmors.connect(owner).mintWeapon(heroInventory.getAddress(), 1);
    const weapon1 = await weaponUniqueTx.wait();
    const weaponUniqueTx2 = await weaponsAndArmors.connect(owner).mintWeapon(heroInventory.getAddress(), 3);
    const weapon2 = await weaponUniqueTx2.wait();

    // Add items to hero's inventory
    await heroInventory.connect(owner).addERC721ItemToHero(heroId, 1);
    await heroInventory.connect(owner).addERC721ItemToHero(heroId, 2);

    // Equip the first weapon
    await game.connect(addr1).heroEquip(heroId, 1, 4); // EquipmentSlot.Weapon

    // Attempt to equip another weapon in the same slot
    await expect(
      heroInventory.connect(owner).equipItem(heroId, 2, 4) // EquipmentSlot.Weapon
    ).to.be.revertedWith("Slot is already equipped");

    // Unequip the first weapon
    await heroInventory.connect(owner).unequipItem(heroId, 4); // EquipmentSlot.Weapon

    // Now equip the second weapon
    await heroInventory.connect(owner).equipItem(heroId, 2, 4); // EquipmentSlot.Weapon

    // Verify that the second weapon is equipped
    const equippedWeapon = await heroInventory.heroEquipment(heroId);
    expect(equippedWeapon.Weapon).to.equal(2);
  });

  it("Should not equip an incompatible item to a slot", async function () {
    const {
      items,
      weaponsAndArmors,
      heroInventory,
      owner,
      game,
      heroId,
    } = await loadFixture(deployTokenFixture);

    // Prepare items
    const inputItems = [
      {
        id: 2,
        name: "Test Helmet",
        itemType: 1, // Armor
        damage: "",
        defense: 5,
        durability: 80,
        damageType: "",
        armorType: 0, // ArmorType.Head
        statModifiers: [],
      },
    ];
    await weaponsAndArmors.connect(owner).addArmorType(inputItems[0].id, inputItems[0].name, inputItems[0].defense, inputItems[0].durability, inputItems[0].armorType);

    // Mint items to HeroInventories contract
    const weaponUniqueTx = await weaponsAndArmors.connect(owner).mintArmor(heroInventory.getAddress(), 2);
    const weapon1 = await weaponUniqueTx.wait();

    // Add items to hero's inventory
    await heroInventory.connect(owner).addERC721ItemToHero(heroId, 1);

    // Attempt to equip the helmet in the Torso slot
    await expect(
      heroInventory.connect(owner).equipItem(heroId, 1, 1) // EquipmentSlot.Torso
    ).to.be.revertedWith("Item cannot be equipped in this slot");

    // Equip the helmet in the correct slot
    await game.connect(addr1).heroEquip(heroId, 1, 0); // EquipmentSlot.Head

    // Verify that the helmet is equipped
    const equippedArmor = await heroInventory.heroEquipment(heroId);
    expect(equippedArmor.Head).to.equal(1);
  });

  it("Should unequip an item successfully", async function () {
    const {
      items,
      weaponsAndArmors,
      heroInventory,
      hero,
      game,
      owner,
      heroId,
    } = await loadFixture(deployTokenFixture);

    // Prepare items
    const inputItems = [
      {
        id: 1,
        name: "Test Sword",
        itemType: 0, // Weapon
        damage: "1D6+1",
        defense: 0,
        durability: 100,
        damageType: "Physical",
        armorType: 0,
        statModifiers: [],
      },
    ];

    await weaponsAndArmors.connect(owner).addWeaponType(inputItems[0].id, inputItems[0].name, inputItems[0].damage, inputItems[0].durability, inputItems[0].damageType);

    // Mint items to HeroInventories contract
    const weaponUniqueTx = await weaponsAndArmors.connect(owner).mintWeapon(heroInventory.getAddress(), 1);
    const weapon1 = await weaponUniqueTx.wait();

    // Add items to hero's inventory
    await heroInventory.connect(owner).addERC721ItemToHero(heroId, 1);

    // Equip the weapon
    await game.connect(addr1).heroEquip(heroId, 1, 4); // EquipmentSlot.Weapon

    // Verify that the weapon is equipped
    const equippedWeapon = await heroInventory.heroEquipment(heroId);
    expect(equippedWeapon.Weapon).to.equal(1);

    // Vérifiez que le DAMAGE a été mis à jour
    let heroStats = await hero.getHeroStats(heroId);
    expect(heroStats.DAMAGE).to.equal("1D6+1");

    // Unequip the weapon
    await game.connect(addr1).heroUnequip(heroId, 4); // EquipmentSlot.Weapon

    // Verify that the weapon is unequipped
    const updatedEquippedWeapon = await heroInventory.heroEquipment(heroId);
    expect(updatedEquippedWeapon.Weapon).to.equal(0);

    // Vérifiez que le DAMAGE a été réinitialisé ou mis à jour correctement
    heroStats = await hero.getHeroStats(heroId);
    expect(heroStats.DAMAGE).to.equal("1D2+0.15*STR"); // Ajustez selon la logique de votre contrat

    // Verify that the weapon is back in inventory
    const itemBalance = await heroInventory.getHeroTotalItems(heroId);
    expect(itemBalance).to.equal(1);
  });

  it("Should not unequip an item when inventory is full", async function () {
    const {
      items,
      heroInventory,
      weaponsAndArmors,
      hero,
      game,
      owner,
      heroId,
    } = await loadFixture(deployTokenFixture);

    // Prepare items
    const inputItems = [];

    for (let i = 1; i <= 13; i++) {
      inputItems.push({
        id: i,
        name: `Item ${i}`,
        itemType: 0, // Weapon
        damage: "",
        defense: 0,
        durability: 0,
        damageType: "",
        armorType: 0,
        statModifiers: [],
      });
    }
    for (let i = 0; i <= 12; i++) {
      console.log("Adding item", i);
      console.log(inputItems[i]);
      await weaponsAndArmors.connect(owner).addWeaponType(inputItems[i].id, inputItems[i].name, inputItems[i].damage, inputItems[i].durability, inputItems[i].damageType);
    }

    // Mint items to HeroInventories contract
    for (let i = 1; i <= 13; i++) {
      await weaponsAndArmors.connect(owner).mintWeapon(heroInventory.getAddress(), i);
    }

    // Add 11 items to hero's inventory
    for (let i = 1; i <= 11; i++) {
      await heroInventory.connect(owner).addERC721ItemToHero(heroId, i);
    }

    // Verify total items count is 11
    let totalItems = await heroInventory.getHeroTotalItems(heroId);
    expect(totalItems).to.equal(11);

    // Add a weapon to inventory and equip it
    await heroInventory.connect(owner).addERC721ItemToHero(heroId, 12);
    await game.connect(addr1).heroEquip(heroId, 12, 4); // EquipmentSlot.Weapon

    // Verify total items count is 11 (since one item was equipped)
    totalItems = await heroInventory.getHeroTotalItems(heroId);
    expect(totalItems).to.equal(11);

    // Vérifiez que le DAMAGE a été mis à jour
    let heroStats = await hero.getHeroStats(heroId);
    expect(heroStats.DAMAGE).to.equal(""); // Ajustez selon votre logique

    // Add one more item to fill the inventory
    await heroInventory.connect(owner).addERC721ItemToHero(heroId, 13);

    // Now inventory is full (12 items)
    totalItems = await heroInventory.getHeroTotalItems(heroId);
    expect(totalItems).to.equal(12);

    // Attempt to unequip the weapon (should fail)
    await expect(
      heroInventory.connect(owner).unequipItem(heroId, 4) // EquipmentSlot.Weapon
    ).to.be.revertedWith("Not enough space in inventory");
  });

  it("Should swap equipped items correctly", async function () {
    const {
      items,
      heroInventory,
      weaponsAndArmors,
      hero,
      game,
      owner,
      heroId,
    } = await loadFixture(deployTokenFixture);

    // Prepare items
    const inputItems = [
      {
        id: 1,
        name: "Test Sword",
        itemType: 0, // Weapon
        damage: "1D6+1",
        defense: 0,
        durability: 100,
        damageType: "Physical",
        armorType: 0,
        statModifiers: [],
      },
      {
        id: 3,
        name: "Test Axe",
        itemType: 0, // Weapon
        damage: "1D8+0.2*STR",
        defense: 0,
        durability: 90,
        damageType: "Physical",
        armorType: 0,
        statModifiers: [],
      },
    ];

    await weaponsAndArmors.connect(owner).addWeaponType(inputItems[0].id, inputItems[0].name, inputItems[0].damage, inputItems[0].durability, inputItems[0].damageType);
    await weaponsAndArmors.connect(owner).addWeaponType(inputItems[1].id, inputItems[1].name, inputItems[1].damage, inputItems[1].durability, inputItems[1].damageType);

    // Mint items to HeroInventories contract
    const weaponUniqueTx1 = await weaponsAndArmors.connect(owner).mintWeapon(heroInventory.getAddress(), 1);
    const weapon1 = await weaponUniqueTx1.wait();
    const weaponUniqueTx3 = await weaponsAndArmors.connect(owner).mintWeapon(heroInventory.getAddress(), 3);

    // Add items to hero's inventory
    await heroInventory.connect(owner).addERC721ItemToHero(heroId, 1);
    await heroInventory.connect(owner).addERC721ItemToHero(heroId, 2);

    // Equip the first weapon
    const equip = await game.connect(addr1).heroEquip(heroId, 1, 4); // EquipmentSlot.Weapon
    await equip.wait();

    // Verify total items count is 1
    let totalItems = await heroInventory.getHeroTotalItems(heroId);
    expect(totalItems).to.equal(1);

    // Vérifiez que le DAMAGE a été mis à jour pour le premier objet
    let heroStats = await hero.getHeroStats(heroId);
    expect(heroStats.DAMAGE).to.equal("1D6+1");

    // Unequip the first weapon
    const unequip = await game.connect(addr1).heroUnequip(heroId, 4); // EquipmentSlot.Weapon
    await unequip.wait();

    // Equip a second weapon (swap)
    const swapEquip = await game.connect(addr1).heroEquip(heroId, 2, 4); // EquipmentSlot.Weapon
    await swapEquip.wait();

    // Vérifiez que le DAMAGE a été mis à jour pour le nouvel objet
    heroStats = await hero.getHeroStats(heroId);
    expect(heroStats.DAMAGE).to.equal("1D8+0.2*STR");

    // Verify that the second weapon is equipped
    const equippedWeapon = await heroInventory.heroEquipment(heroId);
    expect(equippedWeapon.Weapon).to.equal(2);

    // Verify total items count remains the same
    totalItems = await heroInventory.getHeroTotalItems(heroId);
    expect(totalItems).to.equal(1);
  });

  it("Should equip item not in inventory", async function () {
    const {
      items,
      heroInventory,
      weaponsAndArmors,
      hero,
      game,
      owner,
      heroId,
    } = await loadFixture(deployTokenFixture);

    // Prepare item but do not add to hero's inventory
    const inputItems = [
      {
        id: 1,
        name: "Test Sword",
        itemType: 0, // Weapon
        damage: "1D6+1",
        defense: 0,
        durability: 100,
        damageType: "Physical",
        armorType: 0,
        statModifiers: [],
      },
    ];
    await weaponsAndArmors.connect(owner).addWeaponType(inputItems[0].id, inputItems[0].name, inputItems[0].damage, inputItems[0].durability, inputItems[0].damageType);
    // Mint items to HeroInventories contract
    const weaponUniqueTx1 = await weaponsAndArmors.connect(owner).mintWeapon(heroInventory.getAddress(), 1);

    // Attempt to equip the item directly without adding to inventory
    await expect(
      game.connect(addr1).heroEquip(heroId, 1, 4) // EquipmentSlot.Weapon
    ).to.be.revertedWith("Hero does not own this item");
  });

  it("Should not equip non-existent item", async function () {
    const {
      heroInventory,
      hero,
      game,
      owner,
      heroId,
    } = await loadFixture(deployTokenFixture);

    // Attempt to equip an item that doesn't exist
    await expect(
      game.connect(addr1).heroEquip(heroId, 999, 4) // EquipmentSlot.Weapon
    ).to.be.revertedWith("Hero does not own this item");
  });

  it("Should get hero's equipped items correctly", async function () {
    const {
      items,
      heroInventory,
      weaponsAndArmors,
      hero,
      game,
      owner,
      heroId,
    } = await loadFixture(deployTokenFixture);

    // Prepare items
    const inputItems = [
      {
        id: 1,
        name: "Test Sword",
        itemType: 0, // Weapon
        damage: "1D6+1",
        defense: 0,
        durability: 100,
        damageType: "Physical",
        armorType: 0,
        statModifiers: [],
      },
      {
        id: 2,
        name: "Test Helmet",
        itemType: 1, // Armor
        damage: "",
        defense: 5,
        durability: 80,
        damageType: "",
        armorType: 0, // ArmorType.Head
        statModifiers: [],
      },
    ];

    await weaponsAndArmors.connect(owner).addWeaponType(inputItems[0].id, inputItems[0].name, inputItems[0].damage, inputItems[0].durability, inputItems[0].damageType);
    await weaponsAndArmors.connect(owner).addArmorType(inputItems[1].id, inputItems[1].name, inputItems[1].defense, inputItems[1].durability, inputItems[1].armorType);

    // Mint items to HeroInventories contract
    await weaponsAndArmors.connect(owner).mintWeapon(await heroInventory.getAddress(), 1);
    await weaponsAndArmors.connect(owner).mintArmor(await heroInventory.getAddress(), 2);

    // Add items to hero's inventory
    await heroInventory.connect(owner).addERC721ItemToHero(heroId, 1);
    await heroInventory.connect(owner).addERC721ItemToHero(heroId, 2);

    // Equip items
    await game.connect(addr1).heroEquip(heroId, 1, 4); // Weapon
    await game.connect(addr1).heroEquip(heroId, 2, 0); // Head

    // Get equipped items
    const equippedItems = await heroInventory.getEquippedItems(heroId);

    expect(equippedItems[0]).to.equal(2); // Head slot
    expect(equippedItems[4]).to.equal(1); // Weapon slot

    // Vérifiez que le DAMAGE et ARMOR est correctement mis à jour
    const heroStats = await hero.getHeroStats(heroId);
    expect(heroStats.DAMAGE).to.equal("1D6+1"); // Selon l'arme équipée
    expect(heroStats.ARMOR).to.equal(5);

    // Equip more armor
    const add = await weaponsAndArmors.connect(owner).addArmorType(3, "Test BOOTS", 2, 70, 3);
    await add.wait();

    const mint3 = await weaponsAndArmors.connect(owner).mintArmor(await heroInventory.getAddress(), 3);
    await mint3.wait();

    const addItem3 = await heroInventory.connect(owner).addERC721ItemToHero(heroId, 3);
    await addItem3.wait();

    const equip3 = await game.connect(addr1).heroEquip(heroId, 3, 3); // Boots
    await equip3.wait();

    // Verify the armor stat 
    const heroStats2 = await hero.getHeroStats(heroId);
    expect(heroStats2.ARMOR).to.equal(7); // 5 (Helmet) + 2 (Boots)

    // unequip the helmet
    const unequip = await game.connect(addr1).heroUnequip(heroId, 0); // Head
    await unequip.wait();

    // Verify the armor stat
    const heroStats3 = await hero.getHeroStats(heroId);
    expect(heroStats3.ARMOR).to.equal(2); // 2 (Boots)

  });

  it("should use armor 1 durability point after a fight then can be repaired", async function () {

    const {
      items,
      world,
      weaponsAndArmors,
      heroInventory,
      heroEncounters,
      hero,
      game,
      owner,
      heroId,
    } = await loadFixture(deployTokenFixture);

    // Prepare ItemInput array and add items to Items contract
    const inputItems = [
      {
        id: 1,
        name: "Test Sword",
        itemType: 0, // ItemType.Weapon
        damage: "",
        defense: 0,
        durability: 10,
        damageType: "Physical",
        armorType: 0,
        statModifiers: [],
      },
      {
        id: 2,
        name: "Test Helmet",
        itemType: 1, // ItemType.Armor
        damage: "",
        defense: 5,
        durability: 20,
        damageType: "",
        armorType: 0, // ArmorType.Head
        statModifiers: [],
      },
    ];
    await weaponsAndArmors.connect(owner).addWeaponType(inputItems[0].id, inputItems[0].name, inputItems[0].damage, inputItems[0].durability, inputItems[0].damageType);
    await weaponsAndArmors.connect(owner).addArmorType(inputItems[1].id, inputItems[1].name, inputItems[1].defense, inputItems[1].durability, inputItems[1].armorType);

    // Mint items to HeroInventories contract
    const weaponUniqueTx = await weaponsAndArmors.connect(owner).mintWeapon(heroInventory.getAddress(), 1);
    const weapon1 = await weaponUniqueTx.wait();
    const armorUniqueIdTx = await weaponsAndArmors.connect(owner).mintArmor(heroInventory.getAddress(), 2);
    const armor1 = await armorUniqueIdTx.wait();
    console.log("ArmorId:", armor1);
    // Add items to hero's inventory
    await heroInventory.connect(owner).addERC721ItemToHero(heroId, 1);
    await heroInventory.connect(owner).addERC721ItemToHero(heroId, 2);

    // Equip the weapon (Test Sword) in Weapon slot
    await game.connect(addr1).heroEquip(heroId, 1, 4); // EquipmentSlot.Weapon
    // Equip the helmet (Test Helmet) in Head slot
    await game.connect(addr1).heroEquip(heroId, 2, 0); // EquipmentSlot.Head

    // Verify that the items durability is correct
    const swordDurability = await weaponsAndArmors.getDurability(1);
    const helmetDurability = await weaponsAndArmors.getDurability(2);
    expect(swordDurability).to.equal(10);
    expect(helmetDurability).to.equal(20);

    await world.connectNodes(1, 2, 1, [{ id: 1, weight: 50 }])

    // Set connection dangerosity to 100% between node 8 and 2
    await world.setConnectionDangerosity(1, 2, 4); // Setting danger level high to ensure encounter

    // authorize the address
    const txauth = await game.authorizeAddress(addr1.address);
    await txauth.wait();

    // Move the hero from node 8 to node 2 (they are connected in our setup)
    const moveTx = await game.connect(addr1).moveHero(heroId, 2);
    const receipt = await moveTx.wait();

    // Check if an encounter was initiated
    const isActive = await heroEncounters.isEncounterActive(heroId);
    expect(isActive).to.be.true;

    await game.connect(addr1).resolveEncounter(heroId, true, -5, 10);

    // Verify that the items durability is correct
    const swordDurability2 = await weaponsAndArmors.getDurability(1);
    const helmetDurability2 = await weaponsAndArmors.getDurability(2);
    expect(swordDurability2).to.equal(9);
    expect(helmetDurability2).to.equal(19);

    // Create a repair item
    // Ajouter un modificateur
    const statModifierOil: StatModifiersStructStruct = {
      stat: 11, // Durability
      amount: 5,
      duration: BigInt(0),
    }

    const statModifierOilId = 1;
    const consumableOil = "Oil";
    await items.connect(owner).addConsumable(
      statModifierOilId,
      consumableOil,
      [statModifierOil],
    );

    // Mint consumable items to HeroInventories contract
    await items
      .connect(owner)
      .mint(heroInventory.getAddress(), statModifierOilId, 1);

    // Add items to hero's inventory
    await heroInventory.connect(owner).addItemToHero(heroId, statModifierOilId, 1);

    // Repair the sword
    await game.connect(addr1).heroRepairItem(heroId, 1, 1);

    // Verify that the items durability is correct
    const swordDurability3 = await weaponsAndArmors.getDurability(1);
    const helmetDurability3 = await weaponsAndArmors.getDurability(2);
    expect(swordDurability3).to.equal(10);
    expect(helmetDurability3).to.equal(19);

    // check the item balance
    const itemBalance = await heroInventory.getHeroItemBalance(heroId, 1);
    expect(itemBalance).to.equal(0);

  });


  it("Hero can throw a weapon he owns", async function () {

    const { game, hero, weaponsAndArmors, world, items, heroInventory, owner, addr1, heroClasses, heroId } = await loadFixture(deployTokenFixture);

    // Prepare items
    const inputItems = [
      {
        id: 1,
        name: "Test Sword",
        itemType: 0, // Weapon
        damage: "1D6+1",
        defense: 0,
        durability: 100,
        damageType: "Physical",
        armorType: 0,
        statModifiers: [],
      }
    ];

    await weaponsAndArmors.connect(owner).addWeaponType(inputItems[0].id, inputItems[0].name, inputItems[0].damage, inputItems[0].durability, inputItems[0].damageType);

    // Mint items to HeroInventories contract
    const weaponUniqueTx = await weaponsAndArmors.connect(owner).mintWeapon(heroInventory.getAddress(), 1);
    const weapon1 = await weaponUniqueTx.wait();

    // Add items to hero's inventory
    await heroInventory.connect(owner).addERC721ItemToHero(heroId, 1);

    // authorize the address
    const txauth = await game.authorizeAddress(addr1.address);
    await txauth.wait();

    // check the item balance
    const itemBalance = await heroInventory.hasERC721Item(heroId, 1);
    expect(itemBalance).to.be.true;

    // Throw the weapon
    await game.connect(addr1).heroThrowERC721Item(heroId, 1);

    // check the weapon balance
    const weaponBalance = await heroInventory.hasERC721Item(heroId, 1);
    expect(weaponBalance).to.be.false;

  });

});
