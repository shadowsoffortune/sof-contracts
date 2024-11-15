// utils.ts

import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { StatModifiersStructStruct } from '../typechain-types/contracts/Items';

export enum StatType {
  HP,
  HPMax,
  STR,
  AGI,
  PER,
  INT,
  CON,
  XP,
  ENERGY,
  DAMAGE,
  ARMOR,
}

// Fonction auxiliaire pour ajouter une classe de héros
export async function addHeroClass(heroClasses: any) {
  const tx = await heroClasses.addClass(
    "Veteran",
    "A Veteran is a hero who has seen many battles and has the scars to prove it.",
    "/api/metadata/hero/veteran/male.png",
    "/api/metadata/hero/veteran/female.png",
  );
  await tx.wait();
}

// Fonction auxiliaire pour mint un héros
export async function mintHero(
  addr: SignerWithAddress,
  gameContract: any,
  hero: any,
  name: string,
  classIndex: number
) {
  const payment = { value: ethers.parseEther("20") };
  const tx = await gameContract.connect(addr).mintHero(
    addr.address,
    addr.address, // playerWallet
    name,
    classIndex,
    10, // strength
    10, // agility
    10, // perception
    10, // intelligence
    10, // constitution
    true, // isMale
    payment
  );
  await tx.wait();
  const heroId = await hero.getLastHeroId();
  return heroId;
}
