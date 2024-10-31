// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import "./HeroClasses.sol";

import {HeroStats} from "./globals/heroes.sol";

library HeroNFTLibrary {
    using Strings for uint256;

    function uri(
        string memory imageURI,
        string memory heroName,
        HeroStats memory stats,
        uint256 energy,
        uint256 XPRequiredForNextLevel,
        HeroClasses.HeroClass memory heroClass
    ) external pure returns (string memory) {
        string memory json = string(abi.encodePacked(
                        '{"name": "',
                        heroName,
                        '", "class": "',
                        heroClass.name,
                        '", "description": "',
                        heroClass.description,
                        '", "image": "',
                        imageURI,
                        '", "attributes": [',
                        _formatAttributes(stats,energy,XPRequiredForNextLevel),
                        "]}"
                    ));
        return string(abi.encodePacked("data:application/json;utf8,", json));
    }

    function _formatAttributes(
        HeroStats memory stats,
        uint256 energy,
        uint256 XPRequiredForNextLevel
    ) private pure returns (string memory) {
        return
            string(
                abi.encodePacked(
                    '{"trait_type": "Level", "value": ',
                    Strings.toString(stats.LEVEL),
                    "},",
                    '{"trait_type": "Max Health Points", "value": ',
                    Strings.toString(stats.HPMax),
                    "},",
                    '{"trait_type": "Health Points", "value": ',
                    Strings.toString(stats.HP),
                    "},",
                    '{"trait_type": "Energy", "value": ',
                    Strings.toString(energy),
                    "},",
                    '{"trait_type": "Experience Points", "value": ',
                    Strings.toString(stats.XP),
                    "},",
                    '{"trait_type": "Experience Points Required for Next Level", "value": ',
                    Strings.toString(XPRequiredForNextLevel),
                    "},",
                    '{"trait_type": "Unspent Stat Points", "value": ',
                    Strings.toString(stats.unspentStatPoints),
                    "},",
                    '{"trait_type": "Strength", "value": ',
                    Strings.toString(stats.STR),
                    "},",
                    '{"trait_type": "Agility", "value": ',
                    Strings.toString(stats.AGI),
                    "},",
                    '{"trait_type": "Perception", "value": ',
                    Strings.toString(stats.PER),
                    "},",
                    '{"trait_type": "Intelligence", "value": ',
                    Strings.toString(stats.INT),
                    "},",
                    '{"trait_type": "Constitution", "value": ',
                    Strings.toString(stats.CON),
                    "},",
                    '{"trait_type": "Damage", "value": "',
                    stats.DAMAGE,
                    '"},',
                    '{"trait_type": "Armor", "value": ',
                    Strings.toString(stats.ARMOR),
                    "}"
                )
            );
    }
}
