// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

struct Monster {
    uint256 id;
    uint256 weight;
}

struct Node {
    uint256 id;
    string name;
    bool canSearch;
    uint16 searchDiff;
    uint256 cooldownPeriod;
    bool isShelter;
    uint256 dangerosity;
    Monster[] monsters;
}
