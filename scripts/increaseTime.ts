import { ethers } from "hardhat";

// increease time 
export async function increaseTime(seconds: number) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
}

// run the mine function
export async function mine() {
    await ethers.provider.send("evm_mine", []);
}

const main = async () => {
    await increaseTime(216000);
    await mine();
}

main();