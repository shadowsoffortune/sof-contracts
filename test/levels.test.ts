import { expect } from "chai";
import { ethers } from "hardhat";
import { deployTokenFixture } from "./fixtures";
import { addHeroClass } from "./utils";
import { StatModifiersStructStruct } from '../typechain-types/contracts/Items';
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

enum StatType {
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
  ARMOR
}

describe("Levels Contract Tests", function () {

  it("Should level up hero when enough XP is gained", async function () {
    const { game, hero, addr1, owner } = await loadFixture(deployTokenFixture);

    // Mint a hero
    const payment = { value: ethers.parseEther("20") };
    await game.connect(addr1).mintHero(
      addr1.address,
      addr1.address,
      "LevelUpHero",
      0,
      10,
      10,
      10,
      10,
      10,
      true,
      payment
    );
    const heroId = await hero.getLastHeroId();

    // Level up the hero by adding XP
    const xpForLevel2 = await hero.getXPRequiredForNextLevel(heroId);
    await hero.connect(owner).addHeroXP(heroId, xpForLevel2);

    // Check if the hero leveled up
    const level = await hero.getHeroLevel(heroId);
    expect(level).to.equal(2);

    // Check unspent stat points
    const unspentPoints = await hero.getHeroUnspentStatPoints(heroId);
    expect(unspentPoints).to.equal(1);
  });


  it("Should allocate stat points after leveling up", async function () {
    const { game, hero, addr1, owner } = await loadFixture(deployTokenFixture);
    const payment = { value: ethers.parseEther("20") };

    // Mint a hero
    const txMint = await game.connect(addr1).mintHero(
      addr1.address,
      addr1.address,
      "StatAllocationHero",
      0,
      10,
      10,
      10,
      10,
      10,
      true,
      payment
    );
    await txMint.wait();

    const heroId = await hero.getLastHeroId();

    // Authorize addr1
    await game.authorizeAddress(addr1.address);

    // Level up the hero
    const xpGain = await hero.getXPRequiredForNextLevel(heroId);
    const addingTx = await hero.connect(owner).addHeroXP(heroId, xpGain);
    await addingTx.wait();

    // Allocate stat point
    await hero.connect(owner).increaseHeroStat(heroId, StatType.STR); // corresponds to StatType.STR

    // Check the updated stat and unspent stat points
    const heroStats = await hero.getHeroStats(heroId);
    expect(heroStats.STR).to.equal(11); // Increased from 10 to 11
    expect(heroStats.unspentStatPoints).to.equal(0);
  });

  it("Should prevent over-allocating stat points", async function () {
    const { game, hero, addr1, owner } = await loadFixture(deployTokenFixture);
    const payment = { value: ethers.parseEther("20") };

    // Mint a hero
    await game.connect(addr1).mintHero(
      addr1.address,
      addr1.address,
      "overallocatedHero",
      0,
      10,
      10,
      10,
      10,
      10,
      true,
      payment
    );

    const heroId = await hero.getLastHeroId();

    // Attempt to allocate stat point without having any unspent points
    await expect(
      hero.connect(owner).increaseHeroStat(heroId, StatType.STR) // corresponds to StatType.STR
    ).to.be.revertedWith("No unspent stat points");
  });

  it("Should prevent non-owners from allocating stat points", async function () {
    const { game, hero, addr1, addr2, owner } = await loadFixture(deployTokenFixture);
    const payment = { value: ethers.parseEther("20") };

    // Mint a hero for addr1
    await game.connect(addr1).mintHero(
      addr1.address,
      addr1.address,
      "ownershipHero",
      0,
      10,
      10,
      10,
      10,
      10,
      true,
      payment
    );

    const heroId = await hero.getLastHeroId();

    // Level up the hero to have unspent stat points
    const xpGain = await hero.getXPRequiredForNextLevel(heroId);
    await hero.connect(owner).addHeroXP(heroId, xpGain);

    // addr2 (not the owner) tries to allocate stat point
    await expect(
      hero.connect(addr2).increaseHeroStat(heroId, StatType.STR) // corresponds to StatType.STR
    ).to.be.revertedWith("Not authorized: Only Game or Owner can perform this action");
  });

  it("Should handle multiple level ups in one XP gain", async function () {
    const { game, hero, addr1, owner } = await loadFixture(deployTokenFixture);
    const payment = { value: ethers.parseEther("20") };

    // Mint a hero
    await game.connect(addr1).mintHero(
      addr1.address,
      addr1.address,
      "MultiLevelHero",
      0,
      10,
      10,
      10,
      10,
      10,
      true,
      payment
    );

    const heroId = await hero.getLastHeroId();

    // Calculate XP to reach level 4 directly
    const xpToLevel4 = await hero.getXPRequiredForLevel(4);

    console.log("xpToLevel4", xpToLevel4.toString());
    // Add XP
    await hero.connect(owner).addHeroXP(heroId, xpToLevel4);

    // Check level and unspent stat points
    const level = await hero.getHeroLevel(heroId);
    const unspentPoints = await hero.getHeroUnspentStatPoints(heroId);
    expect(level).to.equal(5);
    expect(unspentPoints).to.equal(4); // Levels gained = 3, so 3 unspent stat points
  });

  it("Should decrease unspent stat points correctly", async function () {
    const { game, hero, addr1, owner } = await loadFixture(deployTokenFixture);
    const payment = { value: ethers.parseEther("20") };

    // Mint a hero
    await game.connect(addr1).mintHero(
      addr1.address,
      addr1.address,
      "decUnspentPointsHero",
      0,
      10,
      10,
      10,
      10,
      10,
      true,
      payment
    );
    const heroId = await hero.getLastHeroId();

    // Level up the hero multiple times
    const xpGain = await hero.getXPRequiredForLevel(4)
    await hero.connect(owner).addHeroXP(heroId, xpGain);

    // Check unspent stat points
    let unspentPoints = await hero.getHeroUnspentStatPoints(heroId);
    expect(unspentPoints).to.equal(4);

    // Allocate two stat points
    await hero.connect(owner).increaseHeroStat(heroId, StatType.STR); // STR
    await hero.connect(owner).increaseHeroStat(heroId, StatType.AGI); // AGI

    // Check unspent stat points again
    unspentPoints = await hero.getHeroUnspentStatPoints(heroId);
    expect(unspentPoints).to.equal(2);
  });

  it("Should reset XP correctly and level up when threshold is crossed", async function () {
    const { game, hero, addr1, owner } = await loadFixture(deployTokenFixture);
    const payment = { value: ethers.parseEther("20") };

    // Mint a hero
    await game.connect(addr1).mintHero(
      addr1.address,
      addr1.address,
      "AccumulateXPHero",
      0,
      10,
      10,
      10,
      10,
      10,
      true,
      payment
    );

    const heroId = await hero.getLastHeroId();

    // Add XP in increments
    const xpIncrement = 50;
    await hero.connect(owner).addHeroXP(heroId, xpIncrement);
    await hero.connect(owner).addHeroXP(heroId, xpIncrement);
    await hero.connect(owner).addHeroXP(heroId, xpIncrement);

    // Get expected level
    const level = await hero.getHeroLevel(heroId);
    const unspentPoints = await hero.getHeroUnspentStatPoints(heroId);

    // Assuming level 2 is reached at 100 XP
    expect(level).to.equal(2);
    expect(unspentPoints).to.equal(1);

    // Check total XP
    const totalXP = await hero.getHeroXP(heroId);
    expect(totalXP).to.equal(50);
  });

});