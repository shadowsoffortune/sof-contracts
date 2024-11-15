// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./globals/heroes.sol";

contract StatModifier {

    // Modifier ID to StatModifier
    mapping(uint256 => StatModifiersStruct) public modifiers;

    // Item ID to array of Modifier IDs
    mapping(uint256 => uint256[]) public itemModifiers;

    uint256 public nextModifierId;

    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
        nextModifierId = 1; // Start IDs from 1
    }

    function addStatModifier(StatModifiersStruct calldata modifierData) external onlyOwner returns (uint256) {
        uint256 modifierId = nextModifierId++;
        modifiers[modifierId] = modifierData;
        return modifierId;
    }

    function assignModifiersToItem(uint256 itemId, uint256[] calldata modifierIds) external onlyOwner {
        itemModifiers[itemId] = modifierIds;
    }

    function getModifiersForItem(uint256 itemId) external view returns (uint256[] memory) {
        return itemModifiers[itemId];
    }

    function getStatModifier(uint256 modifierId) external view returns (StatModifiersStruct memory) {
        return modifiers[modifierId];
    }
}
