// Seeds clearly-labelled DEMO creators, posts, polls and supports on-chain.
// Every action here is a real transaction from a demo wallet controlled by the
// FirstFan team; the web app badges these accounts as "Demo".
import fs from "node:fs";
import path from "node:path";
import hre from "hardhat";
import { createWalletClient, formatEther, http, parseEther, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { seal } from "./seal";

const img = (id: number, w = 1200, h = 900) => `https://picsum.photos/id/${id}/${w}/${h}`;

type Tier = { name: string; minTotal: bigint; perk: string };
type PostSeed = { access: number; title: string; body: string; imageURI: string; sealed?: { body: string; imageURI?: string } };
type CreatorSeed = {
  handle: string;
  name: string;
  bio: string;
  avatar: string;
  category: string;
  founding: number;
  tiers: Tier[];
  posts: PostSeed[];
  poll?: { access: number; question: string; options: string[]; days: number };
};

const CREATORS: CreatorSeed[] = [
  {
    handle: "maya_frames",
    name: "Maya Frames",
    bio: "Demo creator · Campus street & portrait photographer. Golden hour, film grain, people between classes.",
    avatar: img(250, 400, 400),
    category: "Photography",
    founding: 10,
    tiers: [
      { name: "Supporter", minTotal: parseEther("0.005"), perk: "Behind-the-scenes notes and full-res downloads" },
      { name: "Darkroom", minTotal: parseEther("0.02"), perk: "Raw files, edit breakdowns and a vote on the next shoot" },
    ],
    posts: [
      { access: 0, title: "Quad at 6:42 pm", body: "The library throws this light across the quad for about nine minutes a day. Shot handheld, 35mm.", imageURI: img(193) },
      { access: 0, title: "Between lectures", body: "Minimal frames from the walk to the design block.", imageURI: img(22) },
      {
        access: 1,
        title: "How I edit golden hour",
        body: "Supporters get my full edit breakdown for this frame.",
        imageURI: img(65),
        sealed: {
          body: "Edit recipe: lift shadows +18, warm WB to 5900K, split-tone highlights orange (hue 38, sat 14), shadows teal (hue 205, sat 8). Grain 22, size 30. I mask the sky separately and pull exposure -0.4 so the sun keeps its shape.",
          imageURI: img(399),
        },
      },
      {
        access: 255,
        title: "Founding fans: next zine",
        body: "A note for my first ten supporters only.",
        imageURI: img(240),
        sealed: { body: "I'm printing a 24-page campus zine next month. Founding fans get a signed copy and their name on the thank-you page — reply to the poll with your favourite frame." },
      },
    ],
    poll: { access: 1, question: "Where should the next shoot be?", options: ["Old library steps", "Night market", "Lakefront at dawn"], days: 14 },
  },
  {
    handle: "noor_loops",
    name: "Noor Loops",
    bio: "Demo creator · Bedroom producer making lo-fi and live sets for the campus radio.",
    avatar: img(145, 400, 400),
    category: "Music",
    founding: 25,
    tiers: [
      { name: "Listener", minTotal: parseEther("0.003"), perk: "Early demos and stems" },
      { name: "Crew", minTotal: parseEther("0.015"), perk: "Guest list for live sets and set-list votes" },
    ],
    posts: [
      { access: 0, title: "Live at the open mic", body: "First time playing the new loop pedal live. Thank you to everyone who stayed till midnight.", imageURI: img(453) },
      {
        access: 1,
        title: "Unreleased demo: 'Hostel Rain'",
        body: "Listeners get the private demo link.",
        imageURI: img(137),
        sealed: { body: "Private demo notes: 72 BPM, recorded on a phone mic in the hostel stairwell. Stems + private listening link are shared in the supporter Discord channel." },
      },
    ],
    poll: { access: 0, question: "Which track opens Friday's set?", options: ["Hostel Rain", "4am Canteen", "Last Bus"], days: 5 },
  },
  {
    handle: "arjun_draws",
    name: "Arjun Draws",
    bio: "Demo creator · Illustrator & visual designer. Posters, zines and sticker sheets for student clubs.",
    avatar: img(104, 400, 400),
    category: "Illustration",
    founding: 15,
    tiers: [{ name: "Patron", minTotal: parseEther("0.01"), perk: "Process files and printable wallpapers" }],
    posts: [
      { access: 0, title: "Poster system for Fest '26", body: "Building a modular type + icon kit so every club can make on-brand posters.", imageURI: img(252) },
      { access: 0, title: "Spring palette", body: "Colour study for the cultural night visuals.", imageURI: img(82) },
      {
        access: 1,
        title: "Process: from sketch to print",
        body: "Patrons get the layered process files.",
        imageURI: img(180),
        sealed: { body: "Process files: 3 thumbnail passes, 1 tight sketch, then vector in 4 layers (base, shadow, texture, type). Download link for the layered file is in the patron channel." },
      },
    ],
  },
];

const FAN_SUPPORTS: { fan: number; handle: string; amount: string; note: string }[] = [
  { fan: 0, handle: "maya_frames", amount: "0.02", note: "Your quad series made me look at campus differently." },
  { fan: 1, handle: "maya_frames", amount: "0.005", note: "Saving up for that zine!" },
  { fan: 0, handle: "noor_loops", amount: "0.004", note: "Hostel Rain on repeat." },
  { fan: 1, handle: "arjun_draws", amount: "0.01", note: "Need these posters for our club." },
];

async function main() {
  const secret = process.env.SEAL_SECRET;
  if (!secret) throw new Error("SEAL_SECRET is required (must match the web app's SEAL_SECRET)");
  const keys = (process.env.DEMO_PRIVATE_KEYS || "").split(",").filter(Boolean) as Hex[];
  if (keys.length < CREATORS.length + 2) throw new Error("Not enough DEMO_PRIVATE_KEYS");

  const deployment = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments", `${hre.network.name}.json`), "utf8"),
  ) as { address: Address };
  const publicClient = await hre.viem.getPublicClient();
  const [deployer] = await hre.viem.getWalletClients();
  const chain = publicClient.chain!;
  const transport = http((hre.network.config as { url?: string }).url ?? "http://127.0.0.1:8545");
  const abi = (await hre.artifacts.readArtifact("FirstFan")).abi;

  const creatorAccts = keys.slice(0, CREATORS.length).map((k) => privateKeyToAccount(k));
  const fanAccts = keys.slice(CREATORS.length, CREATORS.length + 2).map((k) => privateKeyToAccount(k));
  async function send(acct: ReturnType<typeof privateKeyToAccount>, fn: string, args: unknown[], value?: bigint) {
    const w = createWalletClient({ account: acct, chain, transport });
    const hash = await w.writeContract({ address: deployment.address, abi, functionName: fn, args, value } as never);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`${fn} reverted (${hash})`);
    console.log(`  ${fn} ${hash} gas ${receipt.gasUsed}`);
    return receipt;
  }

  const read = (fn: string, args: unknown[]) =>
    publicClient.readContract({ address: deployment.address, abi, functionName: fn, args } as never) as Promise<unknown>;

  // 1. Fund demo wallets (top up only what is missing).
  const targets: [ReturnType<typeof privateKeyToAccount>, bigint][] = [
    ...creatorAccts.map((a) => [a, parseEther(process.env.SEED_CREATOR_FUND || "0.32")] as [typeof a, bigint]),
    ...fanAccts.map((a) => [a, parseEther(process.env.SEED_FAN_FUND || "0.15")] as [typeof a, bigint]),
  ];
  for (const [acct, want] of targets) {
    const bal = await publicClient.getBalance({ address: acct.address });
    if (bal >= want) continue;
    const hash = await deployer.sendTransaction({ to: acct.address, value: want - bal });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Funded ${acct.address} +${formatEther(want - bal)} MON`);
  }

  // 2. Creators, posts, polls.
  for (let i = 0; i < CREATORS.length; i++) {
    const c = CREATORS[i];
    const acct = creatorAccts[i];
    console.log(`Creator ${c.handle} ${acct.address}`);
    if (!(await read("isCreator", [acct.address]))) {
      await send(acct, "registerCreator", [c.handle, c.name, c.bio, c.avatar, c.category, c.founding, c.tiers]);
      for (const p of c.posts) {
        const sealed = p.sealed ? seal(secret, acct.address, p.sealed) : "0x";
        await send(acct, "publishPost", [p.access, p.title, p.body, p.imageURI, sealed]);
      }
      if (c.poll) {
        await send(acct, "createPoll", [c.poll.access, c.poll.question, c.poll.options, BigInt(c.poll.days * 86400)]);
      }
    } else {
      console.log("  already registered, skipping");
    }
  }

  // 3. Fan supports (skip if this fan already supported that creator).
  for (const s of FAN_SUPPORTS) {
    const ci = CREATORS.findIndex((c) => c.handle === s.handle);
    const creator = creatorAccts[ci].address;
    const fan = fanAccts[s.fan];
    const [record] = (await read("getSupporter", [creator, fan.address])) as [{ rank: number }];
    if (record.rank !== 0) continue;
    console.log(`Fan ${fan.address} supports ${s.handle} with ${s.amount}`);
    await send(fan, "support", [creator, s.note], parseEther(s.amount));
  }

  // 4. One demo vote on Maya's poll (fan 0 is a Darkroom-tier supporter).
  const maya = creatorAccts[0].address;
  const polls = (await read("getCreatorPolls", [maya])) as { id: bigint }[];
  if (polls.length && Number(await read("voteOf", [polls[0].id, fanAccts[0].address])) === 0) {
    await send(fanAccts[0], "vote", [polls[0].id, 0]);
  }

  const demo = {
    creators: creatorAccts.map((a, i) => ({ handle: CREATORS[i].handle, address: a.address })),
    fans: fanAccts.map((a) => a.address),
  };
  fs.writeFileSync(
    path.join(__dirname, "..", "deployments", `${hre.network.name}.demo.json`),
    JSON.stringify(demo, null, 2) + "\n",
  );
  console.log("Demo accounts:", JSON.stringify(demo));
  console.log(`Deployer balance left: ${formatEther(await publicClient.getBalance({ address: deployer.account.address }))} MON`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
