import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseEther } from "viem";

// Hardhat sometimes reports this revert by selector instead of name.
const NOT_REGISTERED = /NotRegistered|0xaba47339/;

const tiers = [
  { name: "Supporter", minTotal: parseEther("0.01"), perk: "Behind-the-scenes posts" },
  { name: "Insider", minTotal: parseEther("0.05"), perk: "Raw files + vote on next shoot" },
];

describe("FirstFan", () => {
  async function deploy() {
    const [creator, fan1, fan2, fan3, other] = await hre.viem.getWalletClients();
    const ff = await hre.viem.deployContract("FirstFan");
    const publicClient = await hre.viem.getPublicClient();
    const as = (w: typeof creator) =>
      hre.viem.getContractAt("FirstFan", ff.address, { client: { wallet: w } });
    return { ff, publicClient, creator, fan1, fan2, fan3, other, as };
  }

  async function withCreator() {
    const ctx = await deploy();
    await ctx.ff.write.registerCreator(["maya_shoots", "Maya", "Campus photographer", "", "Photography", 2, tiers]);
    return ctx;
  }

  describe("registration", () => {
    it("registers a creator with tiers and handle", async () => {
      const { ff, creator } = await loadFixture(withCreator);
      const [c, t] = await ff.read.getCreator([creator.account.address]);
      expect(c.handle).to.equal("maya_shoots");
      expect(c.foundingSlots).to.equal(2);
      expect(t.length).to.equal(2);
      expect(await ff.read.creatorCount()).to.equal(1n);
      const [byHandle] = await ff.read.getCreatorByHandle(["maya_shoots"]);
      expect(getAddress(byHandle.account)).to.equal(getAddress(creator.account.address));
    });

    it("rejects duplicate registration and taken handles", async () => {
      const { ff, as, fan1 } = await loadFixture(withCreator);
      await expect(ff.write.registerCreator(["another", "M", "", "", "Art", 1, []])).to.be.rejectedWith("AlreadyRegistered");
      const f1 = await as(fan1);
      await expect(f1.write.registerCreator(["maya_shoots", "X", "", "", "Art", 1, []])).to.be.rejectedWith("HandleTaken");
    });

    it("validates handle charset and length", async () => {
      const { ff } = await loadFixture(deploy);
      for (const bad of ["ab", "Has_Caps", "with space", "a".repeat(21), "emoji😀"]) {
        await expect(ff.write.registerCreator([bad, "N", "", "", "Art", 1, []])).to.be.rejectedWith("InvalidHandle");
      }
    });

    it("rejects non-ascending, zero and too many tiers", async () => {
      const { ff } = await loadFixture(deploy);
      const desc = [tiers[1], tiers[0]];
      await expect(ff.write.registerCreator(["abc", "N", "", "", "Art", 1, desc])).to.be.rejectedWith("InvalidTiers");
      const zero = [{ name: "Free", minTotal: 0n, perk: "" }];
      await expect(ff.write.registerCreator(["abc", "N", "", "", "Art", 1, zero])).to.be.rejectedWith("InvalidTiers");
      const six = Array.from({ length: 6 }, (_, i) => ({ name: `T${i}`, minTotal: BigInt(i + 1), perk: "" }));
      await expect(ff.write.registerCreator(["abc", "N", "", "", "Art", 1, six])).to.be.rejectedWith("InvalidTiers");
    });

    it("validates profile fields and founding slots", async () => {
      const { ff } = await loadFixture(deploy);
      await expect(ff.write.registerCreator(["abc", "", "", "", "Art", 1, []])).to.be.rejectedWith("InvalidLength");
      await expect(ff.write.registerCreator(["abc", "N", "", "", "Art", 0, []])).to.be.rejectedWith("InvalidLength");
      await expect(ff.write.registerCreator(["abc", "N", "x".repeat(281), "", "Art", 1, []])).to.be.rejectedWith(
        "InvalidLength",
      );
    });

    it("lets founding slots grow but never shrink", async () => {
      const { ff, creator } = await loadFixture(withCreator);
      await expect(ff.write.updateProfile(["Maya", "", "", "Photography", 1])).to.be.rejectedWith("InvalidLength");
      await ff.write.updateProfile(["Maya R", "new bio", "", "Photography", 5]);
      const [c] = await ff.read.getCreator([creator.account.address]);
      expect(c.name).to.equal("Maya R");
      expect(c.foundingSlots).to.equal(5);
    });

    it("blocks non-creators from creator-only actions", async () => {
      const { as, fan1 } = await loadFixture(withCreator);
      const f1 = await as(fan1);
      await expect(f1.write.publishPost([0, "hi", "", "", "0x"])).to.be.rejectedWith(NOT_REGISTERED);
      await expect(f1.write.setTiers([tiers])).to.be.rejectedWith(NOT_REGISTERED);
      await expect(f1.write.withdraw([fan1.account.address])).to.be.rejectedWith(NOT_REGISTERED);
      await expect(f1.write.createPoll([0, "q", ["a", "b"], 3600n])).to.be.rejectedWith(NOT_REGISTERED);
    });
  });

  describe("support", () => {
    it("records rank, totals, tiers and founding status", async () => {
      const { ff, as, creator, fan1, fan2, fan3, publicClient } = await loadFixture(withCreator);
      const c = creator.account.address;
      const f1 = await as(fan1);
      const f2 = await as(fan2);
      const f3 = await as(fan3);

      const hash = await f1.write.support([c, "first!"], { value: parseEther("0.01") });
      await publicClient.waitForTransactionReceipt({ hash });
      await f2.write.support([c, ""], { value: parseEther("0.002") });
      await f3.write.support([c, "late but loyal"], { value: parseEther("0.06") });
      await f1.write.support([c, "again"], { value: parseEther("0.04") });

      const [r1, tier1, founding1] = await ff.read.getSupporter([c, fan1.account.address]);
      expect(r1.rank).to.equal(1);
      expect(r1.total).to.equal(parseEther("0.05"));
      expect(r1.supportCount).to.equal(2);
      expect(tier1).to.equal(2);
      expect(founding1).to.equal(true);

      const [r2, tier2, founding2] = await ff.read.getSupporter([c, fan2.account.address]);
      expect(r2.rank).to.equal(2);
      expect(tier2).to.equal(0);
      expect(founding2).to.equal(true);

      const [r3, tier3, founding3] = await ff.read.getSupporter([c, fan3.account.address]);
      expect(r3.rank).to.equal(3);
      expect(tier3).to.equal(2);
      expect(founding3).to.equal(false); // only 2 founding slots

      const [profile] = await ff.read.getCreator([c]);
      expect(profile.supporterCount).to.equal(3);
      expect(profile.supportCount).to.equal(4);
      expect(profile.totalRaised).to.equal(parseEther("0.112"));
      expect(profile.balance).to.equal(parseEther("0.112"));

      const supporters = await ff.read.getSupporters([c, 0n, 10n]);
      expect(supporters.map((s) => getAddress(s.supporter))).to.deep.equal(
        [fan1, fan2, fan3].map((w) => getAddress(w.account.address)),
      );

      const recent = await ff.read.getCreatorSupports([c, 0n, 2n]);
      expect(recent.length).to.equal(2);
      expect(recent[0].note).to.equal("again"); // newest first
      expect(recent[1].note).to.equal("late but loyal");

      const passport = await ff.read.getFanPassport([fan1.account.address]);
      expect(passport.length).to.equal(1);
      expect(passport[0].record.rank).to.equal(1);
      expect(passport[0].founding).to.equal(true);
    });

    it("emits Supported with rank and running total", async () => {
      const { ff, as, creator, fan1, publicClient } = await loadFixture(withCreator);
      const f1 = await as(fan1);
      const hash = await f1.write.support([creator.account.address, "gm"], { value: parseEther("0.01") });
      await publicClient.waitForTransactionReceipt({ hash });
      const events = await ff.getEvents.Supported();
      expect(events.length).to.equal(1);
      expect(events[0].args.rank).to.equal(1);
      expect(events[0].args.amount).to.equal(parseEther("0.01"));
      expect(events[0].args.supporterTotal).to.equal(parseEther("0.01"));
      expect(events[0].args.note).to.equal("gm");
    });

    it("rejects unregistered creators, self-support, dust and long notes", async () => {
      const { ff, as, creator, fan1, other } = await loadFixture(withCreator);
      const f1 = await as(fan1);
      await expect(f1.write.support([other.account.address, ""], { value: parseEther("0.01") })).to.be.rejectedWith(
        NOT_REGISTERED,
      );
      await expect(ff.write.support([creator.account.address, ""], { value: parseEther("0.01") })).to.be.rejectedWith(
        "CannotSupportSelf",
      );
      await expect(
        f1.write.support([creator.account.address, ""], { value: parseEther("0.0009") }),
      ).to.be.rejectedWith("SupportTooSmall");
      await expect(
        f1.write.support([creator.account.address, "x".repeat(141)], { value: parseEther("0.01") }),
      ).to.be.rejectedWith("InvalidLength");
    });
  });

  describe("access control", () => {
    it("gates by tier, founding status and creator self-access", async () => {
      const { ff, as, creator, fan1, fan2, fan3, other } = await loadFixture(withCreator);
      const c = creator.account.address;
      await (await as(fan1)).write.support([c, ""], { value: parseEther("0.01") });
      await (await as(fan2)).write.support([c, ""], { value: parseEther("0.001") });
      await (await as(fan3)).write.support([c, ""], { value: parseEther("0.05") });

      expect(await ff.read.canAccess([c, other.account.address, 0])).to.equal(true);
      expect(await ff.read.canAccess([c, other.account.address, 1])).to.equal(false);
      expect(await ff.read.canAccess([c, fan1.account.address, 1])).to.equal(true);
      expect(await ff.read.canAccess([c, fan1.account.address, 2])).to.equal(false);
      expect(await ff.read.canAccess([c, fan3.account.address, 2])).to.equal(true);
      expect(await ff.read.canAccess([c, fan2.account.address, 255])).to.equal(true);
      expect(await ff.read.canAccess([c, fan3.account.address, 255])).to.equal(false);
      expect(await ff.read.canAccess([c, c, 2])).to.equal(true);
    });

    it("publishes public and gated posts with validation", async () => {
      const { ff, as, creator, fan1 } = await loadFixture(withCreator);
      await ff.write.publishPost([0, "Golden hour", "Shot on 35mm", "https://img/1.jpg", "0x"]);
      await ff.write.publishPost([1, "BTS", "Teaser", "", "0xdeadbeef"]);
      await ff.write.publishPost([255, "Founders only", "", "", "0x01"]);

      await expect(ff.write.publishPost([0, "x", "", "", "0x01"])).to.be.rejectedWith("InvalidLength");
      await expect(ff.write.publishPost([1, "x", "", "", "0x"])).to.be.rejectedWith("InvalidLength");
      await expect(ff.write.publishPost([3, "x", "", "", "0x01"])).to.be.rejectedWith("InvalidAccess");
      await expect(ff.write.publishPost([0, "", "", "", "0x"])).to.be.rejectedWith("InvalidLength");

      const posts = await ff.read.getRecentPosts([0n, 10n]);
      expect(posts.map((p) => p.title)).to.deep.equal(["Founders only", "BTS", "Golden hour"]);
      const mine = await ff.read.getCreatorPosts([creator.account.address, 1n, 1n]);
      expect(mine[0].title).to.equal("BTS");
      expect(await ff.read.canAccessPost([1n, fan1.account.address])).to.equal(false);
      await (await as(fan1)).write.support([creator.account.address, ""], { value: parseEther("0.01") });
      expect(await ff.read.canAccessPost([1n, fan1.account.address])).to.equal(true);
    });
  });

  describe("polls", () => {
    it("lets eligible supporters vote exactly once", async () => {
      const { ff, as, creator, fan1, fan2, other } = await loadFixture(withCreator);
      const c = creator.account.address;
      await ff.write.createPoll([1, "Next shoot location?", ["Lake", "Library", "Rooftop"], 86400n]);
      const f1 = await as(fan1);
      const f2 = await as(fan2);
      await f1.write.support([c, ""], { value: parseEther("0.01") });
      await f2.write.support([c, ""], { value: parseEther("0.001") });

      await f1.write.vote([0n, 2]);
      await expect(f1.write.vote([0n, 1])).to.be.rejectedWith("AlreadyVoted");
      await expect(f2.write.vote([0n, 0])).to.be.rejectedWith("NotEligible"); // below tier 1
      await expect((await as(other)).write.vote([0n, 0])).to.be.rejectedWith("NotEligible");
      await expect(ff.write.vote([0n, 0])).to.be.rejectedWith("NotEligible"); // creator
      await expect(f1.write.vote([0n, 9])).to.be.rejectedWith("InvalidPoll");

      const poll = await ff.read.getPoll([0n]);
      expect(poll.votes).to.deep.equal([0, 0, 1]);
      expect(await ff.read.voteOf([0n, fan1.account.address])).to.equal(3);
    });

    it("requires supporters even for public polls and closes on time", async () => {
      const { ff, as, creator, fan1, other } = await loadFixture(withCreator);
      await ff.write.createPoll([0, "Color or B&W?", ["Color", "B&W"], 3600n]);
      await expect((await as(other)).write.vote([0n, 0])).to.be.rejectedWith("NotEligible");
      const f1 = await as(fan1);
      await f1.write.support([creator.account.address, ""], { value: parseEther("0.001") });
      await expect(f1.write.vote([0n, 5])).to.be.rejectedWith("InvalidPoll");
      await time.increase(3601);
      await expect(f1.write.vote([0n, 0])).to.be.rejectedWith("PollClosed");
    });

    it("validates poll parameters", async () => {
      const { ff } = await loadFixture(withCreator);
      await expect(ff.write.createPoll([0, "q", ["only"], 3600n])).to.be.rejectedWith("InvalidPoll");
      await expect(ff.write.createPoll([0, "q", ["a", "b", "c", "d", "e"], 3600n])).to.be.rejectedWith("InvalidPoll");
      await expect(ff.write.createPoll([0, "q", ["a", "b"], 60n])).to.be.rejectedWith("InvalidPoll");
      await expect(ff.write.createPoll([4, "q", ["a", "b"], 3600n])).to.be.rejectedWith("InvalidAccess");
      await expect(ff.read.getPoll([7n])).to.be.rejected;
      await expect(ff.write.vote([7n, 0])).to.be.rejectedWith("InvalidPoll");
    });
  });

  describe("withdraw", () => {
    it("pays the creator and zeroes the balance", async () => {
      const { ff, as, creator, fan1, other, publicClient } = await loadFixture(withCreator);
      await (await as(fan1)).write.support([creator.account.address, ""], { value: parseEther("0.5") });
      const before = await publicClient.getBalance({ address: other.account.address });
      await ff.write.withdraw([other.account.address]);
      const after = await publicClient.getBalance({ address: other.account.address });
      expect(after - before).to.equal(parseEther("0.5"));
      const [c] = await ff.read.getCreator([creator.account.address]);
      expect(c.balance).to.equal(0n);
      expect(c.totalRaised).to.equal(parseEther("0.5"));
      await expect(ff.write.withdraw([other.account.address])).to.be.rejectedWith("NothingToWithdraw");
    });

    it("rejects zero address and failing recipients without losing funds", async () => {
      const { ff, as, creator, fan1 } = await loadFixture(withCreator);
      await (await as(fan1)).write.support([creator.account.address, ""], { value: parseEther("0.1") });
      await expect(ff.write.withdraw(["0x0000000000000000000000000000000000000000"])).to.be.rejectedWith("ZeroAddress");
      const rejecting = await hre.viem.deployContract("RejectingReceiver");
      await expect(ff.write.withdraw([rejecting.address])).to.be.rejectedWith("TransferFailed");
      const [c] = await ff.read.getCreator([creator.account.address]);
      expect(c.balance).to.equal(parseEther("0.1"));
    });

    it("blocks reentrancy during withdraw", async () => {
      const { ff, as, fan1, publicClient } = await loadFixture(deploy);
      const attacker = await hre.viem.deployContract("ReentrantCreator", [ff.address]);
      await attacker.write.register();
      const f1 = await as(fan1);
      await f1.write.support([attacker.address, ""], { value: parseEther("1") });
      await attacker.write.attack();
      expect(await attacker.read.reentryAttempts()).to.equal(1n);
      expect(await attacker.read.reentrySucceeded()).to.equal(false);
      expect(await publicClient.getBalance({ address: attacker.address })).to.equal(parseEther("1"));
      expect(await publicClient.getBalance({ address: ff.address })).to.equal(0n);
    });
  });
});
