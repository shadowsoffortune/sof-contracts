// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./Hero.sol";
import "./World.sol";
import "./HeroEncounters.sol";
import "./HeroInventories.sol";
import "./Items.sol";
import "../utils/heroUtils.sol";

import "hardhat/console.sol";

import "./globals/heroes.sol";
import {Node} from "./globals/world.sol";

contract Game is Ownable {
    Hero public heroContract;
    HeroEncounters public heroEncountersContract;
    World public worldContract;
    HeroInventories public heroInventoryContract;
    Items public itemsContract;
    WeaponsAndArmors public weaponsAndArmorsContract;

    mapping(address => bool) public authorizedAddresses;
    mapping(uint256 => uint256) public heroScores;

    struct EncounterResult {
        bool encountered;
        uint256 monsterType;
        uint256 toNodeId;
        uint8 actionType;
    }

    event HeroMoved(
        uint256 tokenId,
        bool encountered,
        uint256 monsterType,
        uint256 nodeId
    );
    event HeroMinted(
        uint256 tokenId,
        string name,
        address to,
        uint256 initialNode
    );
    event HeroSearched(
        uint256 tokenId,
        bool encountered,
        uint256 monsterType,
        uint256 nodeId
    );
    event ItemLooted(uint256 heroId, uint256 itemId, uint256 amount);
    event ScoreUpdated(uint256 heroId, uint256 newScore);

    constructor(
        address _heroAddress,
        address _worldAddress,
        address _heroEncountersAddress,
        address _heroInventoriesAddress,
        address _itemsAddress,
        address _weaponsAndArmorsAddress
    ) Ownable(msg.sender) {
        heroContract = Hero(_heroAddress);
        worldContract = World(_worldAddress);
        heroEncountersContract = HeroEncounters(_heroEncountersAddress);
        heroInventoryContract = HeroInventories(_heroInventoriesAddress);
        itemsContract = Items(_itemsAddress);
        weaponsAndArmorsContract = WeaponsAndArmors(_weaponsAndArmorsAddress);
        authorizedAddresses[msg.sender] = true;
    }

    modifier onlyAuthorized() {
        require(
            authorizedAddresses[msg.sender],
            "Unauthorized: caller is not authorized"
        );
        _;
    }

    modifier onlyHeroOwner(uint256 heroId) {
        require(
            msg.sender == heroContract.ownerOf(heroId),
            "Not the hero owner"
        );
        _;
    }

    function setHeroContract(address _heroAddress) public onlyOwner {
        heroContract = Hero(_heroAddress);
    }

    function setWorldContract(address _worldAddress) public onlyOwner {
        worldContract = World(_worldAddress);
    }

    function setHeroEncountersContract(
        address _heroEncountersAddress
    ) public onlyOwner {
        heroEncountersContract = HeroEncounters(_heroEncountersAddress);
    }

    function setHeroInventoriesContract(
        address _heroInventoriesAddress
    ) public onlyOwner {
        heroInventoryContract = HeroInventories(_heroInventoriesAddress);
    }

    function setItemsContract(address _itemsAddress) public onlyOwner {
        itemsContract = Items(_itemsAddress);
    }

    function setWeaponsAndArmorsContract(
        address _weaponsAndArmorsAddress
    ) public onlyOwner {
        weaponsAndArmorsContract = WeaponsAndArmors(_weaponsAndArmorsAddress);
    }

    function isAuthorized(address _address) public view returns (bool) {
        return authorizedAddresses[_address];
    }

    function authorizeAddress(address _address) public onlyOwner {
        authorizedAddresses[_address] = true;
    }

    function deauthorizeAddress(address _address) public onlyOwner {
        authorizedAddresses[_address] = false;
    }

    function mintHero(
        address to,
        address playerWallet,
        string calldata name,
        uint16 classIndex,
        uint16 strength,
        uint16 agility,
        uint16 perception,
        uint16 intelligence,
        uint16 constitution,
        bool gender
    ) public payable {
        require(
            msg.value >= heroContract.price(),
            "Insufficient funds to mint hero"
        );
        address payable walletPayable = payable(playerWallet);
        uint256 tokenId = heroContract.mint{value: msg.value}(
            to,
            walletPayable,
            name,
            classIndex,
            strength,
            agility,
            perception,
            intelligence,
            constitution,
            gender
        );
        worldContract.placeHero(tokenId, 1);
        heroContract.setLastSavePoint(tokenId, 1);
        heroScores[tokenId] = 0;

        emit HeroMinted(tokenId, heroContract.getName(tokenId), to, 1);
    }

    function setHeroScore(uint256 heroId, uint256 score) public onlyOwner {
        heroScores[heroId] = score;
    }

    function calculateFailureProbability(
        uint256 tokenId,
        uint256 dangerLevel
    ) internal returns (uint256) {
        HeroStats memory heroStats = heroContract.getHeroStats(tokenId);
        console.log("Hero stats STR:", heroStats.STR);
        console.log("Hero stats AGI:", heroStats.AGI);
        console.log("Hero stats PER:", heroStats.PER);
        console.log("Hero stats INT:", heroStats.INT);
        console.log("Hero stats CON:", heroStats.CON);
        console.log("dangerLevel:", dangerLevel);
        uint256 heroFurtivity = HeroUtils.calculateHeroFurtivity(heroStats.AGI, heroStats.PER, heroStats.INT);
        uint256 failureProbability = ((25 * dangerLevel) - heroFurtivity);
        console.log("Hero furtivity: %d", heroFurtivity);
        console.log("Failure probability: %d", failureProbability);
        console.log("Danger level: %d", dangerLevel);

        return failureProbability;
    }

    function calculateFailureProbabilityOnNode(
        uint256 tokenId,
        uint256 dangerLevel
    ) internal returns (uint256) {
        HeroStats memory heroStats = heroContract.getHeroStats(tokenId);
        console.log("Hero stats STR:", heroStats.STR);
        console.log("Hero stats AGI:", heroStats.AGI);
        console.log("Hero stats PER:", heroStats.PER);
        console.log("Hero stats INT:", heroStats.INT);
        console.log("Hero stats CON:", heroStats.CON);
        console.log("dangerLevel:", dangerLevel);
        uint256 heroFurtivity = HeroUtils.calculateHeroFurtivity(heroStats.AGI, heroStats.PER, heroStats.INT);
        uint256 failureProbability = dangerLevel * 100 / (dangerLevel + heroFurtivity);
        console.log("Hero furtivity: %d", heroFurtivity);
        console.log("Failure probability: %d", failureProbability);
        console.log("Danger level: %d", dangerLevel);

        return failureProbability;
    }

    function moveHero(
        uint256 tokenId,
        uint256 toNodeId
    )
        public
        onlyAuthorized
        onlyHeroOwner(tokenId)
        returns (EncounterResult memory)
    {
        require(!encounterExists(tokenId), "Resolve current encounter first");
        // Check connection dangerosity
        uint256 fromNodeId = worldContract.heroLocations(tokenId);
        require(
            worldContract.connections(fromNodeId, toNodeId),
            "Nodes are not connected"
        );
        heroContract.regenerateEnergy(tokenId);
        require(heroContract.getHeroEnergy(tokenId) >= 5, "Not enough energy");
        // Deduct energy
        heroContract.changeEnergy(tokenId, -5);

        // get dangerosity level
        uint256 dangerLevel = worldContract.getConnectionDangerosity(
            fromNodeId,
            toNodeId
        );

        if (dangerLevel > 0) {
            uint256 failureProbability = calculateFailureProbability(
                tokenId,
                dangerLevel
            );
            uint256 rand = random();
            console.log("Random number: %d", rand);
            // check if hero get encounter
            if (dangerLevel == 4 || rand < failureProbability) {
                uint256 monsterType = determineMonsterType(
                    fromNodeId,
                    toNodeId
                );
                console.log("Monster type: %d", monsterType);
                heroEncountersContract.initiateEncounter(
                    tokenId,
                    toNodeId,
                    monsterType,
                    0
                );
                emit HeroMoved(tokenId, true, monsterType, toNodeId);
                return EncounterResult(true, monsterType, toNodeId, 0);
            } else {
                if (dangerLevel > 0) {
                    console.log(
                        "hero score",
                        heroScores[tokenId] + (25 * dangerLevel + 1) / 2
                    );
                    updateHeroScore(
                        tokenId,
                        heroScores[tokenId] + (25 * dangerLevel + 1) / 2
                    );
                    heroContract.addHeroXP(tokenId, (25 * dangerLevel + 1) / 2);
                }
                worldContract.moveHero(tokenId, toNodeId);
                emit HeroMoved(tokenId, false, 0, toNodeId);
                return EncounterResult(false, 0, toNodeId, 0);
            }
        } else {
            worldContract.moveHero(tokenId, toNodeId);
            emit HeroMoved(tokenId, false, 0, toNodeId);
            return EncounterResult(false, 0, toNodeId, 0);
        }
    }

    function heroSearch(
        uint256 heroId,
        uint256 nodeId
    )
        public
        onlyAuthorized
        onlyHeroOwner(heroId)
        returns (EncounterResult memory)
    {
        uint256 heroLocation = worldContract.heroLocations(heroId);
        require(heroLocation == nodeId, "Hero is not at the specified node");

        HeroStats memory heroStats = heroContract.getHeroStats(heroId);
        uint256 heroEXPL = HeroUtils.calculateHeroEXPL(heroStats.PER, heroStats.INT, heroStats.AGI);

        heroContract.regenerateEnergy(heroId);
        require(heroContract.getHeroEnergy(heroId) >= 20, "Not enough energy");
        heroContract.changeEnergy(heroId, -20);

        uint256 dangerLevel = worldContract.getNodeDangerosity(nodeId);

        if(dangerLevel == 0) {
            finalizeSearch(heroId, nodeId, heroEXPL);
            return EncounterResult(false, 0, nodeId, 1);
        }

        uint256 failureProbability = calculateFailureProbabilityOnNode(
            heroId,
            dangerLevel
        );
        console.log("failure prob on node: %d" , failureProbability);

        uint256 rand = random();
        console.log("Random number: %d", rand);
        // check if hero get encounter
        if (dangerLevel == 4 || rand < failureProbability) {
            uint256 monsterType = determineMonsterType(nodeId);
            console.log("Monster type: %d", monsterType);
            heroEncountersContract.initiateEncounter(
                heroId,
                nodeId,
                monsterType,
                1
            );
            emit HeroSearched(heroId, true, monsterType, nodeId);
            return EncounterResult(true, monsterType, nodeId, 1);
        } else {
            if (dangerLevel > 0) {
                console.log(
                    "hero score",
                    heroScores[heroId] + (25 * dangerLevel + 1) / 2
                );
                updateHeroScore(
                    heroId,
                    heroScores[heroId] + (25 * dangerLevel + 1) / 2
                );
                heroContract.addHeroXP(heroId, (25 * dangerLevel + 1) / 2);
            }

            finalizeSearch(heroId, nodeId, heroEXPL);

            return EncounterResult(false, 0, nodeId, 1);
        }
    }

    function finalizeSearch(
        uint256 heroId,
        uint256 nodeId,
        uint256 heroEXPL
    ) internal {
        console.log("HERO EXPL", heroEXPL);
        uint256[] memory lootedItems = worldContract.heroSearch(
            heroId,
            nodeId,
            msg.sender,
            heroEXPL
        );

        if (lootedItems.length > 0) {
            updateHeroScore(
                heroId,
                heroScores[heroId] + worldContract.getNodeSearchDiff(nodeId)
            );
            heroContract.addHeroXP(
                heroId,
                worldContract.getNodeSearchDiff(nodeId)
            );
        }
        // Mint items to hero
        for (uint256 i = 0; i < lootedItems.length; i++) {
            if (lootedItems[i] < 10000) {
                // ID of an ERC1155 item
                itemsContract.mint(
                    address(heroInventoryContract),
                    lootedItems[i],
                    1
                );
                heroInventoryContract.addItemToHero(heroId, lootedItems[i], 1);
            } else if (lootedItems[i] >= 10000 && lootedItems[i] < 20000) {
                // ID of a weapon
                uint256 weaponId = weaponsAndArmorsContract.mintWeapon(
                    address(heroInventoryContract),
                    lootedItems[i]
                );
                heroInventoryContract.addERC721ItemToHero(heroId, weaponId);
            } else if (lootedItems[i] >= 20000 && lootedItems[i] < 30000) {
                // ID of an armor
                uint256 armorId = weaponsAndArmorsContract.mintArmor(
                    address(heroInventoryContract),
                    lootedItems[i]
                );
                heroInventoryContract.addERC721ItemToHero(heroId, armorId);
            }
            emit ItemLooted(heroId, lootedItems[i], 1);
        }
    }

    function heroRest(
        uint256 heroId
    ) public onlyAuthorized onlyHeroOwner(heroId) {
        uint256 heroLocation = worldContract.heroLocations(heroId);
        require(worldContract.isShelter(heroLocation), "Node is not a shelter");
        heroContract.rest(heroId, heroLocation);
    }

    function heroEquip(
        uint256 heroId,
        uint256 itemId,
        EquipmentSlot slot
    ) external onlyAuthorized onlyHeroOwner(heroId) {
        heroInventoryContract.equipItem(heroId, itemId, slot);
        if (slot == EquipmentSlot.Weapon)
            heroContract.changeHeroDamages(
                heroId,
                weaponsAndArmorsContract.getWeapon(itemId).damage
            );
        if (uint256(slot) < 4) {
            heroContract.changeHeroArmor(
                heroId,
                heroInventoryContract.getHeroTotalArmor(heroId)
            );
        }
    }

    function heroUnequip(
        uint256 heroId,
        EquipmentSlot slot
    ) public onlyAuthorized onlyHeroOwner(heroId) {
        heroInventoryContract.unequipItem(heroId, slot);
        if (slot == EquipmentSlot.Weapon)
            heroContract.changeHeroDamages(heroId, "1D2+0.15*STR");
        if (uint256(slot) < 4) {
            heroContract.changeHeroArmor(
                heroId,
                heroInventoryContract.getHeroTotalArmor(heroId)
            );
        }
    }

    function heroThrowItems(
        uint256 heroId,
        uint256 itemId,
        uint256 amount
    ) external onlyAuthorized onlyHeroOwner(heroId) {
        require(
            heroInventoryContract.getHeroItemBalance(heroId, itemId) >= amount,
            "Not enough items to throw"
        );
        heroInventoryContract.throwItem(heroId, itemId, amount);
    }

    function heroThrowERC721Item(
        uint256 heroId,
        uint256 itemId
    ) external onlyAuthorized onlyHeroOwner(heroId) {
        require(
            heroInventoryContract.hasERC721Item(heroId, itemId),
            "Hero does not own this item"
        );
        // if item is equipped change stats
        Equipment memory equippedItems = heroInventoryContract.getEquippedItems(
            heroId
        );
        if (equippedItems.Head == itemId) {
            heroUnequip(heroId, EquipmentSlot.Head);
        }
        if (equippedItems.Torso == itemId) {
            heroUnequip(heroId, EquipmentSlot.Torso);
        }
        if (equippedItems.Pants == itemId) {
            heroUnequip(heroId, EquipmentSlot.Pants);
        }
        if (equippedItems.Boots == itemId) {
            heroUnequip(heroId, EquipmentSlot.Boots);
        }
        if (equippedItems.Weapon == itemId) {
            heroUnequip(heroId, EquipmentSlot.Weapon);
        }
        heroInventoryContract.throwERC721Item(heroId, itemId);
    }

    function randMod(uint256 _modulus) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp))) % _modulus;
    }

    function heroRepairItem(
        uint256 heroId,
        uint256 itemToRepairId,
        uint256 itemToUseId
    ) external onlyAuthorized onlyHeroOwner(heroId) {
        //check hero has the erc721 item
        require(
            heroInventoryContract.hasERC721Item(heroId, itemToRepairId),
            "Hero does not own this item"
        );
        require(
            heroInventoryContract.getHeroItemBalance(heroId, itemToUseId) > 0,
            "Hero does not own this item"
        );
        require(
            itemsContract.getAllStatModifiers(itemToUseId)[0].stat ==
                StatType.DUR,
            "Item is not a repair item"
        );
        heroInventoryContract.consumeConsumable(heroId, itemToUseId);
        int16 repairDur = itemsContract
        .getAllStatModifiers(itemToUseId)[0].amount;
        weaponsAndArmorsContract.repairItem(itemToRepairId, repairDur);
    }

    function heroConsumeItem(
        uint256 heroId,
        uint256 itemId
    ) external onlyAuthorized onlyHeroOwner(heroId) {
        //console.log("Consume item %d", itemId);
        heroInventoryContract.consumeConsumable(heroId, itemId);
        //console.log("apply consumable effect");
        StatModifiersStruct[] memory statModifiers = itemsContract
            .getAllStatModifiers(itemId);
        for (uint256 i = 0; i < statModifiers.length; i++) {
            //console.log("Apply stat modifier %d", i);
            applyStatModifier(
                heroId,
                statModifiers[i].stat,
                statModifiers[i].amount,
                statModifiers[i].duration
            );
        }
    }

    function applyStatModifier(
        uint256 heroId,
        StatType stat,
        int16 amount,
        uint256 duration
    ) internal {
        if (duration == 0) {
            // Instant effect, apply immediately
            heroContract.applyInstantStatModifier(heroId, stat, amount);
        }
        // TODO add addHeroBuff function for temporary stat modifiers
    }

    function levelUpHeroStat(
        uint256 heroId,
        StatType stat
    ) public onlyAuthorized onlyHeroOwner(heroId) {
        heroContract.increaseHeroStat(heroId, stat);
    }

    function addItemsToHero(
        uint256 heroId,
        uint256 itemId,
        uint256 amounts
    ) external onlyAuthorized onlyHeroOwner(heroId) {
        require(
            itemsContract.balanceOf(msg.sender, itemId) >= amounts,
            "Not the owner of the item"
        );
        console.log("Transfering items to contract");
        itemsContract.safeTransferFrom(
            msg.sender,
            address(heroInventoryContract),
            itemId,
            amounts,
            ""
        );
        console.log("Setting item table for hero");
        console.log("HeroId: %d", heroId);
        console.log("ItemId: %d", itemId);
        console.log("Amounts: %d", amounts);
        heroInventoryContract.addItemToHero(heroId, itemId, amounts);
    }

    function resolveEncounter(
        uint256 tokenId,
        bool success,
        int hpChange,
        uint256 xpGain
    ) public onlyAuthorized {
        require(encounterExists(tokenId), "No active encounter for this hero");
        if (success) {
            updateHeroScore(tokenId, heroScores[tokenId] + xpGain);
            heroContract.changeHeroHP(tokenId, int8(hpChange));
            heroContract.addHeroXP(tokenId, xpGain);
            itemsContract.rewardCurrency(address(heroInventoryContract), tokenId, randMod(10) + 1);
            if (
                heroEncountersContract.getActiveEncounter(tokenId).actionType ==
                0
            ) {
                worldContract.placeHero(
                    tokenId,
                    heroEncountersContract.getActiveEncounter(tokenId).toNodeId
                );
            } else {
                // Search action
                HeroStats memory heroStats = heroContract.getHeroStats(tokenId);
                uint256 heroEXPL = HeroUtils.calculateHeroEXPL(heroStats.PER, heroStats.INT, heroStats.AGI);
                emit HeroSearched(
                    tokenId,
                    true,
                    heroEncountersContract
                        .getActiveEncounter(tokenId)
                        .monsterType,
                    heroEncountersContract.getActiveEncounter(tokenId).toNodeId
                );
                finalizeSearch(
                    tokenId,
                    heroEncountersContract.getActiveEncounter(tokenId).toNodeId,
                    heroEXPL
                );
            }
        } else {
            // Hero dies and is teleported to last saving point
            updateHeroScore(tokenId, (heroScores[tokenId] * 75) / 100);
            heroContract.setHeroHP(tokenId, 1);
            uint256 lastPoint = heroContract.getLastSavePoint(tokenId);
            worldContract.placeHero(tokenId, lastPoint);
        }
        Equipment memory equippedItems = heroInventoryContract.getEquippedItems(
            tokenId
        );
        uint16 durabilityRes = 0;
        if (equippedItems.Head != 0) {
            console.log("reducing head dur");
            durabilityRes = heroInventoryContract.reduceItemDurability(
                tokenId,
                EquipmentSlot.Head,
                1
            );
            if (durabilityRes == 0) {
                heroContract.changeHeroArmor(
                    tokenId,
                    heroInventoryContract.getHeroTotalArmor(tokenId)
                );
            }
        }
        if (equippedItems.Torso != 0) {
            console.log("reducing head dur");
            durabilityRes = heroInventoryContract.reduceItemDurability(
                tokenId,
                EquipmentSlot.Torso,
                1
            );
            if (durabilityRes == 0) {
                heroContract.changeHeroArmor(
                    tokenId,
                    heroInventoryContract.getHeroTotalArmor(tokenId)
                );
            }
        }
        if (equippedItems.Pants != 0) {
            console.log("reducing head dur");
            durabilityRes = heroInventoryContract.reduceItemDurability(
                tokenId,
                EquipmentSlot.Pants,
                1
            );
            if (durabilityRes == 0) {
                heroContract.changeHeroArmor(
                    tokenId,
                    heroInventoryContract.getHeroTotalArmor(tokenId)
                );
            }
        }
        if (equippedItems.Boots != 0) {
            console.log("reducing head dur");
            durabilityRes = heroInventoryContract.reduceItemDurability(
                tokenId,
                EquipmentSlot.Boots,
                1
            );
            if (durabilityRes == 0) {
                heroContract.changeHeroArmor(
                    tokenId,
                    heroInventoryContract.getHeroTotalArmor(tokenId)
                );
            }
        }
        if (equippedItems.Weapon != 0) {
            console.log("reducing head dur");
            durabilityRes = heroInventoryContract.reduceItemDurability(
                tokenId,
                EquipmentSlot.Weapon,
                1
            );
            if (durabilityRes == 0) {
                heroContract.changeHeroDamages(tokenId, "1D2+0.15*STR");
            }
        }
        heroEncountersContract.resolveEncounter(tokenId);
    }

    function encounterExists(uint256 tokenId) public view returns (bool) {
        return heroEncountersContract.isEncounterActive(tokenId);
    }

    function random() private view returns (uint256) {
        return
            uint256(
                keccak256(abi.encodePacked(block.timestamp, block.prevrandao))
            ) % 100;
    }

    function determineMonsterType(
        uint256 fromNodeId,
        uint256 toNodeId
    ) public returns (uint256) {
        return worldContract.getMonsterForConnection(fromNodeId, toNodeId);
    }

    function determineMonsterType(uint256 nodeId) public returns (uint256) {
        return worldContract.getMonsterForNode(nodeId);
    }

    function updateHeroScore(uint256 heroId, uint256 newScore) internal {
        heroScores[heroId] = newScore;
        console.log("Score given");
        emit ScoreUpdated(heroId, newScore);
        console.log("Score updated");
    }
}
