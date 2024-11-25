// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./globals/heroes.sol";

library HeroStatLibrary {
    uint16 constant MAX_LEVEL = 30;

    function xpThresholds() internal pure returns (uint256[31] memory) {
        uint256[31] memory thresholds;
        thresholds[1] = 100;
        thresholds[2] = 150;
        thresholds[3] = 225;
        thresholds[4] = 337;
        thresholds[5] = 506;
        thresholds[6] = 759;
        thresholds[7] = 1139;
        thresholds[8] = 1708;
        thresholds[9] = 2562;
        thresholds[10] = 3844;
        thresholds[11] = 5766;
        thresholds[12] = 8649;
        thresholds[13] = 12973;
        thresholds[14] = 19459;
        thresholds[15] = 29188;
        thresholds[16] = 43782;
        thresholds[17] = 65673;
        thresholds[18] = 98509;
        thresholds[19] = 147763;
        thresholds[20] = 221644;
        thresholds[21] = 332466;
        thresholds[22] = 498699;
        thresholds[23] = 748048;
        thresholds[24] = 1122072;
        thresholds[25] = 1683108;
        thresholds[26] = 2524662;
        thresholds[27] = 3786993;
        thresholds[28] = 5680489;
        thresholds[29] = 8520733;
        return thresholds;
    }

    function xpRequiredForNextLevel(
        uint16 level
    ) internal pure returns (uint256) {
        require(level < MAX_LEVEL, "Already at max level");
        uint256[31] memory thresholds = xpThresholds();
        return thresholds[level];
    }

    function xpRequiredForLevel(uint16 level) internal pure returns (uint256) {
        require(level <= MAX_LEVEL, "Level exceeds maximum");
        uint256[31] memory thresholds = xpThresholds();
        return thresholds[level];
    }
    function addHeroXP(HeroStats storage stats, uint256 xpGain) internal {
        stats.XP += xpGain;

        while (stats.LEVEL < MAX_LEVEL) {
            uint256 xpNeeded = xpThresholds()[stats.LEVEL];
            if (stats.XP >= xpNeeded) {
                // Level up
                stats.XP -= xpNeeded; // Subtract the XP needed for the level up, keep the surplus
                stats.LEVEL += 1;
                stats.unspentStatPoints += 1; // Assuming 1 stat point per level
            } else {
                break;
            }
        }
    }

    function increaseHeroStat(HeroStats storage stats, StatType stat) internal {
        require(stats.unspentStatPoints > 0, "No unspent stat points");

        if (stat == StatType.STR) {
            stats.STR += 1;
            stats.HP +=1;
            stats.HPMax += 1;
        } else if (stat == StatType.AGI) {
            stats.AGI += 1;
        } else if (stat == StatType.PER) {
            stats.PER += 1;
        } else if (stat == StatType.INT) {
            stats.INT += 1;
        } else if (stat == StatType.CON) {
            stats.CON += 1;
            stats.HP +=2;
            stats.HPMax += 2;
        } else {
            revert("Invalid stat type");
        }

        stats.HPMax += 2;

        stats.unspentStatPoints -= 1;
    }

    function changeHeroHP(HeroStats storage stats, int16 HPChange) internal {
        int16 newHP = int16(stats.HP) + int16(HPChange);

        // Ensure newHP is within [0, HPMax]
        if (newHP < 0) {
            newHP = 0;
        } else if (newHP > int16(stats.HPMax)) {
            newHP = int16(stats.HPMax);
        }

        stats.HP = uint16(newHP);
    }

    function setHeroHP(HeroStats storage stats, uint16 newHP) internal {
        stats.HP = newHP > stats.HPMax ? stats.HPMax : newHP;
    }

    function setHeroEnergy(HeroStats storage stats, uint16 newEnergy) internal {
        stats.ENERGY = newEnergy > 100 ? 100 : newEnergy;
    }

    // Removed duplicate addHeroXP function

    function regenerateEnergy(HeroStats storage stats) internal {
        uint256 timeElapsed = block.timestamp - stats.lastUpdateTime;
        uint256 energyToRegen =  timeElapsed / 288;

        if (stats.ENERGY + energyToRegen > 100) {
            stats.ENERGY = 100;
        } else {
            stats.ENERGY += energyToRegen;
        }

        stats.lastUpdateTime = block.timestamp;
    }

    function changeEnergy(
        HeroStats storage stats,
        int16 energyChange
    ) internal {
        int16 newEnergy = int16(uint16(stats.ENERGY)) + energyChange;

        // Ensure newEnergy is within [0, 100]
        if (newEnergy < 0) {
            newEnergy = 0;
        } else if (newEnergy > 100) {
            newEnergy = 100;
        }

        stats.ENERGY = uint256(uint16(newEnergy));
    }

    function getHeroEnergy(
        HeroStats storage self
    ) internal view returns (uint256) {
        uint256 timeElapsed = block.timestamp - self.lastUpdateTime;
        uint256 energyToRegen = timeElapsed / 288;

        if (self.ENERGY + energyToRegen > 100) {
            return 100;
        } else {
            return self.ENERGY + energyToRegen;
        }
    }
}
