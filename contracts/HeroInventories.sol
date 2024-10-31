// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./Hero.sol";
import "./Items.sol";

import "./globals/heroes.sol";

contract HeroInventories is Ownable, ERC1155Holder, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.UintSet;

    Hero public heroContract;
    Items public itemsContract;

    address public gameAddress;

    // Mapping: heroId => (itemId => amount)
    mapping(uint256 => mapping(uint256 => uint256)) public heroToItems;
    mapping(uint256 => uint256) public heroTotalItems;

    // Mapping: heroId => set of itemIds
    mapping(uint256 => EnumerableSet.UintSet) private heroItemIds;

    //Equipment
    mapping(uint256 => Equipment) public heroEquipment;

    struct Equipment {
        uint256 Head;
        uint256 Torso;
        uint256 Pants;
        uint256 Boots;
        uint256 Weapon;
    }

    modifier onlyGameOrOwner() {
        require(
            msg.sender == gameAddress || msg.sender == owner(),
            "Not authorized: Only Game or Owner can perform this action"
        );
        _;
    }

    constructor(
        address _heroAddress,
        address _itemsAddress
    ) Ownable(msg.sender) {
        require(_heroAddress != address(0), "Invalid Hero contract address");
        require(_itemsAddress != address(0), "Invalid Items contract address");
        heroContract = Hero(_heroAddress);
        itemsContract = Items(_itemsAddress);
    }

    function setGameAddress(address _gameAddress) external onlyOwner {
        require(_gameAddress != address(0), "Invalid Game contract address");
        gameAddress = _gameAddress;
    }

    function addItemToHero(
        uint256 heroId,
        uint256 itemId,
        uint256 amount
    ) external onlyGameOrOwner nonReentrant {
        require(itemsContract.isValidItem(itemId), "Item is not valid");
        require(
            heroContract.ownerOf(heroId) != address(0),
            "Hero does not exist"
        );
        require(amount > 0, "Amount must be greater than zero");
        require(
            heroTotalItems[heroId] + amount <= 12,
            "Cannot exceed 12 items per hero"
        );

        heroItemIds[heroId].add(itemId);
        heroToItems[heroId][itemId] += amount;
        heroTotalItems[heroId] += amount;
    }

    function equipItem(
        uint256 heroId,
        uint256 itemId,
        EquipmentSlot slot
    ) external onlyGameOrOwner nonReentrant {
        require(itemsContract.isValidItem(itemId), "Item is not valid");
        require(
            heroContract.ownerOf(heroId) != address(0),
            "Hero does not exist"
        );
        require(
            heroToItems[heroId][itemId] >= 1,
            "Item not in hero's inventory"
        );
        require(isValidSlot(slot), "Invalid equipment slot");
        require(
            isItemCompatibleWithSlot(itemId, slot),
            "Item cannot be equipped in this slot"
        );
        require(isSlotAvailable(heroId, slot), "Slot is already equiped");

        // Equip the new item
        if (uint256(slot) == uint256(EquipmentSlot.Head)) {
            heroEquipment[heroId].Head = itemId;
        } else if (slot == EquipmentSlot.Torso) {
            heroEquipment[heroId].Torso = itemId;
        } else if (slot == EquipmentSlot.Pants) {
            heroEquipment[heroId].Pants = itemId;
        } else if (slot == EquipmentSlot.Boots) {
            heroEquipment[heroId].Boots = itemId;
        } else if (slot == EquipmentSlot.Weapon) {
            heroEquipment[heroId].Weapon = itemId;
        }

        // Remove from inventory
        heroToItems[heroId][itemId] -= 1;
        heroTotalItems[heroId] -= 1;
        if (heroToItems[heroId][itemId] == 0) {
            heroItemIds[heroId].remove(itemId);
        }
    }

    // Unequip an item from a hero
    function unequipItem(
        uint256 heroId,
        EquipmentSlot slot
    ) external onlyGameOrOwner {
        require(
            heroContract.ownerOf(heroId) != address(0),
            "Hero does not exist"
        );
        require(isValidSlot(EquipmentSlot(slot)), "Invalid equipment slot");
        uint256 existingItemId = getEquipmentSlot(heroId, EquipmentSlot(slot));
        require(existingItemId != 0, "No item equipped in this slot");
        //check there is enough place in inventory
        require(heroTotalItems[heroId] < 12, "Not enough place in inventory");

        // Clear the equipment slot
        if (uint256(slot) == uint256(EquipmentSlot.Head)) {
            heroEquipment[heroId].Head = 0;
        } else if (uint256(slot) == uint256(EquipmentSlot.Torso)) {
            heroEquipment[heroId].Torso = 0;
        } else if (uint256(slot) == uint256(EquipmentSlot.Pants)) {
            heroEquipment[heroId].Pants = 0;
        } else if (uint256(slot) == uint256(EquipmentSlot.Boots)) {
            heroEquipment[heroId].Boots = 0;
        } else if (uint256(slot) == uint256(EquipmentSlot.Weapon)) {
            heroEquipment[heroId].Weapon = 0;
        }

        // Add the item back to inventory
        heroToItems[heroId][existingItemId] += 1;
        heroTotalItems[heroId] += 1;
        heroItemIds[heroId].add(existingItemId);
    }

    function getEquipmentSlot(
        uint256 heroId,
        EquipmentSlot slot
    ) internal view returns (uint256) {
        if (slot == EquipmentSlot.Head) {
            return heroEquipment[heroId].Head;
        } else if (slot == EquipmentSlot.Torso) {
            return heroEquipment[heroId].Torso;
        } else if (slot == EquipmentSlot.Pants) {
            return heroEquipment[heroId].Pants;
        } else if (slot == EquipmentSlot.Boots) {
            return heroEquipment[heroId].Boots;
        } else if (slot == EquipmentSlot.Weapon) {
            return heroEquipment[heroId].Weapon;
        }
        return 0;
    }

    function isSlotAvailable(
        uint256 heroId,
        EquipmentSlot slot
    ) internal view returns (bool) {
        if (slot == EquipmentSlot.Head) {
            return heroEquipment[heroId].Head == 0;
        } else if (slot == EquipmentSlot.Torso) {
            return heroEquipment[heroId].Torso == 0;
        } else if (slot == EquipmentSlot.Pants) {
            return heroEquipment[heroId].Pants == 0;
        } else if (slot == EquipmentSlot.Boots) {
            return heroEquipment[heroId].Boots == 0;
        } else if (slot == EquipmentSlot.Weapon) {
            return heroEquipment[heroId].Weapon == 0;
        }
        return false;
    }

    function isValidSlot(EquipmentSlot slot) internal pure returns (bool) {
        return uint256(slot) <= uint256(EquipmentSlot.Weapon);
    }

    function isItemCompatibleWithSlot(
        uint256 itemId,
        EquipmentSlot slot
    ) internal view returns (bool) {
        Items.ItemType itemType = itemsContract.getItemType(itemId);

        if (slot == EquipmentSlot.Head) {
            return
                itemType == Items.ItemType.Armor &&
                itemsContract.getArmorType(itemId) == Items.ArmorType.Head;
        } else if (slot == EquipmentSlot.Torso) {
            return
                itemType == Items.ItemType.Armor &&
                itemsContract.getArmorType(itemId) == Items.ArmorType.Torso;
        } else if (slot == EquipmentSlot.Pants) {
            return
                itemType == Items.ItemType.Armor &&
                itemsContract.getArmorType(itemId) == Items.ArmorType.Pants;
        } else if (slot == EquipmentSlot.Boots) {
            return
                itemType == Items.ItemType.Armor &&
                itemsContract.getArmorType(itemId) == Items.ArmorType.Boots;
        } else if (slot == EquipmentSlot.Weapon) {
            return itemType == Items.ItemType.Weapon;
        }
        return false;
    }

    // Consume a consumable item from hero's inventory
    function consumeConsumable(
        uint256 heroId,
        uint256 itemId
    ) external onlyGameOrOwner nonReentrant {
        require(itemsContract.isConsumable(itemId), "Item is not consumable");
        require(
            heroContract.ownerOf(heroId) != address(0),
            "Hero does not exist"
        );
        require(
            heroToItems[heroId][itemId] >= 1,
            "Not enough consumables to consume"
        );

        // Burn the consumable
        itemsContract.burn(address(this), itemId, 1);

        // Update the internal mapping
        heroToItems[heroId][itemId] -= 1;

        if (heroToItems[heroId][itemId] == 0) {
            heroItemIds[heroId].remove(itemId);
        }
        heroTotalItems[heroId] -= 1;
    }

    // Remove items from hero's inventory
    function removeItemsFromHero(
        uint256 heroId,
        uint256 itemId,
        uint256 amount
    ) external onlyGameOrOwner nonReentrant {
        require(
            heroContract.ownerOf(heroId) != address(0),
            "Hero does not exist"
        );
        require(
            heroToItems[heroId][itemId] >= amount,
            "Not enough items to remove"
        );

        heroToItems[heroId][itemId] -= amount;

        if (heroToItems[heroId][itemId] == 0) {
            heroItemIds[heroId].remove(itemId);
        }
        heroTotalItems[heroId] -= amount;
    }

    // Get the hero's inventory
    function getHeroInventory(
        uint256 heroId
    )
        external
        view
        returns (uint256[] memory itemIds, uint256[] memory amounts)
    {
        uint256 length = heroItemIds[heroId].length();
        itemIds = new uint256[](length);
        amounts = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            uint256 itemId = heroItemIds[heroId].at(i);
            itemIds[i] = itemId;
            amounts[i] = heroToItems[heroId][itemId];
        }
    }

    // Get equipped items for a hero
    function getEquippedItems(
        uint256 heroId
    ) external view returns (Equipment memory) {
        return heroEquipment[heroId];
    }

    function getHeroItemBalance(
        uint256 heroId,
        uint256 itemId
    ) external view returns (uint256) {
        return heroToItems[heroId][itemId];
    }

    function getHeroTotalItems(uint256 heroId) external view returns (uint256) {
        return heroTotalItems[heroId];
    }

    function getHeroTotalArmor(uint256 heroId) external view returns (uint8) {
        uint8 totalArmor = 0;
        Equipment memory equipment = heroEquipment[heroId];
        if (equipment.Head != 0) {
            totalArmor += itemsContract.getArmorDefense(equipment.Head);
        }
        if (equipment.Torso != 0) {
            totalArmor += itemsContract.getArmorDefense(equipment.Torso);
        }
        if (equipment.Pants != 0) {
            totalArmor += itemsContract.getArmorDefense(equipment.Pants);
        }
        if (equipment.Boots != 0) {
            totalArmor += itemsContract.getArmorDefense(equipment.Boots);
        }
        return totalArmor;
    }

    // Emergency withdrawal function
    function emergencyWithdraw(
        uint256 itemId,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(
            itemsContract.balanceOf(address(this), itemId) >= amount,
            "Not enough items to withdraw"
        );
        itemsContract.safeTransferFrom(
            address(this),
            owner(),
            itemId,
            amount,
            ""
        );
    }
}
