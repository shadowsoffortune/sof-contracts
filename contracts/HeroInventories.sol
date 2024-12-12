// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./Hero.sol";
import "./Items.sol";
import "./WeaponsAndArmors.sol";

import "./globals/heroes.sol";

contract HeroInventories is
    Ownable,
    ERC1155Holder,
    IERC721Receiver,
    ReentrancyGuard
{
    using EnumerableSet for EnumerableSet.UintSet;

    Hero public heroContract;
    Items public itemsContract;
    WeaponsAndArmors public weaponsAndArmorsContract;

    address public gameAddress;

    // Mapping: heroId => (itemId => amount)
    mapping(uint256 => mapping(uint256 => uint256)) public heroToItems;
    mapping(uint256 => uint256) public heroTotalItems;

    // Mapping: heroId => set of itemIds
    mapping(uint256 => EnumerableSet.UintSet) private heroItemIds;

    // Mapping: heroId => (itemId => ERC721ItemIds)
    mapping(uint256 => uint256[]) public heroToERC721Items;

    //Equipment
    mapping(uint256 => Equipment) public heroEquipment;

    modifier onlyGameOrOwner() {
        require(
            msg.sender == gameAddress || msg.sender == owner(),
            "Not authorized: Only Game or Owner can perform this action"
        );
        _;
    }

    constructor(
        address _heroAddress,
        address _itemsAddress,
        address _weaponsAndArmorsAddress
    ) Ownable(msg.sender) {
        require(_heroAddress != address(0), "Invalid Hero contract address");
        require(_itemsAddress != address(0), "Invalid Items contract address");
        require(
            _weaponsAndArmorsAddress != address(0),
            "Invalid WeaponsAndArmors contract address"
        );
        heroContract = Hero(_heroAddress);
        itemsContract = Items(_itemsAddress);
        weaponsAndArmorsContract = WeaponsAndArmors(_weaponsAndArmorsAddress);
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

        console.log("adding itemId to heroId", heroId);
        heroItemIds[heroId].add(itemId);
        console.log("adding itemId amount to heroId", heroId);
        heroToItems[heroId][itemId] += amount;
        console.log("adding heroTotalItems amount to heroId", heroId);
        heroTotalItems[heroId] += amount;
    }

    function addERC721ItemToHero(
        uint256 heroId,
        uint256 tokenId
    ) external onlyGameOrOwner nonReentrant {
        require(
            weaponsAndArmorsContract.ownerOf(tokenId) == address(this),
            "Contract does not own this token"
        );
        require(
            heroContract.ownerOf(heroId) != address(0),
            "Hero does not exist"
        );
        require(
            heroTotalItems[heroId] + 1 <= 12,
            "Cannot exceed 12 items per hero"
        );
        heroToERC721Items[heroId].push(tokenId);
        heroTotalItems[heroId] += 1;
    }

    function equipItem(
        uint256 heroId,
        uint256 tokenId,
        EquipmentSlot slot
    ) external onlyGameOrOwner nonReentrant {
        require(
            heroContract.ownerOf(heroId) != address(0),
            "Hero does not exist"
        );
        require(
            _isItemOwnedByHero(heroId, tokenId),
            "Hero does not own this item"
        );
        require(isValidSlot(slot), "Invalid equipment slot");
        require(isSlotAvailable(heroId, slot), "Slot is already equipped");

        WeaponsAndArmors.ItemType itemType = weaponsAndArmorsContract
            .getItemType(tokenId);

        require(
            isItemCompatibleWithSlot(tokenId, slot),
            "Item cannot be equipped in this slot"
        );

        // Equip the item
        if (slot == EquipmentSlot.Head) {
            heroEquipment[heroId].Head = tokenId;
        } else if (slot == EquipmentSlot.Torso) {
            heroEquipment[heroId].Torso = tokenId;
        } else if (slot == EquipmentSlot.Pants) {
            heroEquipment[heroId].Pants = tokenId;
        } else if (slot == EquipmentSlot.Boots) {
            heroEquipment[heroId].Boots = tokenId;
        } else if (slot == EquipmentSlot.Weapon) {
            heroEquipment[heroId].Weapon = tokenId;
        }

        // Remove item from hero's inventory
        _removeERC721ItemFromHeroInventory(heroId, tokenId);
        heroTotalItems[heroId] -= 1;
    }

    function unequipItem(
        uint256 heroId,
        EquipmentSlot slot
    ) external onlyGameOrOwner {
        require(
            heroContract.ownerOf(heroId) != address(0),
            "Hero does not exist"
        );
        require(isValidSlot(slot), "Invalid equipment slot");
        uint256 tokenId = _getEquipmentSlotTokenId(heroId, slot);
        require(tokenId != 0, "No item equipped in this slot");
        require(
            heroTotalItems[heroId] + 1 <= 12,
            "Not enough space in inventory"
        );

        // Clear the equipment slot
        _clearEquipmentSlot(heroId, slot);

        // Add the item back to hero's inventory
        heroToERC721Items[heroId].push(tokenId);
        heroTotalItems[heroId] += 1;
    }

    function _getEquipmentSlotTokenId(
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

    function _clearEquipmentSlot(uint256 heroId, EquipmentSlot slot) internal {
        if (slot == EquipmentSlot.Head) {
            heroEquipment[heroId].Head = 0;
        } else if (slot == EquipmentSlot.Torso) {
            heroEquipment[heroId].Torso = 0;
        } else if (slot == EquipmentSlot.Pants) {
            heroEquipment[heroId].Pants = 0;
        } else if (slot == EquipmentSlot.Boots) {
            heroEquipment[heroId].Boots = 0;
        } else if (slot == EquipmentSlot.Weapon) {
            heroEquipment[heroId].Weapon = 0;
        }
    }

    function isItemCompatibleWithSlot(
        uint256 tokenId,
        EquipmentSlot slot
    ) internal view returns (bool) {
        WeaponsAndArmors.ItemType itemType = weaponsAndArmorsContract
            .getItemType(tokenId);

        if (slot == EquipmentSlot.Head) {
            return
                itemType == WeaponsAndArmors.ItemType.Armor &&
                weaponsAndArmorsContract.getArmorSlot(tokenId) ==
                ArmorTypeEnum.Head;
        } else if (slot == EquipmentSlot.Torso) {
            return
                itemType == WeaponsAndArmors.ItemType.Armor &&
                weaponsAndArmorsContract.getArmorSlot(tokenId) ==
                ArmorTypeEnum.Torso;
        } else if (slot == EquipmentSlot.Pants) {
            return
                itemType == WeaponsAndArmors.ItemType.Armor &&
                weaponsAndArmorsContract.getArmorSlot(tokenId) ==
                ArmorTypeEnum.Pants;
        } else if (slot == EquipmentSlot.Boots) {
            return
                itemType == WeaponsAndArmors.ItemType.Armor &&
                weaponsAndArmorsContract.getArmorSlot(tokenId) ==
                ArmorTypeEnum.Boots;
        } else if (slot == EquipmentSlot.Weapon) {
            return itemType == WeaponsAndArmors.ItemType.Weapon;
        }
        return false;
    }

    function _isItemOwnedByHero(
        uint256 heroId,
        uint256 tokenId
    ) internal view returns (bool) {
        uint256[] storage items = heroToERC721Items[heroId];
        for (uint256 i = 0; i < items.length; i++) {
            if (items[i] == tokenId) {
                return true;
            }
        }
        return false;
    }

    function _removeERC721ItemFromHeroInventory(
        uint256 heroId,
        uint256 tokenId
    ) internal {
        uint256[] storage items = heroToERC721Items[heroId];
        for (uint256 i = 0; i < items.length; i++) {
            if (items[i] == tokenId) {
                items[i] = items[items.length - 1];
                items.pop();
                break;
            }
        }
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

    function throwItem(
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
            "Not enough items to throw"
        );

        itemsContract.burn(address(this), itemId, amount);
        heroToItems[heroId][itemId] -= amount;
        heroTotalItems[heroId] -= amount;
        if (heroToItems[heroId][itemId] == 0) {
            heroItemIds[heroId].remove(itemId);
        }
    }

    function throwERC721Item(
        uint256 heroId,
        uint256 tokenId
    ) external onlyGameOrOwner nonReentrant {
        require(
            weaponsAndArmorsContract.ownerOf(tokenId) == address(this),
            "Contract does not own this token"
        );
        require(
            heroContract.ownerOf(heroId) != address(0),
            "Hero does not exist"
        );
        // burn the item
        weaponsAndArmorsContract.burn(tokenId);
        _removeERC721ItemFromHeroInventory(heroId, tokenId);
        heroTotalItems[heroId] -= 1;
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

    function getHeroInventory(
        uint256 heroId
    )
        external
        view
        returns (
            uint256[] memory erc721Ids,
            uint256[] memory weaponOrArmorId,
            uint16[] memory currentDurabilities,
            uint256[] memory itemIds,
            uint256[] memory amounts
        )
    {
        // Objets ERC721
        erc721Ids = heroToERC721Items[heroId];
        // Initialisation des tableaux
        weaponOrArmorId = new uint256[](erc721Ids.length);
        currentDurabilities = new uint16[](erc721Ids.length);

        // Vérification de la longueur avant d'accéder aux éléments
        for (uint256 i = 0; i < erc721Ids.length; i++) {
            weaponOrArmorId[i] = weaponsAndArmorsContract
                .getWeaponOrArmorTypeId(erc721Ids[i]);
            console.log(weaponsAndArmorsContract.getDurability(erc721Ids[i]));
            currentDurabilities[i] = weaponsAndArmorsContract.getDurability(
                erc721Ids[i]
            );
        }

        // Objets ERC1155
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

    function getFullInfoEquippedItems(
        uint256 heroId
    )
        external
        view
        returns (
            uint256[] memory erc721Ids,
            uint256[] memory weaponOrArmorId,
            uint16[] memory currentDurabilities
        )
    {
        Equipment memory equipment = heroEquipment[heroId];
        erc721Ids = new uint256[](5);
        weaponOrArmorId = new uint256[](5);
        currentDurabilities = new uint16[](5);

        if (equipment.Head != 0) {
            erc721Ids[0] = equipment.Head;
            weaponOrArmorId[0] = weaponsAndArmorsContract
                .getWeaponOrArmorTypeId(equipment.Head);
            currentDurabilities[0] = weaponsAndArmorsContract.getDurability(
                equipment.Head
            );
        }
        if (equipment.Torso != 0) {
            erc721Ids[1] = equipment.Torso;
            weaponOrArmorId[1] = weaponsAndArmorsContract
                .getWeaponOrArmorTypeId(equipment.Torso);
            currentDurabilities[1] = weaponsAndArmorsContract.getDurability(
                equipment.Torso
            );
        }
        if (equipment.Pants != 0) {
            erc721Ids[2] = equipment.Pants;
            weaponOrArmorId[2] = weaponsAndArmorsContract
                .getWeaponOrArmorTypeId(equipment.Pants);
            currentDurabilities[2] = weaponsAndArmorsContract.getDurability(
                equipment.Pants
            );
        }
        if (equipment.Boots != 0) {
            erc721Ids[3] = equipment.Boots;
            weaponOrArmorId[3] = weaponsAndArmorsContract
                .getWeaponOrArmorTypeId(equipment.Boots);
            currentDurabilities[3] = weaponsAndArmorsContract.getDurability(
                equipment.Boots
            );
        }
        if (equipment.Weapon != 0) {
            erc721Ids[4] = equipment.Weapon;
            weaponOrArmorId[4] = weaponsAndArmorsContract
                .getWeaponOrArmorTypeId(equipment.Weapon);
            currentDurabilities[4] = weaponsAndArmorsContract.getDurability(
                equipment.Weapon
            );
        }
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

    function getHeroTotalArmor(uint256 heroId) external view returns (uint16) {
        uint16 totalArmor = 0;
        Equipment memory equipment = heroEquipment[heroId];
        if (equipment.Head != 0) {
            ArmorInstance memory armor = weaponsAndArmorsContract.getArmor(
                equipment.Head
            );
            if (armor.currentDurability > 0) {
                totalArmor += weaponsAndArmorsContract.getArmorDefense(
                    equipment.Head
                );
            }
        }
        if (equipment.Torso != 0) {
            ArmorInstance memory armor = weaponsAndArmorsContract.getArmor(
                equipment.Torso
            );
            if (armor.currentDurability > 0) {
                totalArmor += weaponsAndArmorsContract.getArmorDefense(
                    equipment.Torso
                );
            }
        }
        if (equipment.Pants != 0) {
            ArmorInstance memory armor = weaponsAndArmorsContract.getArmor(
                equipment.Pants
            );
            if (armor.currentDurability > 0) {
                totalArmor += weaponsAndArmorsContract.getArmorDefense(
                    equipment.Pants
                );
            }
        }
        if (equipment.Boots != 0) {
            ArmorInstance memory armor = weaponsAndArmorsContract.getArmor(
                equipment.Boots
            );
            if (armor.currentDurability > 0) {
                totalArmor += weaponsAndArmorsContract.getArmorDefense(
                    equipment.Boots
                );
            }
        }
        return totalArmor;
    }

    // Fonction pour réduire la durabilité des objets équipés
    function reduceItemDurability(
        uint256 heroId,
        EquipmentSlot slot,
        uint16 amount
    ) external onlyGameOrOwner returns (uint16) {
        uint256 tokenId = _getEquipmentSlotTokenId(heroId, slot);
        require(tokenId != 0, "No item equipped in this slot");

        uint16 durability = weaponsAndArmorsContract.reduceDurability(tokenId, amount);

        if (durability == 0) {
            // L'item est détruit, le déséquiper
            _clearEquipmentSlot(heroId, slot);
        }
        return durability;
    }

    

    // Implémentation de l'interface IERC721Receiver
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function hasERC721Item(
        uint256 heroId,
        uint256 tokenId
    ) external view returns (bool) {
        uint256[] memory items = heroToERC721Items[heroId];
        for (uint256 i = 0; i < items.length; i++) {
            if (items[i] == tokenId) {
                return true;
            }
        }
        Equipment memory equipment = heroEquipment[heroId];
        if (
            equipment.Head == tokenId ||
            equipment.Torso == tokenId ||
            equipment.Pants == tokenId ||
            equipment.Boots == tokenId ||
            equipment.Weapon == tokenId
        ) {
            return true;
        }
        return false;
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
