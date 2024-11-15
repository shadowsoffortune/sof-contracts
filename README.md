# sof-contracts
smart contracts of the game Shadows of Fortune

## Contracts

### [World.sol](contracts/World.sol)

The `World` contract manages the game world including nodes, edges, the items and monsters you might encounter.

### [Hero.sol](contracts/Hero.sol)

The `Hero` contract manages hero NFTs, including their stats, names, and classes.

### [HeroClasses.sol](contracts/HeroClasses.sol)

The `HeroClasses` contract manages different hero classes and their attributes.

### [Items.sol](contracts/Items.sol)

The `Items` contract manages in-game items, including weapons, armor, and consumables.

### [HeroInventories.sol](contracts/HeroInventories.sol)

The `HeroInventories` contract manages the inventory of heroes, including items and equipment.

## Tests

Tests are located in the [test](test) directory. Example test files include:

- [world.test.ts](test/world.test.ts)
- [game.test.ts](test/game.test.ts)

## Scripts

Scripts used to deploy contracts and game datas based on a tierce app on blockchain local or testnet.

## Setup

1. Install dependencies:

    ```sh
    yarn
    ```

2. Compile contracts:

    ```sh
    npx hardhat compile
    ```

3. Run tests:

    ```sh
    npx hardhat test
    ```

4. Run a node locally:

    ```sh
    npx hardhat node
    ```

5. Deploy contracts and data on your local blockchain:

    ```sh
    npx hardhat run scripts/deploy_and_create_world.ts --network localhost
    ```

6. Import wallet key and play with wallet 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, the first wallet created from hardhat node.

## License

This project is licensed under the MIT License.

