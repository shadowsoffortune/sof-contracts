// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./Hero.sol";
import "./World.sol";
import "./HeroEncounters.sol";
import "./HeroInventories.sol";
import "./Items.sol";

import "hardhat/console.sol";

import "./globals/heroes.sol";
import {Node} from "./globals/world.sol";

contract Game is Ownable {
    Hero public heroContract;
    HeroEncounters public heroEncountersContract;
    World public worldContract;
    HeroInventories public heroInventoryContract;
    Items public itemsContract;

    mapping(address => bool) public authorizedAddresses;
    mapping(uint256 => uint256) public heroScores;

    struct EncounterResult {
        bool encountered;
        uint256 monsterType;
        uint256 toNodeId;
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
    event ItemLooted(uint256 heroId, uint256 itemId, uint256 amount);
    event ScoreUpdated(uint256 heroId, uint256 newScore);

    constructor(
        address _heroAddress,
        address _worldAddress,
        address _heroEncountersAddress,
        address _heroInventoriesAddress,
        address _itemsAddress
    ) Ownable(msg.sender) {
        heroContract = Hero(_heroAddress);
        worldContract = World(_worldAddress);
        heroEncountersContract = HeroEncounters(_heroEncountersAddress);
        heroInventoryContract = HeroInventories(_heroInventoriesAddress);
        itemsContract = Items(_itemsAddress);
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
        uint8 classIndex,
        uint8 strength,
        uint8 agility,
        uint8 perception,
        uint8 intelligence,
        uint8 constitution
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
            constitution
        );
        worldContract.placeHero(tokenId, 1);
        heroContract.setLastSavePoint(tokenId, 1);
        heroScores[tokenId] = 0;

        emit HeroMinted(tokenId, heroContract.getName(tokenId), to, 1);
    }

    function setHeroScore(uint256 heroId, uint256 score) public onlyOwner {
        heroScores[heroId] = score;
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
        uint256 dangerLevel = worldContract.connectionDangerosity(
            fromNodeId,
            toNodeId
        );

        HeroStats memory heroStats = heroContract.getHeroStats(tokenId);
        console.log("Hero stats STR:", heroStats.STR);
        console.log("Hero stats AGI:", heroStats.AGI);
        console.log("Hero stats PER:", heroStats.PER);
        console.log("Hero stats INT:", heroStats.INT);
        console.log("Hero stats CON:", heroStats.CON);
        console.log((uint256(12) * heroStats.AGI + uint256(5) * heroStats.PER) / 10);
        uint256 heroFurtivity = (uint256(12) * heroStats.AGI + uint256(5) * heroStats.PER) / 10;
        uint256 failureProbability = (25 * dangerLevel * 100) /
            (25 * dangerLevel + heroFurtivity);
        console.log("Hero furtivity: %d", heroFurtivity);
        console.log("Failure probability: %d", failureProbability);
        console.log("Danger level: %d", dangerLevel);
        uint256 rand = random();
        console.log("Random number: %d", rand);
        // check if hero get encounter
        if (dangerLevel == 4 || rand < failureProbability) {
            uint256 monsterType = determineMonsterType(fromNodeId, toNodeId);
            console.log("Monster type: %d", monsterType);
            heroEncountersContract.initiateEncounter(
                tokenId,
                toNodeId,
                monsterType
            );
            emit HeroMoved(tokenId, true, monsterType, toNodeId);
            return EncounterResult(true, monsterType, toNodeId);
        } else {
            if (dangerLevel > 0) {
                console.log("hero score",heroScores[tokenId] + (25 * dangerLevel + 1) / 2);
                updateHeroScore(tokenId, heroScores[tokenId] + (25 * dangerLevel + 1) / 2);
                heroContract.addHeroXP(tokenId, (25 * dangerLevel + 1) / 2);
            }
            worldContract.moveHero(tokenId, toNodeId);
            emit HeroMoved(tokenId, false, 0, toNodeId);
            return EncounterResult(false, 0, toNodeId);
        }
    }

    function heroSearch(
        uint256 heroId,
        uint256 nodeId
    ) public onlyAuthorized onlyHeroOwner(heroId) {
        uint256 heroLocation = worldContract.heroLocations(heroId);
        require(heroLocation == nodeId, "Hero is not at the specified node");

        HeroStats memory heroStats = heroContract.getHeroStats(heroId);
        uint256 heroEXPL = (12 * heroStats.PER + 6 * heroStats.INT) / 10;

        heroContract.regenerateEnergy(heroId);
        require(heroContract.getHeroEnergy(heroId) >= 20, "Not enough energy");
        heroContract.changeEnergy(heroId, -20);

        uint256[] memory lootedItems = worldContract.heroSearch(
            heroId,
            nodeId,
            msg.sender,
            heroEXPL
        );

        if (lootedItems.length > 0) {
            updateHeroScore(heroId, heroScores[heroId] + worldContract.getNodeSearchDiff(nodeId));
            heroContract.addHeroXP(heroId, worldContract.getNodeSearchDiff(nodeId));
        }

        // Mint items to hero
        for (uint256 i = 0; i < lootedItems.length; i++) {
            itemsContract.mint(
                address(heroInventoryContract),
                lootedItems[i],
                1
            );
            heroInventoryContract.addItemToHero(heroId, lootedItems[i], 1);
            emit ItemLooted(heroId, lootedItems[i], 1);
        }
    }

    function heroRest(uint256 heroId) public onlyAuthorized onlyHeroOwner(heroId) {
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
                itemsContract.getWeapon(itemId).damage
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
    ) external onlyAuthorized onlyHeroOwner(heroId) {
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

    function heroThowItems(
        uint256 heroId,
        uint256 itemId,
        uint256 amount
    ) external onlyAuthorized onlyHeroOwner(heroId) {
        require(
            heroInventoryContract.getHeroItemBalance(heroId, itemId) >= amount,
            "Not enough items to throw"
        );
        itemsContract.burn(address(heroInventoryContract), itemId, amount);
        heroInventoryContract.removeItemsFromHero(heroId, itemId, amount);
    }

    function randMod(uint256 _modulus) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp))) % _modulus;
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
        itemsContract.safeTransferFrom(
            msg.sender,
            address(heroInventoryContract),
            itemId,
            amounts,
            ""
        );

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
            worldContract.placeHero(
                tokenId,
                heroEncountersContract.getActiveEncounter(tokenId).toNodeId
            );
        } else {
            // Hero dies and is teleported to last saving point
            updateHeroScore(tokenId, (heroScores[tokenId] * 75) / 100);
            heroContract.setHeroHP(tokenId, 1);
            uint256 lastPoint = heroContract.getLastSavePoint(tokenId);
            worldContract.placeHero(tokenId, lastPoint);
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

    function updateHeroScore(uint256 heroId, uint256 newScore) internal {
        heroScores[heroId] = newScore;
        console.log('Score given');
        emit ScoreUpdated(heroId, newScore);
        console.log('Score updated');
    }
}
