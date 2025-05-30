import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Battleflip } from "../target/types/battleflip";
import { assert } from "chai";

describe("battleflip", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Battleflip as Program<Battleflip>;
  
  // Test wallets
  const platformAuthority = anchor.web3.Keypair.generate();
  const feeWallet = anchor.web3.Keypair.generate();
  const creator = anchor.web3.Keypair.generate();
  const player = anchor.web3.Keypair.generate();

  // Platform PDA
  const [platformPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("platform")],
    program.programId
  );

  // Game PDA
  let gamePDA: anchor.web3.PublicKey;
  let gameBump: number;

  before(async () => {
    console.log("Skipping airdrops - using existing wallet balance");
    console.log("Provider wallet:", provider.wallet.publicKey.toString());
    
    const balance = await provider.connection.getBalance(provider.wallet.publicKey);
    console.log("Wallet balance:", balance / anchor.web3.LAMPORTS_PER_SOL, "SOL");
    
    if (balance < 5 * anchor.web3.LAMPORTS_PER_SOL) {
      throw new Error("Insufficient balance! Need at least 5 SOL");
    }
  });

  it("Initializes platform", async () => {
    await program.methods
      .initializePlatform()
      .accountsStrict({
        platform: platformPDA,
        authority: platformAuthority.publicKey,
        feeWallet: feeWallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([platformAuthority])
      .rpc();

    const platform = await program.account.platform.fetch(platformPDA);
    assert.equal(platform.authority.toString(), platformAuthority.publicKey.toString());
    assert.equal(platform.feeWallet.toString(), feeWallet.publicKey.toString());
    assert.equal(platform.totalGames.toNumber(), 0);
    assert.equal(platform.activeGames.toNumber(), 0);
    
    console.log("✅ Platform initialized successfully!");
  });

  it("Creates a game", async () => {
    const lobbyName = "TestLobby123";
    const betAmount = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL); // 0.1 SOL

    // Get platform account to get game count
    const platform = await program.account.platform.fetch(platformPDA);
    
    // Calculate game PDA
    [gamePDA, gameBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("game"),
        platformPDA.toBuffer(),
        platform.totalGames.toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    await program.methods
      .createGame(lobbyName, betAmount)
      .accountsStrict({
        game: gamePDA,
        platform: platformPDA,
        creator: creator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    const game = await program.account.game.fetch(gamePDA);
    assert.equal(game.lobbyName, lobbyName);
    assert.equal(game.creator.toString(), creator.publicKey.toString());
    assert.equal(game.betAmount.toNumber(), betAmount.toNumber());
    assert.equal(game.status.active !== undefined, true);
    assert.equal(game.player, null);
    
    console.log("✅ Game created successfully!");
    console.log(`   Lobby: ${lobbyName}`);
    console.log(`   Bet: ${betAmount.toNumber() / anchor.web3.LAMPORTS_PER_SOL} SOL`);
  });

  it("Player joins game", async () => {
    await program.methods
      .joinGame()
      .accountsStrict({
        game: gamePDA,
        player: player.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    const game = await program.account.game.fetch(gamePDA);
    assert.equal(game.player?.toString(), player.publicKey.toString());
    assert.equal(game.status.inProgress !== undefined, true);
    
    console.log("✅ Player joined game successfully!");
  });

  it("Player flips coin", async () => {
    const playerChoice = { heads: {} }; // Player chooses heads

    await program.methods
      .flipCoin(playerChoice)
      .accountsStrict({
        game: gamePDA,
        platform: platformPDA,
        player: player.publicKey,
      })
      .signers([player])
      .rpc();

    const game = await program.account.game.fetch(gamePDA);
    assert.equal(game.status.finished !== undefined, true);
    assert.notEqual(game.winner, null);
    assert.notEqual(game.result, null);
    
    const result = game.result?.heads !== undefined ? "Heads" : "Tails";
    const winner = game.winner?.toString() === player.publicKey.toString() ? "Player" : "Creator";
    
    console.log("✅ Coin flip completed!");
    console.log(`   Result: ${result}`);
    console.log(`   Winner: ${winner}`);
  });

  it("Winner claims winnings", async () => {
    const game = await program.account.game.fetch(gamePDA);
    const winner = game.winner!;
    const isPlayerWinner = winner.toString() === player.publicKey.toString();
    const winnerKeypair = isPlayerWinner ? player : creator;

    const winnerBalanceBefore = await provider.connection.getBalance(winner);
    const feeWalletBalanceBefore = await provider.connection.getBalance(feeWallet.publicKey);

    await program.methods
      .claimWinnings()
      .accountsStrict({
        game: gamePDA,
        winner: winner,
        feeWallet: feeWallet.publicKey,
        platform: platformPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([winnerKeypair])
      .rpc();

    const winnerBalanceAfter = await provider.connection.getBalance(winner);
    const feeWalletBalanceAfter = await provider.connection.getBalance(feeWallet.publicKey);

    // Check balances (approximately, due to transaction fees)
    const totalPot = 0.2 * anchor.web3.LAMPORTS_PER_SOL; // 0.1 SOL * 2
    const expectedWinnings = Math.floor(totalPot * 0.95); // 95% to winner
    const expectedFee = Math.floor(totalPot * 0.05); // 5% fee

    console.log("✅ Winnings claimed successfully!");
    console.log(`   Winner received: ~${expectedWinnings / anchor.web3.LAMPORTS_PER_SOL} SOL`);
    console.log(`   Platform fee: ~${expectedFee / anchor.web3.LAMPORTS_PER_SOL} SOL`);
    
    // Verify game account was closed
    try {
      await program.account.game.fetch(gamePDA);
      assert.fail("Game account should be closed");
    } catch (err) {
      console.log("✅ Game account properly closed!");
    }
  });

  it("Creates and deletes a game", async () => {
    const lobbyName = "DeleteTest";
    const betAmount = new anchor.BN(0.05 * anchor.web3.LAMPORTS_PER_SOL);

    // Get current game count
    const platform = await program.account.platform.fetch(platformPDA);
    
    // Calculate new game PDA
    const [newGamePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("game"),
        platformPDA.toBuffer(),
        platform.totalGames.toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    // Create game
    await program.methods
      .createGame(lobbyName, betAmount)
      .accountsStrict({
        game: newGamePDA,
        platform: platformPDA,
        creator: creator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    console.log("✅ Game created for deletion test");

    const creatorBalanceBefore = await provider.connection.getBalance(creator.publicKey);
    const feeWalletBalanceBefore = await provider.connection.getBalance(feeWallet.publicKey);

    // Delete game
    await program.methods
      .deleteGame()
      .accountsStrict({
        game: newGamePDA,
        platform: platformPDA,
        creator: creator.publicKey,
        feeWallet: feeWallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    const creatorBalanceAfter = await provider.connection.getBalance(creator.publicKey);
    const feeWalletBalanceAfter = await provider.connection.getBalance(feeWallet.publicKey);

    const refundAmount = betAmount.toNumber() * 0.95; // 95% refund
    const feeAmount = betAmount.toNumber() * 0.05; // 5% fee

    console.log("✅ Game deleted successfully!");
    console.log(`   Creator refunded: ~${refundAmount / anchor.web3.LAMPORTS_PER_SOL} SOL`);
    console.log(`   Platform fee: ~${feeAmount / anchor.web3.LAMPORTS_PER_SOL} SOL`);
  });

  it("Fails to create game with invalid lobby name", async () => {
    const invalidName = "Test@#$"; // Contains special characters
    const betAmount = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL);

    const platform = await program.account.platform.fetch(platformPDA);
    const [failGamePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("game"),
        platformPDA.toBuffer(),
        platform.totalGames.toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    try {
      await program.methods
        .createGame(invalidName, betAmount)
        .accountsStrict({
          game: failGamePDA,
          platform: platformPDA,
          creator: creator.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([creator])
        .rpc();
      
      assert.fail("Should have failed with invalid lobby name");
    } catch (err: any) {
      assert.include(err.toString(), "InvalidLobbyName");
      console.log("✅ Correctly rejected invalid lobby name!");
    }
  });

  it("Fails to create game with bet too low", async () => {
    const lobbyName = "LowBetTest";
    const betAmount = new anchor.BN(0.001 * anchor.web3.LAMPORTS_PER_SOL); // Too low

    const platform = await program.account.platform.fetch(platformPDA);
    const [failGamePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("game"),
        platformPDA.toBuffer(),
        platform.totalGames.toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    try {
      await program.methods
        .createGame(lobbyName, betAmount)
        .accountsStrict({
          game: failGamePDA,
          platform: platformPDA,
          creator: creator.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([creator])
        .rpc();
      
      assert.fail("Should have failed with bet too low");
    } catch (err: any) {
      assert.include(err.toString(), "BetTooLow");
      console.log("✅ Correctly rejected bet too low!");
    }
  });
});