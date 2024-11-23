// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

struct HeroStats {
    uint16 HPMax;
    uint16 HP;
    uint256 XP;
    uint16 STR;
    uint16 AGI;
    uint16 PER;
    uint16 INT;
    uint16 CON;
    uint256 lastUpdateTime;
    uint256 ENERGY;
    string DAMAGE;
    uint16 ARMOR;
    uint16 LEVEL;
    uint16 unspentStatPoints;
}

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
    ARMOR,
    DUR
}

struct StatModifiersStruct {
    StatType stat;
    int16 amount; // Positive or negative
    uint256 duration; // Duration in seconds, 0 for permanent
}

enum EquipmentSlot {
    Head,
    Torso,
    Pants,
    Boots,
    Weapon
}

struct Equipment {
    uint256 Head;
    uint256 Torso;
    uint256 Pants;
    uint256 Boots;
    uint256 Weapon;
}

// Structures pour les instances
struct WeaponInstance {
    uint256 tokenId;
    uint256 typeId;
    string name;
    string damage;
    uint16 maxDurability;
    uint16 currentDurability;
    string damageType;
}

struct ArmorInstance {
    uint256 tokenId;
    uint256 typeId;
    string name;
    uint16 defense;
    uint16 maxDurability;
    uint16 currentDurability;
    ArmorTypeEnum armorSlot;
}

enum ArmorTypeEnum {
    Head,
    Torso,
    Pants,
    Boots
}
