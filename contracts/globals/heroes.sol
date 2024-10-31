// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

struct HeroStats {
    uint16 HPMax;
    uint16 HP;
    uint256 XP;
    uint8 STR;
    uint8 AGI;
    uint8 PER;
    uint8 INT;
    uint8 CON;
    uint256 lastUpdateTime;
    uint256 ENERGY;
    string DAMAGE;
    uint8 ARMOR;
    uint16 LEVEL;
    uint8 unspentStatPoints;
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
    ARMOR
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
