const anchor = require("@coral-xyz/anchor");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.Battleflip;
  
  const [platformPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("platform")],
    program.programId
  );
  
  const feeWallet = new anchor.web3.PublicKey("HQre2z3L5eLdt9MCjLdkdo7pjqozrbD8epqJ6k7RNGxT");
  
  console.log("Platform PDA:", platformPDA.toString());
  console.log("Authority:", provider.wallet.publicKey.toString());
  
  const tx = await program.methods
    .initializePlatform()
    .accounts({
      platform: platformPDA,
      authority: provider.wallet.publicKey,
      feeWallet: feeWallet,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
    
  console.log("Platform initialized!");
  console.log("Transaction:", tx);
}

main().catch(console.error);