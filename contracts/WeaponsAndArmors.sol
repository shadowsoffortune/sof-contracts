// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./globals/heroes.sol";
import "hardhat/console.sol";


contract WeaponsAndArmors is ERC721, Ownable {
    uint256 public constant WEAPON_ID_OFFSET = 10000;
    uint256 public constant ARMOR_ID_OFFSET = 20000;

    uint256 public nextTokenId;

    address public gameAddress;
    address public inventoryAddress;

    modifier onlyGameOrOwner() {
        require(
            msg.sender == gameAddress || msg.sender == owner(),
            "Not authorized: Only Game or Owner can perform this action"
        );
        _;
    }

    modifier onlyInventoryOrOwner() {
        require(
            msg.sender == inventoryAddress || msg.sender == owner(),
            "Not authorized: Only Game or Owner can perform this action"
        );
        _;
    }

    enum ItemType {
        Weapon,
        Armor
    }

    // Structures pour les types prédéfinis
    struct WeaponType {
        uint256 typeId;
        string name;
        string damage;
        uint16 maxDurability;
        string damageType;
    }

    struct ArmorType {
        uint256 typeId;
        string name;
        uint16 defense;
        uint16 maxDurability;
        ArmorTypeEnum armorSlot;
    }

    // Mappings pour les types prédéfinis
    mapping(uint256 => WeaponType) public weaponTypes;
    mapping(uint256 => ArmorType) public armorTypes;

    // Mappings pour les instances
    mapping(uint256 => ItemType) public itemTypes;
    mapping(uint256 => WeaponInstance) public weaponInstances;
    mapping(uint256 => ArmorInstance) public armorInstances;

    constructor() ERC721("WeaponsAndArmors", "SOFWAA") Ownable(msg.sender) {}

    function setGameAddress(address _gameAddress) external onlyOwner {
        gameAddress = _gameAddress;
    }

    function setInventoryAddress(address _inventoryAddress) external onlyOwner {
        inventoryAddress = _inventoryAddress;
    }

    function addWeaponType(
        uint256 typeId,
        string memory name,
        string memory damage,
        uint16 maxDurability,
        string memory damageType
    ) external onlyOwner {
        require(weaponTypes[typeId].typeId == 0, "Weapon type already exists");
        weaponTypes[typeId] = WeaponType({
            typeId: typeId,
            name: name,
            damage: damage,
            maxDurability: maxDurability,
            damageType: damageType
        });
    }

    function addArmorType(
        uint256 typeId,
        string memory name,
        uint16 defense,
        uint16 maxDurability,
        ArmorTypeEnum armorSlot
    ) external onlyOwner {
        require(armorTypes[typeId].typeId == 0, "Armor type already exists");
        armorTypes[typeId] = ArmorType({
            typeId: typeId,
            name: name,
            defense: defense,
            maxDurability: maxDurability,
            armorSlot: armorSlot
        });
    }

    // Fonctions pour mint des instances basées sur les types prédéfinis

    function mintWeapon(
        address to,
        uint256 typeId
    ) external onlyGameOrOwner returns (uint256) {
        require(weaponTypes[typeId].typeId != 0, "Weapon type does not exist");
        nextTokenId++;
        uint256 tokenId = nextTokenId;

        WeaponType memory weaponType = weaponTypes[typeId];

        weaponInstances[tokenId] = WeaponInstance({
            tokenId: tokenId,
            typeId: typeId,
            name: weaponType.name,
            damage: weaponType.damage,
            maxDurability: weaponType.maxDurability,
            currentDurability: weaponType.maxDurability,
            damageType: weaponType.damageType
        });

        itemTypes[tokenId] = ItemType.Weapon;

        _safeMint(to, tokenId);

        return tokenId;
    }

    function mintArmor(
        address to,
        uint256 typeId
    ) external onlyGameOrOwner returns (uint256) {
        require(armorTypes[typeId].typeId != 0, "Armor type does not exist");
        nextTokenId++;
        uint256 tokenId = nextTokenId;

        ArmorType memory armorType = armorTypes[typeId];

        armorInstances[tokenId] = ArmorInstance({
            tokenId: tokenId,
            typeId: typeId,
            name: armorType.name,
            defense: armorType.defense,
            maxDurability: armorType.maxDurability,
            currentDurability: armorType.maxDurability,
            armorSlot: armorType.armorSlot
        });

        itemTypes[tokenId] = ItemType.Armor;

        _safeMint(to, tokenId);

        return tokenId;
    }

    function reduceDurability(
        uint256 tokenId,
        uint16 amount
    ) external onlyInventoryOrOwner returns (uint16) {
        require(
            itemTypes[tokenId] == ItemType.Weapon ||
                itemTypes[tokenId] == ItemType.Armor,
            "Token is not an item"
        );
        uint16 durability = 0;
        if (itemTypes[tokenId] == ItemType.Weapon) {
            WeaponInstance storage weapon = weaponInstances[tokenId];
            require(
                weapon.currentDurability >= amount,
                "Not enough durability"
            );
            weapon.currentDurability -= amount;
            if (weapon.currentDurability == 0) {
                _burn(tokenId);
                delete weaponInstances[tokenId];
                delete itemTypes[tokenId];
            }
            durability = weapon.currentDurability;
        } else if (itemTypes[tokenId] == ItemType.Armor) {
            ArmorInstance storage armor = armorInstances[tokenId];
            require(armor.currentDurability >= amount, "Not enough durability");
            armor.currentDurability -= amount;
            if (armor.currentDurability == 0) {
                _burn(tokenId);
                delete armorInstances[tokenId];
                delete itemTypes[tokenId];
            }
            durability = armor.currentDurability;
        }
        return durability;
    }

    function burn(uint256 tokenId) external onlyInventoryOrOwner {
        require(
            itemTypes[tokenId] == ItemType.Weapon ||
                itemTypes[tokenId] == ItemType.Armor,
            "Token is not an item"
        );
        _burn(tokenId);
        if (itemTypes[tokenId] == ItemType.Weapon) {
            delete weaponInstances[tokenId];
        } else if (itemTypes[tokenId] == ItemType.Armor) {
            delete armorInstances[tokenId];
        }
        delete itemTypes[tokenId];
    }

    // Fonctions getter

    function getWeapon(
        uint256 tokenId
    ) external view returns (WeaponInstance memory) {
        require(itemTypes[tokenId] == ItemType.Weapon, "Token is not a weapon");
        return weaponInstances[tokenId];
    }

    function getArmor(
        uint256 tokenId
    ) external view returns (ArmorInstance memory) {
        require(itemTypes[tokenId] == ItemType.Armor, "Token is not an armor");
        return armorInstances[tokenId];
    }

    function getWeaponOrArmorTypeId(uint256 tokenId) external view returns (uint256) {
        require(
            itemTypes[tokenId] == ItemType.Weapon ||
                itemTypes[tokenId] == ItemType.Armor,
            "Token is not an item"
        );
        if (itemTypes[tokenId] == ItemType.Weapon) {
            WeaponInstance memory weapon = weaponInstances[tokenId];
            return weapon.typeId;
        } else if (itemTypes[tokenId] == ItemType.Armor) {
            ArmorInstance memory armor = armorInstances[tokenId];
            return armor.typeId;
        }
        revert("Invalid item type");
    }

    function getItemType(uint256 tokenId) external view returns (ItemType) {
        require(
            itemTypes[tokenId] == ItemType.Weapon ||
                itemTypes[tokenId] == ItemType.Armor,
            "Token is not an item"
        );
        return itemTypes[tokenId];
    }

    function getArmorSlot(
        uint256 tokenId
    ) external view returns (ArmorTypeEnum) {
        require(itemTypes[tokenId] == ItemType.Armor, "Token is not an armor");
        return armorInstances[tokenId].armorSlot;
    }

    function getArmorDefense(uint256 tokenId) external view returns (uint16) {
        require(itemTypes[tokenId] == ItemType.Armor, "Token is not an armor");
        return armorInstances[tokenId].defense;
    }

    function getDurability(
        uint256 tokenId
    ) external view returns (uint16 currentDurability) {
        require(
            itemTypes[tokenId] == ItemType.Weapon ||
                itemTypes[tokenId] == ItemType.Armor,
            "Token is not an item"
        );
        if (itemTypes[tokenId] == ItemType.Weapon) {
            WeaponInstance memory weapon = weaponInstances[tokenId];
            return weapon.currentDurability;
        } else if (itemTypes[tokenId] == ItemType.Armor) {
            ArmorInstance memory armor = armorInstances[tokenId];
            return armor.currentDurability;
        }
        revert("Invalid item type");
    }

    function repairItem(
        uint256 tokenId,
        int16 amount
    ) external onlyGameOrOwner {
        require(
            itemTypes[tokenId] == ItemType.Weapon ||
                itemTypes[tokenId] == ItemType.Armor,
            "Token is not an item"
        );
        if (itemTypes[tokenId] == ItemType.Weapon) {
            WeaponInstance storage weapon = weaponInstances[tokenId];
            int16 newDurability = int16(weapon.currentDurability) + amount;
            if (newDurability < 0) {
                newDurability = 0;
            } else if (newDurability > int16(weapon.maxDurability)) {
                newDurability = int16(weapon.maxDurability);
            }
            weapon.currentDurability = uint16(newDurability);
            
        } else if (itemTypes[tokenId] == ItemType.Armor) {
            ArmorInstance storage armor = armorInstances[tokenId];
            int16 newDurability = int16(armor.currentDurability) + amount;
            if (newDurability < 0) {
                newDurability = 0;
            } else if (newDurability > int16(armor.maxDurability)) {
                newDurability = int16(armor.maxDurability);
            }
            armor.currentDurability = uint16(newDurability);
        }
    }
    
}
