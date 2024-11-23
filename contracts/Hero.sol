// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./HeroClasses.sol";

import {HeroStats, StatType} from "./globals/heroes.sol";

import {EstforLibrary} from "./EstforLibrary.sol";

import {HeroNFTLibrary} from "./HeroNFTLibrary.sol";
import {HeroStatLibrary} from "./HeroStatLibrary.sol";

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract Hero is ERC721, Ownable {
    uint256 private _tokenIds;

    using EnumerableSet for EnumerableSet.UintSet;

    // Remplacez les mappings par des sets
    mapping(address => EnumerableSet.UintSet) private _ownedTokens;

    string baseURI;
    uint256 public price;
    address payable public teamAddress;

    event HeroLeveledUp(uint256 indexed heroId, uint16 newLevel);

    error NameTooShort();
    error NameTooLong();
    error NameAlreadyExists();
    error NameInvalidCharacters();
    error UnauthorizedCaller();
    error TokenIDDoesNotExist();
    error InsufficientPayment();
    error StatsDoNotAddUp();
    error StatsOutOfRange();
    error HeroDoesNotExist();
    error NoHeroesMinted();
    error NotAuthorized();

    enum Gender {
        Male,
        Female
    }

    using HeroStatLibrary for HeroStats;
    mapping(uint256 => HeroStats) public heroStats;

    mapping(uint playerId => string name) public names;
    mapping(string name => bool exists) public lowercaseNames;

    mapping(uint256 => uint256) public heroClassIndices;
    mapping(uint256 => Gender) public heroGenders;
    mapping(uint256 => uint256) public lastSavePointId;

    address public gameAddress;
    address public heroClassesAddress;
    address public heroActionsContract;

    modifier onlyGame() {
        if (msg.sender != gameAddress) {
            revert UnauthorizedCaller();
        }
        _;
    }

    modifier onlyGameOrOwner() {
        require(
            msg.sender == gameAddress || msg.sender == owner(),
            "Not authorized: Only Game or Owner can perform this action"
        );
        _;
    }

    constructor(
        string memory _initBaseURI,
        address payable _teamAddress,
        uint256 _initialPrice
    ) ERC721("SOF_HERO", "SOF_HERO") Ownable(msg.sender) {
        baseURI = _initBaseURI;
        teamAddress = _teamAddress;
        price = _initialPrice;
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = super._update(to, tokenId, auth);

        if (from != address(0)) {
            _ownedTokens[from].remove(tokenId);
        }
        if (to != address(0)) {
            _ownedTokens[to].add(tokenId);
        }
        return from;
    }

    function tokensOfOwner(
        address owner
    ) public view returns (uint256[] memory) {
        uint256[] memory tokens = new uint256[](_ownedTokens[owner].length());
        for (uint256 i = 0; i < tokens.length; ++i) {
            tokens[i] = _ownedTokens[owner].at(i);
        }
        return tokens;
    }

    function setPrice(uint256 _newPrice) public onlyOwner {
        price = _newPrice;
    }

    function getPrice() public view returns (uint256) {
        return price;
    }

    function setTeamAddress(address payable _newTeamAddress) public onlyOwner {
        teamAddress = _newTeamAddress;
    }

    function getHeroClassDetails(
        uint256 classIndex
    ) public view returns (HeroClasses.HeroClass memory) {
        HeroClasses heroClasses = HeroClasses(heroClassesAddress);
        return heroClasses.getClass(classIndex);
    }

    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        if (tokenId > _tokenIds) revert TokenIDDoesNotExist();
        uint256 classIndex = heroClassIndices[tokenId];
        Gender gender = heroGenders[tokenId];
        string memory heroName = names[tokenId];
        HeroClasses.HeroClass memory heroClass = getHeroClassDetails(
            classIndex
        );
        HeroStats memory stats = heroStats[tokenId];
        string memory imageURI = gender == Gender.Male
            ? heroClass.maleSkinURI
            : heroClass.femaleSkinURI;

        uint256 energy = getHeroEnergy(tokenId);
        uint256 XPRequiredForLevel = getXPRequiredForNextLevel(tokenId);

        return
            HeroNFTLibrary.uri(
                string(abi.encodePacked(baseURI, imageURI)),
                heroName,
                stats,
                energy,
                XPRequiredForLevel,
                heroClass,
                gender == Gender.Male
            );
    }

    function mint(
        address to,
        address payable playerWallet,
        string calldata _name,
        uint16 classIndex,
        uint16 strength,
        uint16 agility,
        uint16 perception,
        uint16 intelligence,
        uint16 constitution,
        bool gender
    ) public payable onlyGame returns (uint256) {
        if (msg.value < price) revert InsufficientPayment();
        if (strength + agility + perception + intelligence + constitution != 50)
            revert StatsDoNotAddUp();
        if (
            strength < 5 ||
            strength > 18 ||
            agility < 5 ||
            agility > 18 ||
            perception < 5 ||
            perception > 18 ||
            intelligence < 5 ||
            intelligence > 18 ||
            constitution < 5 ||
            constitution > 18
        ) revert StatsOutOfRange();
        // TODO: save class

        ++_tokenIds;
        _mint(to, _tokenIds);

        // New: Set hero stats
        heroStats[_tokenIds] = HeroStats({
            HPMax: 20,
            HP: 20,
            XP: 0,
            STR: strength,
            AGI: agility,
            PER: perception,
            INT: intelligence,
            CON: constitution,
            lastUpdateTime: block.timestamp,
            ENERGY: 100,
            DAMAGE: "1D2+0.15*STR",
            ARMOR: 0,
            LEVEL: 1,
            unspentStatPoints: 0
        });

        if(gender) {
            heroGenders[_tokenIds] = Gender.Male;
        } else {
            heroGenders[_tokenIds] = Gender.Female;
        }

        heroClassIndices[_tokenIds] = classIndex;

        _setName(_tokenIds, _name);

        uint256 splitPayment = msg.value / 2;
        teamAddress.transfer(splitPayment);
        playerWallet.transfer(msg.value - splitPayment);

        return _tokenIds;
    }

    function _setName(
        uint _playerId,
        string calldata _name
    ) private returns (string memory trimmedName, bool nameChanged) {
        // Trimmed name cannot be empty
        trimmedName = EstforLibrary.trim(_name);
        if (bytes(trimmedName).length < 3) {
            revert NameTooShort();
        }
        if (bytes(trimmedName).length > 20) {
            revert NameTooLong();
        }

        if (!EstforLibrary.containsValidNameCharacters(trimmedName)) {
            revert NameInvalidCharacters();
        }

        string memory trimmedAndLowercaseName = EstforLibrary.toLower(
            trimmedName
        );
        string memory oldName = EstforLibrary.toLower(names[_playerId]);
        nameChanged =
            keccak256(abi.encodePacked(oldName)) !=
            keccak256(abi.encodePacked(trimmedAndLowercaseName));
        if (nameChanged) {
            if (lowercaseNames[trimmedAndLowercaseName]) {
                revert NameAlreadyExists();
            }
            if (bytes(oldName).length != 0) {
                delete lowercaseNames[oldName];
            }
            lowercaseNames[trimmedAndLowercaseName] = true;
            names[_playerId] = trimmedName;
        }
    }

    function getName(uint _playerId) public view returns (string memory) {
        return names[_playerId];
    }

    function currentTokenId() public view returns (uint256) {
        return _tokenIds;
    }

    function getLastHeroId() public view returns (uint256) {
        if (_tokenIds == 0) revert NoHeroesMinted();
        return _tokenIds;
    }

    function changeHeroHP(uint256 tokenId, int16 HPChange) public onlyGame {
        if (ownerOf(tokenId) == address(0)) revert HeroDoesNotExist();
        heroStats[tokenId].changeHeroHP(HPChange);
    }

    function setHeroHP(uint256 tokenId, uint16 newHP) public onlyGame {
        if (ownerOf(tokenId) == address(0)) revert HeroDoesNotExist();
        heroStats[tokenId].setHeroHP(newHP);
    }

    function regenerateEnergy(uint256 heroId) public onlyGame {
        heroStats[heroId].regenerateEnergy();
    }

    function changeHeroDamages(
        uint256 heroId,
        string memory damage
    ) public onlyGame {
        heroStats[heroId].DAMAGE = damage;
    }

    function changeHeroArmor(uint256 heroId, uint16 armor) public onlyGame {
        heroStats[heroId].ARMOR = armor;
    }

    function changeEnergy(uint256 heroId, int16 energyChange) public onlyGameOrOwner() {
        heroStats[heroId].changeEnergy(energyChange);
    }

    function getHeroEnergy(uint256 tokenId) public view returns (uint256) {
        if (ownerOf(tokenId) == address(0)) revert HeroDoesNotExist();
        return heroStats[tokenId].getHeroEnergy();
    }

    function rest(uint256 heroId, uint256 nodeId) public onlyGame {
        setLastSavePoint(heroId, nodeId);
        setHeroHP(heroId, getHeroStats(heroId).HPMax);
        heroStats[heroId].setHeroEnergy(0);
    }

    function getHeroStats(
        uint256 tokenId
    ) public view returns (HeroStats memory) {
        if (ownerOf(tokenId) == address(0)) revert HeroDoesNotExist();
        return heroStats[tokenId];
    }

    function setLastSavePoint(uint256 tokenId, uint256 nodeId) public onlyGame {
        lastSavePointId[tokenId] = nodeId;
    }

    function getLastSavePoint(uint256 tokenId) public view returns (uint256) {
        return lastSavePointId[tokenId];
    }

    function setGameAddress(address _gameAddress) public onlyOwner {
        gameAddress = _gameAddress;
    }
    function setHeroClassesAddress(address _address) public onlyOwner {
        heroClassesAddress = _address;
    }

    function applyInstantStatModifier(
        uint256 heroId,
        StatType stat,
        int16 value
    ) external onlyGame {
        if (stat == StatType.HP) {
            changeHeroHP(heroId, value);
        }
        if (stat == StatType.ENERGY) {
            changeEnergy(heroId, value);
        }
    }

    // Leveling functions now delegate to the library
    function addHeroXP(uint256 tokenId, uint256 xpGain) public onlyGameOrOwner {
        if (ownerOf(tokenId) == address(0)) revert HeroDoesNotExist();
        heroStats[tokenId].addHeroXP(xpGain);
    }

    function increaseHeroStat(
        uint256 heroId,
        StatType stat
    ) external onlyGameOrOwner {
        heroStats[heroId].increaseHeroStat(stat);
    }

    // Getter functions
    function getHeroLevel(uint256 tokenId) public view returns (uint16) {
        return heroStats[tokenId].LEVEL;
    }

    function getHeroUnspentStatPoints(
        uint256 tokenId
    ) public view returns (uint16) {
        return heroStats[tokenId].unspentStatPoints;
    }

    function getHeroXP(uint256 tokenId) public view returns (uint256) {
        return heroStats[tokenId].XP;
    }

    function getXPRequiredForNextLevel(
        uint256 tokenId
    ) public view returns (uint256) {
        if (ownerOf(tokenId) == address(0)) revert HeroDoesNotExist();
        HeroStats storage stats = heroStats[tokenId];

        if (stats.LEVEL < HeroStatLibrary.MAX_LEVEL) {
            uint256 xpNeeded = HeroStatLibrary.xpThresholds()[stats.LEVEL];
            return xpNeeded;
        } else {
            return 0; // Max level reached
        }
    }

    function getXPRequiredForLevel(uint16 level) public view returns (uint256) {
        require(level <= HeroStatLibrary.MAX_LEVEL, "Level exceeds maximum");
        //cumlate the xp needed for each level
        uint256 xpNeeded = 0;
        for (uint16 i = 1; i <= level; i++) {
            xpNeeded += HeroStatLibrary.xpThresholds()[i];
        }
        return xpNeeded;
    }
}
