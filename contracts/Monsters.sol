// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {HeroStats} from "./globals/heroes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Monsters is Ownable {
    mapping(uint256 => HeroStats) public monsterStats;
    mapping(uint256 => string) public names;
    mapping(uint256 => string) public damages;

    constructor() Ownable(msg.sender) {}

    function createMonster(
        uint256 id,
        string memory monsterName,
        uint8 HP,
        uint8 STR,
        uint8 AGI,
        uint8 PER,
        uint8 INT,
        uint8 CON, 
        string memory damage,
        uint8 armor,
        uint8 XP
    ) public onlyOwner {

        monsterStats[id] = HeroStats({
            HPMax: HP,
            HP: HP,
            XP: XP,
            STR: STR,
            AGI: AGI,
            PER: PER,
            INT: INT,
            CON: CON,
            lastUpdateTime: block.timestamp,
            ENERGY: 100,
            DAMAGE: damage,
            ARMOR: armor,
            LEVEL: 1,
            unspentStatPoints: 0
        });
        names[id] = monsterName;
        damages[id] = damage;
    }

    function setMonsterStats(
        uint256 _monsterId,
        uint8 HP,
        uint8 STR,
        uint8 AGI,
        uint8 PER,
        uint8 INT,
        uint8 CON,
        string memory damage,
        uint8 armor
    ) public onlyOwner {
        monsterStats[_monsterId] = HeroStats({
            HPMax: HP,
            HP: HP,
            XP: 0,
            STR: STR,
            AGI: AGI,
            PER: PER,
            INT: INT,
            CON: CON,
            lastUpdateTime: block.timestamp,
            ENERGY: 100,
            DAMAGE: damage,
            ARMOR: armor,
            LEVEL: 1,
            unspentStatPoints: 0
        });
    }

    function setName(
        uint256 _monsterId,
        string memory monsterName
    ) public onlyOwner {
        names[_monsterId] = monsterName;
    }

    function getMonsterStats(
        uint256 _monsterId
    ) public view returns (HeroStats memory) {
        return monsterStats[_monsterId];
    }

    function setDamages(
        uint256 _monsterId,
        string memory damage
    ) public onlyOwner {
        damages[_monsterId] = damage;
    }

    function getName(uint256 _monsterId) public view returns (string memory) {
        return names[_monsterId];
    }

    function getMonster(uint256 _monsterId)
        public
        view
        returns (string memory, HeroStats memory, string memory)
    {
        return (names[_monsterId], monsterStats[_monsterId], damages[_monsterId]);
    }
}
