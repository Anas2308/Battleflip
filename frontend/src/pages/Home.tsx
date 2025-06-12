import { type FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBlockchainGameState } from '../hooks/useBlockchainGameState';
import { useModals } from '../hooks/useModals';
import { HowToPlayModal } from '../components/HowToPlayModal';
import { CreateLobbyModal } from '../components/CreateLobbyModal';
import { CoinFlipModal } from '../components/CoinFlipModal';

export const Home: FC = () => {
  const { connected, publicKey } = useWallet();
  const gameState = useBlockchainGameState();
  const {
    activeGames,
    finishedGames,
    createGame,
    joinGame,
    performCoinFlip,
    deleteGame,
    minBetSol,
    solEurRate,
    loading,
    error
  } = gameState;

  // Modal Management
  const {
    openHowToPlay,
    openCreateLobby,
    openCoinFlip,
    closeModal,
    isOpen,
    coinFlipData,
    coinFlipPhase,
    coinFlipResult,
    startFlipping,
    showResult
  } = useModals();

  // Filter state for finished games
  const [showMyGamesOnly, setShowMyGamesOnly] = useState<boolean>(false);

  // Debug: Make blockchainService available
  useEffect(() => {
    import('../utils/blockchain').then(({ blockchainService }) => {
      (window as any).blockchainService = blockchainService;
    });
  }, []);

  // Filter finished games based on toggle
  const filteredFinishedGames = showMyGamesOnly 
    ? finishedGames.filter(game => 
        publicKey && (game.creator === publicKey.toString() || game.player === publicKey.toString())
      )
    : finishedGames; // Show ALL games when filter is off

  // DEBUG: Add this to see what's happening
  console.log('🎯 Finished Games Debug:', {
    totalFinishedGames: finishedGames.length,
    filteredFinishedGames: filteredFinishedGames.length,
    showMyGamesOnly,
    userWallet: publicKey?.toString().slice(0, 8)
  });

  const handleCreateGame = async (lobbyName: string, betAmount: number): Promise<boolean> => {
    console.log('🎯 Creating game:', { lobbyName, betAmount });
    return await createGame(lobbyName, betAmount);
  };

  const handleJoinGame = async (gameId: string) => {
    if (!connected) return;
    
    // Find the game data
    const game = activeGames.find(g => g.id === gameId);
    if (!game) return;

    // ✅ PREVENT SELF-PLAY
    if (publicKey && game.creator === publicKey.toString()) {
      alert('❌ You cannot join your own game! Please wait for another player to join.');
      return;
    }

    console.log('🎯 Joining game:', game);

    // Open coin flip modal immediately
    openCoinFlip({
      gameId: game.id,
      lobbyName: game.lobbyName,
      betAmount: game.betAmount,
      totalPot: game.betAmount * 2,
      isResume: false
    });
  };

  const handleResumeGame = async (gameId: string) => {
    if (!connected) return;
    
    // Find the game data
    const game = activeGames.find(g => g.id === gameId && g.status === 'in_progress');
    if (!game) return;

    console.log('🎯 Resuming game:', game);

    // Open coin flip modal for resume
    openCoinFlip({
      gameId: game.id,
      lobbyName: game.lobbyName,
      betAmount: game.betAmount,
      totalPot: game.betAmount * 2,
      isResume: true
    });
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!connected) return;
    
    // Find the game data
    const game = activeGames.find(g => g.id === gameId);
    if (!game) return;

    // Confirm deletion
    const refundAmount = (game.betAmount * 0.95).toFixed(4);
    const feeAmount = (game.betAmount * 0.05).toFixed(4);
    
    const confirmed = confirm(
      `🗑️ DELETE GAME CONFIRMATION\n\n` +
      `Game: "${game.lobbyName}"\n` +
      `Original Bet: ${game.betAmount.toFixed(4)} SOL\n\n` +
      `💰 You will receive: ${refundAmount} SOL (95%)\n` +
      `💸 Platform fee: ${feeAmount} SOL (5%)\n\n` +
      `Are you sure you want to delete this game?`
    );

    if (!confirmed) return;

    console.log('🗑️ Deleting game:', game);
    
    const success = await deleteGame(gameId);
    if (success) {
      console.log('✅ Game deleted successfully');
    }
  };

  const handleCoinFlip = async (choice: 'heads' | 'tails') => {
    if (!coinFlipData) return;

    console.log('🎯 Coin flip choice:', choice);
    
    // Start flipping animation
    startFlipping();

    try {
      // First join the game if not resumed
      if (!coinFlipData.isResume) {
        const joinSuccess = await joinGame(coinFlipData.gameId);
        if (!joinSuccess) {
          closeModal();
          return;
        }
      }

      // Wait for animation (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Perform the actual coin flip
      const success = await performCoinFlip(coinFlipData.gameId, choice);
      
      if (success) {
        // Simulate result (in real implementation, this comes from blockchain)
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = choice === result;
        const winAmount = won ? coinFlipData.totalPot * 0.95 : 0;

        showResult({
          choice,
          result,
          won,
          winAmount
        });
      } else {
        closeModal();
      }
    } catch (error) {
      console.error('Coin flip error:', error);
      closeModal();
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Hero Section */}
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <h2 style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: 'black',
            marginBottom: '16px',
            margin: '0 0 16px 0'
          }}>
            BATTLEFLIP
          </h2>
          <p style={{
            fontSize: '18px',
            color: '#6b7280',
            marginBottom: '24px',
            margin: '0 0 24px 0'
          }}>
            Flip a coin and win SOL! Create a lobby and compete against other players.
          </p>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '16px'
          }}>
            <button 
              className="btn-secondary"
              onClick={openHowToPlay}
            >
              How to Play
            </button>
            <button 
              className="btn-primary"
              onClick={openCreateLobby}
              disabled={!connected}
            >
              Create Lobby
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '16px',
            color: '#dc2626',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Connection Status */}
        {!connected ? (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '24px',
            textAlign: 'center',
            margin: '0 auto',
            maxWidth: '600px'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
              Connect Wallet to Start
            </h3>
            <p style={{ color: '#6b7280' }}>
              Connect your wallet to view and join active games!
            </p>
          </div>
        ) : (
          <>
            {/* Active Games Card */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center',
              width: '100%'
            }}>
              <div style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '24px',
                width: '100%',
                maxWidth: '800px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: 'black',
                  marginBottom: '16px',
                  textAlign: 'left'
                }}>
                  ACTIVE GAMES ({activeGames.length})
                </h3>
                
                <div style={{
                  width: '100%',
                  height: '1px',
                  backgroundColor: '#e5e7eb',
                  marginBottom: '16px'
                }}></div>
                
                {loading && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    Loading games...
                  </div>
                )}

                {!loading && activeGames.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <p style={{ fontSize: '18px', marginBottom: '8px' }}>No active games</p>
                    <p style={{ fontSize: '14px' }}>Be the first to create a game!</p>
                  </div>
                )}

                {/* Games as Cards/Rows instead of Table */}
                {!loading && activeGames.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activeGames.map((game) => {
                      const isOwnGame = publicKey && game.creator === publicKey.toString();
                      const canJoin = game.status === 'active' && !isOwnGame; // ✅ NO SELF-PLAY
                      const isInProgress = game.status === 'in_progress';
                      const canResume = isInProgress && publicKey && 
                        (game.creator === publicKey.toString() || game.player === publicKey.toString());
                      const canDelete = isOwnGame && game.status === 'active'; // ✅ CAN DELETE OWN ACTIVE GAMES
                      
                      return (
                        <div
                          key={game.id}
                          style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '16px',
                            backgroundColor: isOwnGame ? '#f8fafc' : 'white',
                            transition: 'all 0.2s'
                          }}
                          className="game-card"
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}>
                            {/* Game Info */}
                            <div style={{ flex: '1', minWidth: '200px' }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '8px'
                              }}>
                                <span style={{ fontSize: '20px' }}>
                                  {isOwnGame ? '👤' : '🎮'}
                                </span>
                                <div>
                                  <h4 style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    margin: '0 0 2px 0',
                                    color: 'black'
                                  }}>
                                    {game.lobbyName}
                                  </h4>
                                  <p style={{
                                    fontSize: '12px',
                                    color: '#6b7280',
                                    margin: '0'
                                  }}>
                                    by {isOwnGame ? 'You' : truncateAddress(game.creator)}
                                  </p>
                                </div>
                              </div>
                              
                              <div style={{
                                display: 'flex',
                                gap: '16px',
                                fontSize: '14px',
                                color: '#6b7280'
                              }}>
                                <span>Bet: <strong style={{ color: '#059669' }}>{game.betAmount.toFixed(4)} SOL</strong></span>
                                <span>Total Pot: <strong style={{ color: '#059669' }}>{(game.betAmount * 2).toFixed(4)} SOL</strong></span>
                              </div>

                              {isInProgress && game.player && (
                                <div style={{
                                  marginTop: '4px',
                                  fontSize: '12px',
                                  color: '#d97706'
                                }}>
                                  Player: {game.player === publicKey?.toString() ? 'You' : truncateAddress(game.player)}
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {isInProgress ? (
                                canResume ? (
                                  <button
                                    onClick={() => handleResumeGame(game.id)}
                                    disabled={loading}
                                    className="btn-flip"
                                    style={{
                                      backgroundColor: '#d97706',
                                      color: 'white',
                                      border: 'none',
                                      padding: '8px 16px',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    🎯 FLIP
                                  </button>
                                ) : (
                                  <span style={{ 
                                    fontSize: '12px', 
                                    color: '#d97706',
                                    fontWeight: '600',
                                    padding: '8px 16px'
                                  }}>
                                    ⏳ IN PROGRESS
                                  </span>
                                )
                              ) : (
                                <>
                                  {/* JOIN BUTTON (only for other people's games) */}
                                  {canJoin && (
                                    <button
                                      onClick={() => handleJoinGame(game.id)}
                                      disabled={loading}
                                      className="btn-join"
                                      style={{
                                        backgroundColor: 'black',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      ⚡ JOIN
                                    </button>
                                  )}

                                  {/* DELETE BUTTON (only for own games) */}
                                  {canDelete && (
                                    <button
                                      onClick={() => handleDeleteGame(game.id)}
                                      disabled={loading}
                                      style={{
                                        backgroundColor: '#dc2626',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      🗑️ DELETE
                                    </button>
                                  )}

                                  {/* OWN GAME WAITING */}
                                  {isOwnGame && game.status === 'active' && (
                                    <span style={{ 
                                      fontSize: '12px', 
                                      color: '#6b7280',
                                      fontWeight: '600',
                                      padding: '8px 16px'
                                    }}>
                                      ⏳ WAITING FOR PLAYER
                                    </span>
                                  )}

                                  {/* GAME FULL */}
                                  {!canJoin && !isOwnGame && game.status === 'active' && (
                                    <span style={{ 
                                      fontSize: '12px', 
                                      color: '#6b7280'
                                    }}>
                                      FULL
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Finished Games Card */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center',
              width: '100%'
            }}>
              <div style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '24px',
                width: '100%',
                maxWidth: '800px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                {/* Card Header with Filter Button */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px'
                }}>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: 'black',
                    margin: '0'
                  }}>
                    FINISHED GAMES ({filteredFinishedGames.length})
                  </h3>
                  
                  <button
                    onClick={() => setShowMyGamesOnly(!showMyGamesOnly)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: '600',
                      border: showMyGamesOnly ? 'none' : '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: showMyGamesOnly ? 'black' : 'white',
                      color: showMyGamesOnly ? 'white' : 'black',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {showMyGamesOnly ? '✅ My Games Only' : 'Search My Games'}
                  </button>
                </div>
                
                <div style={{
                  width: '100%',
                  height: '1px',
                  backgroundColor: '#e5e7eb',
                  marginBottom: '16px'
                }}></div>
                
                {filteredFinishedGames.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    {showMyGamesOnly ? (
                      <>
                        <p style={{ fontSize: '18px', marginBottom: '8px' }}>No games found</p>
                        <p style={{ fontSize: '14px' }}>You haven't participated in any games yet</p>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: '18px', marginBottom: '8px' }}>No finished games</p>
                        <p style={{ fontSize: '14px' }}>Completed games will appear here</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredFinishedGames.map((game) => {
                      const userIsCreator = publicKey && game.creator === publicKey.toString();
                      const userIsPlayer = publicKey && game.player === publicKey.toString();
                      const userWon = publicKey && game.winner === publicKey.toString();
                      const userParticipated = userIsCreator || userIsPlayer;
                      
                      return (
                        <div
                          key={game.id}
                          style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '16px',
                            backgroundColor: userParticipated 
                              ? userWon 
                                ? '#f0fdf4' 
                                : '#fef2f2'
                              : 'white'
                          }}
                          className="game-card"
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}>
                            {/* Game Info */}
                            <div style={{ flex: '1', minWidth: '300px' }}>
                              <h4 style={{
                                fontSize: '16px',
                                fontWeight: 'bold',
                                margin: '0 0 8px 0',
                                color: 'black'
                              }}>
                                {game.lobbyName}
                              </h4>
                              
                              <div style={{
                                display: 'flex',
                                gap: '20px',
                                fontSize: '14px',
                                color: '#6b7280',
                                marginBottom: '8px'
                              }}>
                                <span>
                                  Creator: <strong>{userIsCreator ? 'You' : truncateAddress(game.creator)}</strong>
                                </span>
                                <span>
                                  Player: <strong>{userIsPlayer ? 'You' : truncateAddress(game.player)}</strong>
                                </span>
                              </div>
                              
                              <div style={{
                                display: 'flex',
                                gap: '20px',
                                fontSize: '14px',
                                color: '#6b7280'
                              }}>
                                <span>Total Bet: <strong style={{ color: '#059669' }}>{game.betAmount.toFixed(4)} SOL</strong></span>
                                <span>Result: <strong>{game.result === 'heads' ? '👑 HEADS' : '🔥 TAILS'}</strong></span>
                              </div>
                            </div>

                            {/* Result */}
                            <div style={{ textAlign: 'center' }}>
                              {userParticipated ? (
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: userWon ? '#16a34a' : '#dc2626'
                                }}>
                                  {userWon ? (
                                    <>
                                      <span style={{ fontSize: '20px' }}>🏆</span>
                                      <span>WON</span>
                                    </>
                                  ) : (
                                    <>
                                      <span style={{ fontSize: '20px' }}>💸</span>
                                      <span>LOST</span>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div style={{
                                  fontSize: '12px',
                                  color: '#6b7280'
                                }}>
                                  Spectator
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Statistics */}
                {finishedGames.length > 0 && (
                  <div style={{
                    marginTop: '24px',
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1e293b',
                      marginBottom: '8px',
                      margin: '0 0 8px 0'
                    }}>
                      📊 Statistics
                    </h4>
                    <div style={{
                      display: 'flex',
                      gap: '24px',
                      fontSize: '12px',
                      color: '#64748b'
                    }}>
                      <span>Total Games: <strong>{finishedGames.length}</strong></span>
                      <span>Showing: <strong>{filteredFinishedGames.length}</strong></span>
                      {showMyGamesOnly && (
                        <span>Your Win Rate: <strong>
                          {filteredFinishedGames.length > 0 ? 
                            Math.round((filteredFinishedGames.filter(g => g.winner === publicKey?.toString()).length / filteredFinishedGames.length) * 100) + '%' 
                            : '0%'
                          }
                        </strong></span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODALS */}
      <HowToPlayModal
        isOpen={isOpen('howToPlay')}
        onClose={closeModal}
      />

      <CreateLobbyModal
        isOpen={isOpen('createLobby')}
        onClose={closeModal}
        onCreateGame={handleCreateGame}
        minBetSol={minBetSol}
        solEurRate={solEurRate}
        loading={loading}
      />

      <CoinFlipModal
        isOpen={isOpen('coinFlip')}
        onClose={closeModal}
        data={coinFlipData}
        phase={coinFlipPhase}
        result={coinFlipResult}
        onFlip={handleCoinFlip}
        loading={loading}
      />
    </>
  );
};