const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OnDrafts", function () {
  let owner, red, black;
  let onDrafts;
  const devFee = 100n;

  beforeEach(async () => {
    [owner, red, black] = await ethers.getSigners();
    const OnDrafts = await ethers.getContractFactory("OnDrafts");
    onDrafts = await OnDrafts.connect(owner).deploy(devFee);
    await onDrafts.waitForDeployment();
  });

  it("create, join, moves, fees, end", async () => {
    const code = "CODE123";
    const hash = ethers.keccak256(ethers.toUtf8Bytes(code));

    const tx = await onDrafts.connect(red).createGame(hash, "start");
    await tx.wait();

    const gameId = await onDrafts.nextGameId();
    expect(gameId).to.equal(1n);

    await expect(onDrafts.connect(black).joinGame(code))
      .to.emit(onDrafts, "GameJoined");

    let g = await onDrafts.games(1n);
    expect(g.active).to.equal(true);
    expect(g.turn).to.equal(0);

    await expect(onDrafts.connect(black).makeMove(1n, "b-move", { value: devFee }))
      .to.be.revertedWith("red's turn");

    await expect(onDrafts.connect(red).makeMove(1n, "r-move-1", { value: devFee }))
      .to.emit(onDrafts, "MoveMade");

    let bal = await onDrafts.devBalance();
    expect(bal).to.equal(devFee);

    g = await onDrafts.games(1n);
    expect(g.turn).to.equal(1);

    await expect(onDrafts.connect(black).makeMove(1n, "b-move-1", { value: devFee }))
      .to.emit(onDrafts, "MoveMade");

    bal = await onDrafts.devBalance();
    expect(bal).to.equal(2n * devFee);

    await expect(onDrafts.connect(owner).endGame(1n))
      .to.be.revertedWith("only players");

    await expect(onDrafts.connect(red).endGame(1n))
      .to.emit(onDrafts, "GameEnded");

    g = await onDrafts.games(1n);
    expect(g.active).to.equal(false);
  });

  it("owner can withdraw dev fees", async () => {
    const code = "A";
    const hash = ethers.keccak256(ethers.toUtf8Bytes(code));
    await (await onDrafts.connect(red).createGame(hash, "start")).wait();
    await (await onDrafts.connect(black).joinGame(code)).wait();
    await (await onDrafts.connect(red).makeMove(1n, "r-1", { value: devFee })).wait();

    const to = await red.getAddress();
    const balBefore = await ethers.provider.getBalance(to);
    const tx = await onDrafts.connect(owner).withdrawDevBalance(to, devFee);
    await tx.wait();
    const balAfter = await ethers.provider.getBalance(to);
    expect(balAfter > balBefore).to.equal(true);
  });
});
