use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;
use anchor_lang::system_program;

declare_id!("mWishTAXRe8gdGcqF6VqYW3JL1CkHU5waMfkM9VTVmg");

pub const PLATFORM_FEE_PERCENTAGE: u8 = 25; // 2.5% (25/1000)
pub const POT_PERCENTAGE: u8 = 975; // 97.5% (975/1000)
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

        let clock = Clock::get()?;
        let creator_key = ctx.accounts.creator.key();

        // Calculate fee split: 97.5% to pot, 2.5% to fee wallet
        let pot_amount = (bet_amount * POT_PERCENTAGE as u64) / 1000;
        let fee_amount = bet_amount - pot_amount; // Remainder goes to fee to avoid rounding issues

        // Transfer pot amount to game account
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.game.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, pot_amount)?;

        // Transfer fee to fee wallet
        let fee_cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.fee_wallet.to_account_info(),
            },
        );
        system_program::transfer(fee_cpi_context, fee_amount)?;

        // Update platform
        let platform = &mut ctx.accounts.platform;
        platform.active_games += 1;
        platform.total_games += 1;

        // Set game state
        let game = &mut ctx.accounts.game;
        game.creator = creator_key;
        game.lobby_name = lobby_name;
        game.bet_amount = bet_amount; // Original bet amount for display
        game.pot_amount = pot_amount; // Amount actually in the pot
        game.created_at = clock.unix_timestamp;
        game.status = GameStatus::Active;
        game.player = None;
        game.winner = None;
        game.result = None;
        game.player_choice = None;

        msg!("Game created: {} (Bet: {}, Pot: {}, Fee: {})", game.lobby_name, bet_amount, pot_amount, fee_amount);
        Ok(())
    }

    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let clock = Clock::get()?;
        let player_key = ctx.accounts.player.key();
        
        // Get values before mutable borrow
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

        // Calculate fee split for joining player
        let pot_amount = (bet_amount * POT_PERCENTAGE as u64) / 1000;
        let fee_amount = bet_amount - pot_amount;

        // Transfer pot amount to game account
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.player.to_account_info(),
                to: ctx.accounts.game.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, pot_amount)?;

        // Transfer fee to fee wallet
        let fee_cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.player.to_account_info(),
                to: ctx.accounts.fee_wallet.to_account_info(),
            },
        );
        system_program::transfer(fee_cpi_context, fee_amount)?;

        // Update game state
        let game = &mut ctx.accounts.game;
        game.player = Some(player_key);
        game.status = GameStatus::InProgress;

        msg!("Player joined game: {} (Added Pot: {}, Fee: {})", game.lobby_name, pot_amount, fee_amount);
        Ok(())
    }

    pub fn flip_coin(ctx: Context<FlipCoin>, player_choice: CoinSide) -> Result<()> {
        let clock = Clock::get()?;
        let player_key = ctx.accounts.player.key();
        
        // Get values before mutable borrow
        let game_status = ctx.accounts.game.status.clone();
        let game_player = ctx.accounts.game.player;
        let creator = ctx.accounts.game.creator;
        
        require!(
            game_status == GameStatus::InProgress,
            GameError::GameNotInProgress
        );

        require!(
            game_player == Some(player_key),
            GameError::NotPlayer
        );

        // Generate pseudo-random result
        let random_value = (clock.unix_timestamp as u64)
            .wrapping_mul(clock.slot)
            .wrapping_add(player_key.to_bytes()[0] as u64)
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

        // Update state
        let game = &mut ctx.accounts.game;
        let platform = &mut ctx.accounts.platform;

        game.result = Some(result);
        game.player_choice = Some(player_choice);
        game.winner = Some(winner);
        game.status = GameStatus::Finished;

        // Update platform stats (total volume = original bet amounts)
        platform.total_volume += game.bet_amount * 2; // Both original bets
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
        let winner_key = ctx.accounts.winner.key();
        
        require!(
            game_status == GameStatus::Finished,
            GameError::GameNotFinished
        );

        require!(
            game_winner == Some(winner_key),
            GameError::NotWinner
        );

        // Winner gets the entire pot (which is already 97.5% of each bet)
        let game_balance = ctx.accounts.game.to_account_info().lamports();
        let rent_exempt_amount = Rent::get()?.minimum_balance(ctx.accounts.game.to_account_info().data_len());
        let winnings = game_balance.saturating_sub(rent_exempt_amount);

        // Transfer all winnings to winner
        **ctx.accounts.game.to_account_info().try_borrow_mut_lamports()? -= winnings;
        **ctx.accounts.winner.to_account_info().try_borrow_mut_lamports()? += winnings;

        msg!("Winnings claimed! Winner: {}, Amount: {}", winner_key, winnings);
        Ok(())
    }

    pub fn delete_game(ctx: Context<DeleteGame>) -> Result<()> {
        let clock = Clock::get()?;
        let creator_key = ctx.accounts.creator.key();
        
        // Get values before mutable borrow
        let game_status = ctx.accounts.game.status.clone();
        let game_creator = ctx.accounts.game.creator;
        let pot_amount = ctx.accounts.game.pot_amount;
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

        // Refund the pot amount (user already paid the fee, so no additional fee)
        let refund_amount = pot_amount;

        // Get current game balance and ensure we don't over-withdraw
        let game_balance = ctx.accounts.game.to_account_info().lamports();
        let rent_exempt_amount = Rent::get()?.minimum_balance(ctx.accounts.game.to_account_info().data_len());
        let available_refund = game_balance.saturating_sub(rent_exempt_amount).min(refund_amount);

        // Refund to creator
        **ctx.accounts.game.to_account_info().try_borrow_mut_lamports()? -= available_refund;
        **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += available_refund;

        // Update platform state
        let platform = &mut ctx.accounts.platform;
        platform.active_games -= 1;

        msg!("Game deleted: {}, Refund: {}", lobby_name, available_refund);
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
    #[account(mut)]
    pub fee_wallet: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

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
    /// CHECK: This is the fee wallet that receives platform fees
    #[account(
        mut,
        constraint = fee_wallet.key() == platform.fee_wallet
    )]
    pub fee_wallet: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub player: Signer<'info>,
    /// CHECK: Platform for fee wallet lookup
    #[account(
        seeds = [b"platform"],
        bump
    )]
    pub platform: Account<'info, Platform>,
    /// CHECK: This is the fee wallet that receives platform fees
    #[account(
        mut,
        constraint = fee_wallet.key() == platform.fee_wallet
    )]
    pub fee_wallet: AccountInfo<'info>,
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
    pub bet_amount: u64,    // Original bet amount for display
    pub pot_amount: u64,    // Amount actually in the pot (97.5% of bet)
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