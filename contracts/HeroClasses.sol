// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract HeroClasses is Ownable {
    struct HeroClass {
        string name;
        string description;
        string maleSkinURI;
        string femaleSkinURI;
    }

    HeroClass[] public classes;

    event ClassAdded(uint256 classId, string name, string description);

    constructor() Ownable(msg.sender) {}
 
    function addClass(
        string memory name,
        string memory description,
        string memory maleSkinURI,
        string memory femaleSkinURI
    ) public {
        classes.push(HeroClass({
            name: name,
            description: description,
            maleSkinURI: maleSkinURI,
            femaleSkinURI: femaleSkinURI
        }));
        emit ClassAdded(classes.length - 1, name, description);
    }

    function getClass(uint256 classIndex) public view returns (HeroClass memory) {
        require(classIndex < classes.length, "Class index out of range");
        return classes[classIndex];
    }

    function updateClass(
        uint256 classIndex,
        string memory name,
        string memory description,
        string memory maleSkinURI,
        string memory femaleSkinURI
    ) public {
        require(classIndex < classes.length, "Class index out of range");
        HeroClass storage heroClass = classes[classIndex];
        heroClass.name = name;
        heroClass.description = description;
        heroClass.maleSkinURI = maleSkinURI;
        heroClass.femaleSkinURI = femaleSkinURI;
    }
}
