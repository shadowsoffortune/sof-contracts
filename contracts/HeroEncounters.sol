// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract HeroEncounters is Ownable {
    struct Encounter {
        uint256 toNodeId;
        uint256 monsterType;
        bool isActive;
        uint8 actionType; // 0 = move, 1 = search
    }

    mapping(uint256 => Encounter) public encounters;

    address public gameAddress;
    constructor() Ownable(msg.sender) {}

    modifier onlyGame() {
        require(
            msg.sender == gameAddress,
            "Unauthorized: caller is not the Game contract"
        );
        _;
    }

    function initiateEncounter(
        uint256 tokenId,
        uint256 toNodeId,
        uint256 monsterType,
        uint8 actionType
    ) public onlyGame {
        require(!encounters[tokenId].isActive, "Encounter already active");
        encounters[tokenId] = Encounter({
            toNodeId: toNodeId,
            monsterType: monsterType,
            isActive: true,
            actionType: actionType
        });
    }

    function resolveEncounter(uint256 tokenId) public onlyGame {
        require(
            encounters[tokenId].isActive,
            "No active encounter to resolve."
        );
        encounters[tokenId].isActive = false;
    }

    function isEncounterActive(uint256 tokenId) public view returns (bool) {
        return encounters[tokenId].isActive;
    }

    function getActiveEncounter(
        uint256 tokenId
    ) public view returns (Encounter memory) {
        require(encounters[tokenId].isActive, "No active encounter");
        return encounters[tokenId];
    }

    function setGameAddress(address _gameAddress) public onlyOwner {
        gameAddress = _gameAddress;
    }
}
