// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

struct Node {
    uint256 id;
    string name;
    bool canSearch;
    uint8 searchDiff;
    uint256 cooldownPeriod;
    bool isShelter;
}
