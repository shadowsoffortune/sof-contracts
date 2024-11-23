// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "hardhat/console.sol";

import {Node, Monster} from "./globals/world.sol";

contract World is Ownable {
    struct Item {
        uint256 id;
        string name;
        uint256 weight;
    }

    uint256[] public allowedCooldownPeriods = [
        6 * 3600,
        12 * 3600,
        24 * 3600,
        48 * 3600
    ];

    using EnumerableSet for EnumerableSet.UintSet;
    mapping(uint256 => EnumerableSet.UintSet) private heroSearchedNodes;
    mapping(uint256 => mapping(uint256 => uint256))
        public heroNodeLastSearchTime;

    mapping(address => bool) public authorizedAddresses;
    mapping(uint256 => Node) public nodes;
    mapping(uint256 => uint256) public heroLocations;
    mapping(uint256 => mapping(uint256 => bool)) public connections;

    uint256 public nodeCount;

    uint256 public defaultDangerosity = 1;
    mapping(uint256 => mapping(uint256 => uint256))
        public connectionDangerosity;

    mapping(uint256 => mapping(uint256 => uint256)) public nodeDangerosity;
    mapping(uint256 => Item[]) public itemsByNode;
    mapping(uint256 => mapping(uint256 => Monster[]))
        public monstersByConnection;

    uint256[] public defaultMonsters;
    uint256 private nonce = 0;

    event NodeCreated(uint256 indexed nodeId, string name);
    event NodeConnected(uint256 indexed fromNodeId, uint256 indexed toNodeId);
    event HeroPlaced(uint256 indexed tokenId, uint256 indexed nodeId);

    event HeroMoved(
        uint256 indexed tokenId,
        uint256 indexed fromNodeId,
        uint256 indexed toNodeId
    );

    address public gameAddress;

    modifier onlyGameOrOwner() {
        require(
            msg.sender == gameAddress || msg.sender == owner(),
            "Not authorized: Only Game or Owner can perform this action"
        );
        _;
    }

    modifier onlyGame() {
        require(
            msg.sender == gameAddress,
            "Unauthorized: caller is not the Game contract"
        );
        _;
    }

    constructor() Ownable(msg.sender) {}

    function createNode(
        uint256 nodeId,
        string memory name,
        bool canSearch,
        uint16 searchDiff,
        uint256 cooldownPeriod,
        bool isShelterBool,
        uint256 dangerosity,
        Monster[] memory monsters
    ) public onlyOwner {
        require(nodes[nodeId].id == 0, "Node ID already exists");
        if (cooldownPeriod == 0) {
            cooldownPeriod = 6 * 3600;
        } else {
            require(
                isAllowedCooldownPeriod(cooldownPeriod),
                "Cooldown period must be one of the allowed values"
            );
        }
        nodes[nodeId] = Node(
            nodeId,
            name,
            canSearch,
            searchDiff,
            cooldownPeriod,
            isShelterBool,
            dangerosity,
            monsters
        );
        ++nodeCount;
        emit NodeCreated(nodeId, name);
    }

    function getAllNodesAndConnectionsForHero(
        uint256 heroId
    )
        public
        view
        returns (
            Node[] memory,
            uint256[] memory,
            uint256[] memory,
            uint256[] memory,
            uint256[] memory,
            uint256[] memory
        )
    {
        Node[] memory allNodes = new Node[](nodeCount);
        uint256[] memory fromNodeIds = new uint256[](nodeCount * nodeCount);
        uint256[] memory toNodeIds = new uint256[](nodeCount * nodeCount);
        uint256[] memory dangerosities = new uint256[](nodeCount * nodeCount);
        uint256[] memory cooldowns = new uint256[](nodeCount);
        uint256[] memory lastSearchTimes = new uint256[](nodeCount);

        uint256 connectionCount = 0;

        for (uint256 i = 0; i < nodeCount; i++) {
            allNodes[i] = nodes[i];

            cooldowns[i] = getHeroCooldown(heroId, i);
            lastSearchTimes[i] = heroNodeLastSearchTime[heroId][i];

            for (uint256 j = 0; j < nodeCount; j++) {
                if (connections[i][j]) {
                    fromNodeIds[connectionCount] = i;
                    toNodeIds[connectionCount] = j;
                    dangerosities[connectionCount] = connectionDangerosity[i][
                        j
                    ];
                    connectionCount++;
                }
            }
        }

        assembly {
            mstore(fromNodeIds, connectionCount)
            mstore(toNodeIds, connectionCount)
            mstore(dangerosities, connectionCount)
        }

        return (
            allNodes,
            fromNodeIds,
            toNodeIds,
            dangerosities,
            cooldowns,
            lastSearchTimes
        );
    }

    function heroSearch(
        uint256 heroId,
        uint256 nodeId,
        address heroOwner,
        uint256 heroEXPL
    ) external onlyGame returns (uint256[] memory) {
        Node memory node = nodes[nodeId];
        require(node.canSearch, "Node is not searchable");
        require(
            heroLocations[heroId] == nodeId,
            "Hero is not in the specified node"
        );

        uint256 lastSearch = heroNodeLastSearchTime[heroId][nodeId];
        uint256 cooldownPeriod = node.cooldownPeriod;
        console.log("lastSearch", lastSearch);
        console.log("cooldownPeriod", cooldownPeriod);
        console.log("next cooldown", lastSearch + cooldownPeriod);
        require(
            block.timestamp >= lastSearch + cooldownPeriod,
            "Node is in cooldown for this hero"
        );

        heroNodeLastSearchTime[heroId][nodeId] = block.timestamp;
        heroSearchedNodes[heroId].add(nodeId);

        uint256 chance = (heroEXPL * 100) / (heroEXPL + node.searchDiff);
        uint256 randomValue = random();

        console.log("CHANCE", chance);
        console.log("RANDOM", randomValue);

        if (randomValue >= chance) {
            return new uint256[](0);
        } else {
            uint256 numItems = getNumberOfItems();
            uint256[] memory lootedItems = new uint256[](numItems);
            console.log("numItems", numItems);
            for (uint256 i = 0; i < numItems; i++) {
                lootedItems[i] = getLootForNode(nodeId);
                console.log(i, lootedItems[i]);
            }
            return lootedItems;
        }
    }

    function getNumberOfItems() internal returns (uint256) {
        uint256 rand = random();
        if (rand < 70) {
            return 1;
        } else if (rand < 90) {
            return 2;
        } else {
            return 3;
        }
    }

    function getNodeCooldownPeriod(
        uint256 nodeId
    ) public view returns (uint256) {
        return nodes[nodeId].cooldownPeriod;
    }

    function isAllowedCooldownPeriod(
        uint256 cooldownPeriod
    ) internal view returns (bool) {
        for (uint256 i = 0; i < allowedCooldownPeriods.length; i++) {
            if (allowedCooldownPeriods[i] == cooldownPeriod) {
                return true;
            }
        }
        return false;
    }

    function getAllHeroCoolDowns(
        uint256 heroId
    ) public view returns (uint256[] memory) {
        uint256[] memory cooldowns = new uint256[](nodeCount);
        for (uint256 i = 0; i < nodeCount; i++) {
            cooldowns[i] = getHeroCooldown(heroId, i);
        }
        return cooldowns;
    }

    function getHeroCooldown(
        uint256 heroId,
        uint256 nodeId
    ) public view returns (uint256) {
        uint256 lastSearch = heroNodeLastSearchTime[heroId][nodeId];
        uint256 cooldownPeriod = nodes[nodeId].cooldownPeriod;
        if (block.timestamp >= lastSearch + cooldownPeriod) {
            return 0;
        } else {
            return (lastSearch + cooldownPeriod) - block.timestamp;
        }
    }

    function getTimeUntilNextSearch(
        uint256 heroId,
        uint256 nodeId
    ) public view returns (uint256) {
        uint256 lastSearch = heroNodeLastSearchTime[heroId][nodeId];
        uint256 cooldownPeriod = nodes[nodeId].cooldownPeriod;
        if (block.timestamp >= lastSearch + cooldownPeriod) {
            return 0;
        } else {
            return (lastSearch + cooldownPeriod) - block.timestamp;
        }
    }

    function getNodesInCooldown(
        uint256 heroId
    ) public view returns (uint256[] memory) {
        EnumerableSet.UintSet storage nodesSet = heroSearchedNodes[heroId];
        uint256 totalNodes = nodesSet.length();
        uint256[] memory tempNodes = new uint256[](totalNodes);
        uint256 activeCount = 0;

        for (uint256 i = 0; i < totalNodes; i++) {
            uint256 nodeId = nodesSet.at(i);
            uint256 lastSearch = heroNodeLastSearchTime[heroId][nodeId];
            uint256 cooldownPeriod = nodes[nodeId].cooldownPeriod;

            if (block.timestamp < lastSearch + cooldownPeriod) {
                tempNodes[activeCount] = nodeId;
                activeCount++;
            }
        }

        uint256[] memory activeCooldownNodes = new uint256[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            activeCooldownNodes[i] = tempNodes[i];
        }

        return activeCooldownNodes;
    }

    function getNodesInCooldownForHero(
        uint256 heroId
    ) public view returns (uint256[] memory, uint256[] memory) {
        uint256 cooldownCount = 0;
        for (uint256 i = 0; i < nodeCount; i++) {
            uint256 lastSearch = heroNodeLastSearchTime[heroId][i];
            uint256 cooldownPeriod = nodes[i].cooldownPeriod;
            if (block.timestamp < lastSearch + cooldownPeriod) {
                cooldownCount++;
            }
        }

        uint256[] memory nodeIdsInCooldown = new uint256[](cooldownCount);
        uint256[] memory timeLeftInCooldown = new uint256[](cooldownCount);

        uint256 index = 0;
        for (uint256 i = 0; i < nodeCount; i++) {
            uint256 lastSearch = heroNodeLastSearchTime[heroId][i];
            uint256 cooldownPeriod = nodes[i].cooldownPeriod;
            if (block.timestamp < lastSearch + cooldownPeriod) {
                nodeIdsInCooldown[index] = i;
                timeLeftInCooldown[index] =
                    (lastSearch + cooldownPeriod) -
                    block.timestamp;
                index++;
            }
        }

        return (nodeIdsInCooldown, timeLeftInCooldown);
    }

    function addDefaultMonsters(uint256[] memory monsterIds) public onlyOwner {
        defaultMonsters = monsterIds;
    }

    function getMonsters() public view returns (uint256[] memory) {
        return defaultMonsters;
    }

    function setConnectionDangerosity(
        uint256 fromNodeId,
        uint256 toNodeId,
        uint256 dangerLevel
    ) public onlyOwner {
        require(
            nodes[fromNodeId].id != 0 && nodes[toNodeId].id != 0,
            "Node does not exist"
        );
        require(fromNodeId != toNodeId, "Cannot connect a node to itself");

        connectionDangerosity[fromNodeId][toNodeId] = dangerLevel;
        connectionDangerosity[toNodeId][fromNodeId] = dangerLevel;
    }

    function getLastNodeId() public view returns (uint256) {
        require(nodeCount > 0, "No nodes created yet");
        return nodeCount;
    }

    function connectNodes(
        uint256 fromNodeId,
        uint256 toNodeId,
        uint16 dangerosity,
        Monster[] memory monsters
    ) public onlyOwner {
        require(
            nodes[fromNodeId].id != 0 && nodes[toNodeId].id != 0,
            "Node does not exist"
        );
        require(fromNodeId != toNodeId, "Cannot connect a node to itself");

        connections[fromNodeId][toNodeId] = true;
        connections[toNodeId][fromNodeId] = true;
        connectionDangerosity[fromNodeId][toNodeId] = dangerosity;
        connectionDangerosity[toNodeId][fromNodeId] = dangerosity;

        for (uint256 i = 0; i < monsters.length; i++) {
            monstersByConnection[fromNodeId][toNodeId].push(monsters[i]);
            monstersByConnection[toNodeId][fromNodeId].push(monsters[i]);
        }

        emit NodeConnected(fromNodeId, toNodeId);
    }

    function getMonstersForConnection(
        uint256 fromNodeId,
        uint256 toNodeId
    ) public view returns (Monster[] memory) {
        require(connections[fromNodeId][toNodeId], "Nodes are not connected");
        return monstersByConnection[fromNodeId][toNodeId];
    }

    function updateMonstersForConnection(
        uint256 fromNodeId,
        uint256 toNodeId,
        Monster[] memory monsters
    ) public onlyOwner {
        require(connections[fromNodeId][toNodeId], "Nodes are not connected");

        delete monstersByConnection[fromNodeId][toNodeId];
        delete monstersByConnection[toNodeId][fromNodeId];

        for (uint256 i = 0; i < monsters.length; i++) {
            monstersByConnection[fromNodeId][toNodeId].push(monsters[i]);
            monstersByConnection[toNodeId][fromNodeId].push(monsters[i]);
        }
    }

    function removeMonstersFromConnection(
        uint256 fromNodeId,
        uint256 toNodeId
    ) public onlyOwner {
        require(connections[fromNodeId][toNodeId], "Nodes are not connected");

        delete monstersByConnection[fromNodeId][toNodeId];
        delete monstersByConnection[toNodeId][fromNodeId];
    }

    function addItemsToNode(
        uint256 nodeId,
        Item[] memory _items
    ) public onlyOwner {
        for (uint256 i = 0; i < _items.length; i++) {
            itemsByNode[nodeId].push(_items[i]);
        }
    }

    function removeItemsFromNode(
        uint256 nodeId,
        Item[] memory _items
    ) public onlyOwner {
        for (uint256 i = 0; i < _items.length; i++) {
            for (uint256 j = 0; j < itemsByNode[nodeId].length; j++) {
                if (itemsByNode[nodeId][j].id == _items[i].id) {
                    delete itemsByNode[nodeId][j];
                }
            }
        }
    }

    function placeHero(uint256 tokenId, uint256 nodeId) public onlyGameOrOwner {
        require(nodes[nodeId].id != 0, "Node does not exist");

        heroLocations[tokenId] = nodeId;
        emit HeroPlaced(tokenId, nodeId);
    }

    function moveHero(uint256 tokenId, uint256 toNodeId) public onlyGame {
        uint256 fromNodeId = heroLocations[tokenId];
        require(fromNodeId != 0, "Hero is not placed");
        require(nodes[toNodeId].id != 0, "Destination node does not exist");
        require(connections[fromNodeId][toNodeId], "Nodes are not connected");

        heroLocations[tokenId] = toNodeId;
        emit HeroMoved(tokenId, fromNodeId, toNodeId);
    }

    function getLootForNode(uint256 nodeId) public returns (uint256) {
        Item[] memory nodeItems = itemsByNode[nodeId];
        require(nodeItems.length > 0, "No items found for this node");

        uint256 totalWeight = 0;
        for (uint256 i = 0; i < nodeItems.length; i++) {
            totalWeight += nodeItems[i].weight;
        }

        uint256 rand = random(totalWeight) + 1;
        uint256 cumulativeWeight = 0;

        for (uint256 i = 0; i < nodeItems.length; i++) {
            cumulativeWeight += nodeItems[i].weight;
            if (rand <= cumulativeWeight) {
                return nodeItems[i].id;
            }
        }

        return nodeItems[0].id;
    }

    function getMonsterForNode(uint256 nodeId) public returns (uint256) {
        Monster[] memory nodeMonsters = nodes[nodeId].monsters;
        require(
            nodeMonsters.length > 0,
            "No monsters found for this node"
        );
        return selectMonster(nodeMonsters);
    }

    function getMonsterForConnection(
        uint256 fromNodeId,
        uint256 toNodeId
    ) public returns (uint256) {
        Monster[] memory connectionMonsters = monstersByConnection[fromNodeId][
            toNodeId
        ];
        require(
            connectionMonsters.length > 0,
            "No monsters found for this connection"
        );
        return selectMonster(connectionMonsters);
    }

    function selectMonster(Monster[] memory monsters) internal returns (uint256) {
        // Calculate total weight
        uint256 totalWeight = 0;
        for (uint256 i = 0; i < monsters.length; i++) {
            totalWeight += monsters[i].weight;
        }

        // Generate a random number between 1 and totalWeight
        uint256 rand = random(totalWeight) + 1;
        uint256 cumulativeWeight = 0;

        // Select the monster
        for (uint256 i = 0; i < monsters.length; i++) {
            cumulativeWeight += monsters[i].weight;
            if (rand <= cumulativeWeight) {
                return monsters[i].id;
            }
        }

        // If nothing is found, return the first monster
        return monsters[0].id;
    }

    // Updated: More efficient isConnected function
    function isConnected(
        uint256 fromNodeId,
        uint256 toNodeId
    ) public view returns (bool) {
        require(
            fromNodeId < nodeCount + 1 && toNodeId < nodeCount + 1,
            "Node does not exist"
        );
        return connections[fromNodeId][toNodeId];
    }

    // Updated: Get all connected nodes
    function getConnections(
        uint256 nodeId
    ) public view returns (uint256[] memory) {
        require(nodeId < nodeCount + 1, "Node does not exist");
        uint256[] memory connectedNodes = new uint256[](nodeCount);
        uint256 count = 0;

        for (uint256 i = 0; i < nodeCount; i++) {
            if (connections[nodeId][i]) {
                connectedNodes[count] = i;
                count++;
            }
        }

        // Resize the array to the actual number of connections
        assembly {
            mstore(connectedNodes, count)
        }
        return connectedNodes;
    }

    function getConnection(
        uint256 fromNodeId,
        uint256 toNodeId
    ) public view returns (bool) {
        return connections[fromNodeId][toNodeId];
    }

    function getConnectionDangerosity(
        uint256 fromNodeId,
        uint256 toNodeId
    ) public view returns (uint256) {
        return connectionDangerosity[fromNodeId][toNodeId];
    }

    function getNodeDangerosity(
        uint256 nodeId
    ) public view returns (uint256) {
        return nodes[nodeId].dangerosity;
    }

     function setNodeDangerosity(
        uint256 nodeId,
        uint256 dangerosity
    ) public onlyOwner {
        require(nodes[nodeId].id != 0, "Node does not exist");
        nodes[nodeId].dangerosity = dangerosity;
    }

    function getNodeSearchDiff(uint256 nodeId) public view returns (uint16) {
        return nodes[nodeId].searchDiff;
    }

    function getHeroNode(uint256 tokenId) public view returns (uint256) {
        return heroLocations[tokenId];
    }

    function getNode(uint256 nodeId) public view returns (Node memory) {
        return nodes[nodeId];
    }

    function getNodeName(uint256 nodeId) public view returns (string memory) {
        require(nodeId < nodeCount + 1, "Node does not exist");
        return nodes[nodeId].name;
    }

    function isShelter(uint256 nodeId) public view returns (bool) {
        return nodes[nodeId].isShelter;
    }

    function setGameAddress(address _gameAddress) public onlyOwner {
        gameAddress = _gameAddress;
    }

    function random(uint256 weight) private returns (uint256) {
        nonce++;
        return
            uint256(
                keccak256(
                    abi.encodePacked(block.timestamp, block.prevrandao, nonce)
                )
            ) % weight;
    }

    function random() private returns (uint256) {
        nonce++;
        return
            uint256(
                keccak256(
                    abi.encodePacked(block.timestamp, block.prevrandao, nonce)
                )
            ) % 100;
    }
}
