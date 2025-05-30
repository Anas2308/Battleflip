use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;

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

        let game = &mut ctx.accounts.game;
        let platform = &mut ctx.accounts.platform;
        let clock = Clock::get()?;

        game.creator = ctx.accounts.creator.key();
        game.lobby_name = lobby_name;
        game.bet_amount = bet_amount;
        game.created_at = clock.unix_timestamp;
        game.status = GameStatus::Active;
        game.player = None;
        game.winner = None;
        game.result = None;
        game.player_choice = None;

        platform.active_games += 1;

        msg!("Game created: {}", game.lobby_name);
        Ok(())
    }

    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let clock = Clock::get()?;

        require!(
            game.status == GameStatus::Active,
            GameError::GameNotActive
        );

        require!(
            clock.unix_timestamp - game.created_at < LOBBY_EXPIRY_TIME,
            GameError::GameExpired
        );

        game.player = Some(ctx.accounts.player.key());
        game.status = GameStatus::InProgress;

        msg!("Player joined game: {}", game.lobby_name);
        Ok(())
    }

    pub fn flip_coin(ctx: Context<FlipCoin>, player_choice: CoinSide) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let platform = &mut ctx.accounts.platform;
        
        require!(
            game.status == GameStatus::InProgress,
            GameError::GameNotInProgress
        );

        require!(
            game.player == Some(ctx.accounts.player.key()),
            GameError::NotPlayer
        );

        // Generate pseudo-random result
        let clock = Clock::get()?;
        let random_value = (clock.unix_timestamp as u64)
            .wrapping_mul(clock.slot)
            .wrapping_add(game.bet_amount)
            % 2;
        
        let result = if random_value == 0 {
            CoinSide::Heads
        } else {
            CoinSide::Tails
        };

        game.result = Some(result);
        game.player_choice = Some(player_choice);

        // Determine winner
        let winner = if result == player_choice {
            game.player.unwrap()
        } else {
            game.creator
        };

        game.winner = Some(winner);
        game.status = GameStatus::Finished;

        // Update platform stats
        platform.total_games += 1;
        platform.total_volume += game.bet_amount * 2;
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
        let game = &ctx.accounts.game;
        
        require!(
            game.status == GameStatus::Finished,
            GameError::GameNotFinished
        );

        require!(
            game.winner == Some(ctx.accounts.winner.key()),
            GameError::NotWinner
        );

        Ok(())
    }

    pub fn delete_game(ctx: Context<DeleteGame>) -> Result<()> {
        let game = &ctx.accounts.game;
        let platform = &mut ctx.accounts.platform;
        
        require!(
            game.status == GameStatus::Active,
            GameError::GameNotActive
        );

        require!(
            game.creator == ctx.accounts.creator.key(),
            GameError::NotCreator
        );

        platform.active_games -= 1;

        msg!("Game deleted: {}", game.lobby_name);
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

#[derive(Accounts)]
pub struct CreateGame<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + Game::INIT_SPACE,
        seeds = [
            b"game",
            platform.key().as_ref(),
            platform.total_games.to_le_bytes().as_ref()
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