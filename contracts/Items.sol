// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import {StatModifiersStruct} from "./globals/heroes.sol";

import "hardhat/console.sol";

contract Items is ERC1155, Ownable {
    address public gameAddress;

    modifier onlyGameOrOwner() {
        require(
            msg.sender == gameAddress || msg.sender == owner(),
            "Not authorized: Only Game or Owner can perform this action"
        );
        _;
    }

    enum ItemType {
        Weapon,
        Armor,
        Consumable,
        Resource
    }

    struct Item {
        uint256 id;
        string name;
        ItemType itemType;
    }

    struct Weapon {
        uint256 id;
        string damage;
        uint16 resistance;
        string damageType;
    }

    enum ArmorType {
        Head,
        Torso,
        Pants,
        Boots
    }
    struct Armor {
        uint256 id;
        uint8 defense;
        uint16 resistance;
        ArmorType armorType;
    }

    struct Consumable {
        uint256 id;
        StatModifiersStruct[] statModifiers;
    }

    // Mappings
    mapping(uint256 => Item) public items;
    mapping(uint256 => Weapon) public weapons;
    mapping(uint256 => Armor) public armors;
    mapping(uint256 => Consumable) public consumables;

    struct ItemInput {
        uint256 id;
        string name;
        ItemType itemType;
        string damage;
        uint8 defense;
        uint16 resistance;
        string damageType;
        ArmorType armorType;
        StatModifiersStruct[] statModifiers;
    }

    constructor() ERC1155("") Ownable(msg.sender) {}

    function setGameAddress(address _gameAddress) external onlyOwner {
        gameAddress = _gameAddress;
    }

    function itemExists(uint256 id) internal view returns (bool) {
        return items[id].id != 0;
    }
    function addItems(ItemInput[] calldata _inputItems) external onlyOwner {
        uint256 length = _inputItems.length;

        for (uint256 i = 0; i < length; i++) {
            ItemInput memory inputItem = _inputItems[i];
            uint256 id = inputItem.id;

            require(!itemExists(id), "Item already exists");

            items[id] = Item({
                id: id,
                name: inputItem.name,
                itemType: inputItem.itemType
            });
            if (inputItem.itemType == ItemType.Weapon) {
                weapons[id] = Weapon({
                    id: id,
                    damage: inputItem.damage,
                    resistance: inputItem.resistance,
                    damageType: inputItem.damageType
                });
            } else if (inputItem.itemType == ItemType.Armor) {
                armors[id] = Armor({
                    id: id,
                    defense: inputItem.defense,
                    resistance: inputItem.resistance,
                    armorType: inputItem.armorType
                });
            } else if (inputItem.itemType == ItemType.Consumable) {
                Consumable storage newConsumable = consumables[id];
                newConsumable.id = id;

                uint256 modifiersLength = inputItem.statModifiers.length;
                for (uint256 j = 0; j < modifiersLength; j++) {
                    newConsumable.statModifiers.push(
                        inputItem.statModifiers[j]
                    );
                }
            }
        }
    }

    function addWeapon(
        uint256 id,
        string memory name,
        string memory damage,
        uint16 resistance,
        string memory damageType
    ) external onlyOwner {
        items[id] = Item({id: id, name: name, itemType: ItemType.Weapon});

        weapons[id] = Weapon({
            id: id,
            damage: damage,
            resistance: resistance,
            damageType: damageType
        });
    }

    function addArmor(
        uint256 id,
        string memory name,
        uint8 defense,
        uint16 resistance,
        ArmorType armorType
    ) external onlyOwner {
        items[id] = Item({id: id, name: name, itemType: ItemType.Armor});

        armors[id] = Armor({
            id: id,
            defense: defense,
            resistance: resistance,
            armorType: armorType
        });
    }

    function addConsumable(
        uint256 id,
        string memory name,
        StatModifiersStruct[] calldata statModifiers
    ) external onlyOwner {
        items[id] = Item({id: id, name: name, itemType: ItemType.Consumable});

        Consumable storage newConsumable = consumables[id];
        newConsumable.id = id;

        uint256 modifiersLength = statModifiers.length;
        for (uint256 j = 0; j < modifiersLength; j++) {
            newConsumable.statModifiers.push(statModifiers[j]);
        }
    }

    function getWeapon(uint256 id) external view returns (Weapon memory) {
        require(items[id].itemType == ItemType.Weapon, "Item is not a weapon");
        return weapons[id];
    }

    function getArmorDefense(uint256 id) external view returns (uint8 armor) {
        require(items[id].itemType == ItemType.Armor, "Item is not armor");
        return armors[id].defense;
    }

    function getConsumable(
        uint256 id
    ) external view returns (Consumable memory) {
        require(
            items[id].itemType == ItemType.Consumable,
            "Item is not a consumable"
        );
        return consumables[id];
    }

    function getArmorType(uint256 itemId) external view returns (ArmorType) {
        require(items[itemId].itemType == ItemType.Armor, "Item is not armor");
        return armors[itemId].armorType;
    }

    function initializeItems(Item[] calldata itemsData) external onlyOwner {
        for (uint256 i = 0; i < itemsData.length; i++) {
            Item calldata item = itemsData[i];
            items[item.id] = item;
        }
    }

    function isValidItem(uint256 itemId) external view returns (bool) {
        return items[itemId].id != 0;
    }

    function getItem(uint256 itemId) external view returns (Item memory) {
        return items[itemId];
    }

    function getItemType(uint256 itemId) external view returns (ItemType) {
        require(items[itemId].id != 0, "Item does not exist");
        return items[itemId].itemType;
    }

    function isConsumable(uint256 itemId) external view returns (bool) {
        return items[itemId].itemType == ItemType.Consumable;
    }

    function mint(
        address to,
        uint256 id,
        uint256 amount
    ) public onlyGameOrOwner {
        _mint(to, id, amount, "");
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) public onlyOwner {
        _mintBatch(to, ids, amounts, "");
    }

    function burn(address account, uint256 id, uint256 amount) public {
        require(account == msg.sender || account == owner(), "Unauthorized");
        require(balanceOf(account, id) >= amount, "Not enough items to burn");
        _burn(account, id, amount);
    }

    function getAllStatModifiers(
        uint256 itemId
    ) external view returns (StatModifiersStruct[] memory) {
        require(
            items[itemId].itemType == ItemType.Consumable,
            "Item is not a consumable"
        );
        return consumables[itemId].statModifiers;
    }
}
