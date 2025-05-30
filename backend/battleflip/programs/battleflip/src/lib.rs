use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;
use anchor_lang::system_program;

declare_id!("mWishTAXRe8gdGcqF6VqYW3JL1CkHU5waMfkM9VTVmg");

pub const PLATFORM_FEE_PERCENTAGE: u8 = 5;
pub const CREATOR_REFUND_PERCENTAGE: u8 = 95;
pub const MINIMUM_BET_LAMPORTS: u64 = 3_000_000; // ~0.003 SOL
pub const LOBBY_EXPIRY_TIME: i64 = 86400; // 24 hours in seconds

#[program]
pub mod battleflip {
    use super::*;

    pub fn initialize_platform(ctx: Context<InitializePlatform>) -> Result<()> {
        let platform = &mut ctx.accounts.platform;
        platform.authority = ctx.accounts.authority.key();
        platform.fee_wallet = ctx.accounts.fee_wallet.key();
        platform.total_games = 0;
        platform.total_volume = 0;
        platform.active_games = 0;
        msg!("Platform initialized!");
        Ok(())
    }

    pub fn create_game(
        ctx: Context<CreateGame>,
        lobby_name: String,
        bet_amount: u64,
    ) -> Result<()> {
        require!(
            lobby_name.len() > 0 && lobby_name.len() <= 20,
            GameError::InvalidLobbyName
        );
        
        require!(
            lobby_name.chars().all(|c| c.is_alphanumeric()),
            GameError::InvalidLobbyName
        );
        
        require!(
            bet_amount >= MINIMUM_BET_LAMPORTS,
            GameError::BetTooLow
        );

        let bet_amount_copy = bet_amount;
        let clock = Clock::get()?;
        let creator_key = ctx.accounts.creator.key();

        // Transfer SOL from creator to game account
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.game.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, bet_amount_copy)?;

        // CRITICAL FIX: Update platform BEFORE setting game state
        let platform = &mut ctx.accounts.platform;
        platform.active_games += 1;
        platform.total_games += 1; // ← FIXED: This was missing!

        // Now set game state
        let game = &mut ctx.accounts.game;
        game.creator = creator_key;
        game.lobby_name = lobby_name;
        game.bet_amount = bet_amount_copy;
        game.created_at = clock.unix_timestamp;
        game.status = GameStatus::Active;
        game.player = None;
        game.winner = None;
        game.result = None;
        game.player_choice = None;

        msg!("Game created: {} (Game #{} total)", game.lobby_name, platform.total_games);
        Ok(())
    }

    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let clock = Clock::get()?;
        let player_key = ctx.accounts.player.key();
        
        // Get bet amount before mutable borrow
        let bet_amount = ctx.accounts.game.bet_amount;
        let created_at = ctx.accounts.game.created_at;
        let status = ctx.accounts.game.status.clone();
        
        require!(
            status == GameStatus::Active,
            GameError::GameNotActive
        );

        require!(
            clock.unix_timestamp - created_at < LOBBY_EXPIRY_TIME,
            GameError::GameExpired
        );

        // Transfer SOL from player to game account
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.player.to_account_info(),
                to: ctx.accounts.game.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, bet_amount)?;

        // Now modify game state
        let game = &mut ctx.accounts.game;
        game.player = Some(player_key);
        game.status = GameStatus::InProgress;

        msg!("Player joined game: {}", game.lobby_name);
        Ok(())
    }

    pub fn flip_coin(ctx: Context<FlipCoin>, player_choice: CoinSide) -> Result<()> {
        let clock = Clock::get()?;
        let player_key = ctx.accounts.player.key();
        
        // Get values before mutable borrow
        let game_status = ctx.accounts.game.status.clone();
        let game_player = ctx.accounts.game.player;
        let bet_amount = ctx.accounts.game.bet_amount;
        let creator = ctx.accounts.game.creator;
        
        require!(
            game_status == GameStatus::InProgress,
            GameError::GameNotInProgress
        );

        require!(
            game_player == Some(player_key),
            GameError::NotPlayer
        );

        // Generate pseudo-random result using clock + slot + bet amount
        let random_value = (clock.unix_timestamp as u64)
            .wrapping_mul(clock.slot)
            .wrapping_add(bet_amount)
            .wrapping_add(player_key.to_bytes()[0] as u64) // Add some entropy from player key
            % 2;
        
        let result = if random_value == 0 {
            CoinSide::Heads
        } else {
            CoinSide::Tails
        };

        // Determine winner
        let winner = if result == player_choice {
            game_player.unwrap()
        } else {
            creator
        };

        // Now modify state
        let game = &mut ctx.accounts.game;
        let platform = &mut ctx.accounts.platform;

        game.result = Some(result);
        game.player_choice = Some(player_choice);
        game.winner = Some(winner);
        game.status = GameStatus::Finished;

        // Update platform stats
        platform.total_volume += bet_amount * 2; // Total pot
        platform.active_games -= 1;

        msg!(
            "Game finished! Choice: {:?}, Result: {:?}, Winner: {}",
            player_choice,
            result,
            winner
        );
        Ok(())
    }

    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let game_status = ctx.accounts.game.status.clone();
        let game_winner = ctx.accounts.game.winner;
        let bet_amount = ctx.accounts.game.bet_amount;
        let winner_key = ctx.accounts.winner.key();
        
        require!(
            game_status == GameStatus::Finished,
            GameError::GameNotFinished
        );

        require!(
            game_winner == Some(winner_key),
            GameError::NotWinner
        );

        let total_pot = bet_amount * 2;
        let winner_amount = (total_pot * 95) / 100; // 95%
        let fee_amount = total_pot - winner_amount; // 5%

        // Transfer winnings to winner
        **ctx.accounts.game.to_account_info().try_borrow_mut_lamports()? -= winner_amount;
        **ctx.accounts.winner.to_account_info().try_borrow_mut_lamports()? += winner_amount;

        // Transfer fee to platform
        **ctx.accounts.game.to_account_info().try_borrow_mut_lamports()? -= fee_amount;
        **ctx.accounts.fee_wallet.to_account_info().try_borrow_mut_lamports()? += fee_amount;

        msg!("Winnings claimed! Winner: {}, Amount: {}", winner_key, winner_amount);
        Ok(())
    }

    pub fn delete_game(ctx: Context<DeleteGame>) -> Result<()> {
        let clock = Clock::get()?;
        let creator_key = ctx.accounts.creator.key();
        
        // Get values before mutable borrow
        let game_status = ctx.accounts.game.status.clone();
        let game_creator = ctx.accounts.game.creator;
        let bet_amount = ctx.accounts.game.bet_amount;
        let created_at = ctx.accounts.game.created_at;
        let lobby_name = ctx.accounts.game.lobby_name.clone();
        
        require!(
            game_status == GameStatus::Active,
            GameError::GameNotActive
        );

        require!(
            game_creator == creator_key,
            GameError::NotCreator
        );

        let time_elapsed = clock.unix_timestamp - created_at;
        let refund_amount = if time_elapsed >= LOBBY_EXPIRY_TIME {
            // Auto-delete after 24h: 100% refund
            bet_amount
        } else {
            // Manual delete: 95% refund, 5% fee
            let fee_amount = (bet_amount * 5) / 100;
            let refund = bet_amount - fee_amount;
            
            // Transfer fee to platform
            **ctx.accounts.game.to_account_info().try_borrow_mut_lamports()? -= fee_amount;
            **ctx.accounts.fee_wallet.to_account_info().try_borrow_mut_lamports()? += fee_amount;
            
            refund
        };

        // Refund to creator
        **ctx.accounts.game.to_account_info().try_borrow_mut_lamports()? -= refund_amount;
        **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += refund_amount;

        // Update platform state
        let platform = &mut ctx.accounts.platform;
        platform.active_games -= 1;

        msg!("Game deleted: {}, Refund: {}", lobby_name, refund_amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Platform::INIT_SPACE,
        seeds = [b"platform"],
        bump
    )]
    pub platform: Account<'info, Platform>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: This is the wallet that receives fees
    pub fee_wallet: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

// FIXED: Simple PDA structure without Clock in attributes
#[derive(Accounts)]
#[instruction(lobby_name: String, bet_amount: u64)]
pub struct CreateGame<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + Game::INIT_SPACE,
        seeds = [
            b"game",
            platform.key().as_ref(),
            platform.total_games.to_le_bytes().as_ref(),
            creator.key().as_ref(),
            lobby_name.as_bytes()
        ],
        bump
    )]
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [b"platform"],
        bump
    )]
    pub platform: Account<'info, Platform>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FlipCoin<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [b"platform"],
        bump
    )]
    pub platform: Account<'info, Platform>,
    #[account(mut)]
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(
        mut,
        close = winner,
        constraint = game.status == GameStatus::Finished
    )]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub winner: Signer<'info>,
    /// CHECK: Platform fee wallet
    #[account(
        mut,
        constraint = fee_wallet.key() == platform.fee_wallet
    )]
    pub fee_wallet: AccountInfo<'info>,
    #[account(
        seeds = [b"platform"],
        bump
    )]
    pub platform: Account<'info, Platform>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeleteGame<'info> {
    #[account(
        mut,
        close = creator,
        constraint = game.status == GameStatus::Active
    )]
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [b"platform"],
        bump
    )]
    pub platform: Account<'info, Platform>,
    #[account(mut)]
    pub creator: Signer<'info>,
    /// CHECK: Platform fee wallet
    #[account(
        mut,
        constraint = fee_wallet.key() == platform.fee_wallet
    )]
    pub fee_wallet: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Platform {
    pub authority: Pubkey,
    pub fee_wallet: Pubkey,
    pub total_games: u64,
    pub total_volume: u64,
    pub active_games: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Game {
    pub creator: Pubkey,
    #[max_len(20)]
    pub lobby_name: String,
    pub bet_amount: u64,
    pub created_at: i64,
    pub status: GameStatus,
    pub player: Option<Pubkey>,
    pub winner: Option<Pubkey>,
    pub result: Option<CoinSide>,
    pub player_choice: Option<CoinSide>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum GameStatus {
    Active,
    InProgress,
    Finished,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum CoinSide {
    Heads,
    Tails,
}

#[error_code]
pub enum GameError {
    #[msg("Invalid lobby name")]
    InvalidLobbyName,
    #[msg("Bet amount too low")]
    BetTooLow,
    #[msg("Game is not active")]
    GameNotActive,
    #[msg("Game has expired")]
    GameExpired,
    #[msg("Game is not in progress")]
    GameNotInProgress,
    #[msg("You are not the player")]
    NotPlayer,
    #[msg("Game is not finished")]
    GameNotFinished,
    #[msg("You are not the winner")]
    NotWinner,
    #[msg("You are not the creator")]
    NotCreator,
}