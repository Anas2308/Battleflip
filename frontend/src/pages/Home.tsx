import { type FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBlockchainGameState } from '../hooks/useBlockchainGameState';

export const Home: FC = () => {
  const { connected, publicKey } = useWallet();
  const gameState = useBlockchainGameState();
  const {
    activeGames,
    loading,
    error,
    joinGame,
    performCoinFlip
  } = gameState;

  const [flipGameId, setFlipGameId] = useState<string | null>(null);
  const [showMyGamesOnly, setShowMyGamesOnly] = useState<boolean>(false);

  // Debug: Make blockchainService available
  useEffect(() => {
    import('../utils/blockchain').then(({ blockchainService }) => {
      (window as any).blockchainService = blockchainService;
    });
  }, []);

  const handleJoinGame = async (gameId: string) => {
    if (!connected) return;
    const success = await joinGame(gameId);
    if (success) {
      setFlipGameId(gameId);
    }
  };

  const handleCoinFlip = async (choice: 'heads' | 'tails') => {
    if (!flipGameId) return;
    const success = await performCoinFlip(flipGameId, choice);
    if (success) {
      setFlipGameId(null);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const flipGame = activeGames.find(g => g.id === flipGameId);

  // Filter finished games based on toggle
  const filteredFinishedGames = showMyGamesOnly 
    ? gameState.finishedGames.filter(game => 
        publicKey && (game.creator === publicKey.toString() || game.player === publicKey.toString())
      )
    : gameState.finishedGames;

  return (
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
          <button className="btn-secondary">How to Play</button>
          <button className="btn-primary">Create Lobby</button>
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
          {/* Coin Flip Modal */}
          {flipGameId && flipGame && (
            <div style={{
              position: 'fixed',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: '100'
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '400px',
                width: '90%',
                textAlign: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '24px'
                }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0' }}>
                    Coin Flip: {flipGame.lobbyName}
                  </h3>
                  <button
                    onClick={() => setFlipGameId(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '20px',
                      cursor: 'pointer',
                      color: '#6b7280'
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '16px'
                  }}>
                    🪙
                  </div>
                  <p style={{ marginBottom: '16px', color: '#6b7280' }}>
                    Total Pot: {(flipGame.betAmount * 2).toFixed(4)} SOL
                  </p>
                  <p style={{ marginBottom: '24px', fontWeight: 'bold' }}>
                    Choose your side:
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '16px',
                  justifyContent: 'center',
                  marginBottom: '24px'
                }}>
                  <button
                    onClick={() => handleCoinFlip('heads')}
                    disabled={loading}
                    style={{
                      padding: '16px 24px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    👑 HEADS
                  </button>
                  <button
                    onClick={() => handleCoinFlip('tails')}
                    disabled={loading}
                    style={{
                      padding: '16px 24px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    🔥 TAILS
                  </button>
                </div>

                {loading && (
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>
                    Processing transaction...
                  </p>
                )}
              </div>
            </div>
          )}

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
              {/* Card Header */}
              <h3 style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: 'black',
                marginBottom: '16px',
                textAlign: 'left'
              }}>
                ACTIVE GAMES ({activeGames.length})
              </h3>
              
              {/* Horizontal Line */}
              <div style={{
                width: '100%',
                height: '1px',
                backgroundColor: '#e5e7eb',
                marginBottom: '16px'
              }}></div>
              
              {/* Loading State */}
              {loading && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  Loading games...
                </div>
              )}

              {/* No Games State */}
              {!loading && activeGames.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <p style={{ fontSize: '18px', marginBottom: '8px' }}>No active games</p>
                  <p style={{ fontSize: '14px' }}>Be the first to create a game!</p>
                </div>
              )}

              {/* Games Table */}
              {!loading && activeGames.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse'
                  }}>
                    {/* Table Header */}
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          Creator
                        </th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          Lobby Name
                        </th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          Bet Amount
                        </th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'center',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          Action
                        </th>
                      </tr>
                    </thead>
                    
                    {/* Table Body - REAL DATA */}
                    <tbody>
                      {activeGames.map((game, index) => {
                        const isOwnGame = publicKey && game.creator === publicKey.toString();
                        const canJoin = game.status === 'active';
                        const isInProgress = game.status === 'in_progress';
                        
                        return (
                          <tr key={game.id}>
                            <td style={{
                              padding: '12px 16px',
                              fontSize: '14px',
                              color: '#1f2937',
                              borderBottom: '1px solid #f3f4f6'
                            }}>
                              {isOwnGame ? '👤 You' : `🎮 ${truncateAddress(game.creator)}`}
                            </td>
                            <td style={{
                              padding: '12px 16px',
                              fontSize: '14px',
                              color: '#1f2937',
                              borderBottom: '1px solid #f3f4f6'
                            }}>
                              {game.lobbyName}
                            </td>
                            <td style={{
                              padding: '12px 16px',
                              fontSize: '14px',
                              color: '#059669',
                              fontWeight: '600',
                              borderBottom: '1px solid #f3f4f6'
                            }}>
                              {game.betAmount.toFixed(4)} SOL
                            </td>
                            <td style={{
                              padding: '12px 16px',
                              textAlign: 'center',
                              borderBottom: '1px solid #f3f4f6'
                            }}>
                              {isInProgress ? (
                                <span style={{ 
                                  fontSize: '12px', 
                                  color: '#d97706',
                                  fontWeight: '600'
                                }}>
                                  IN PROGRESS
                                </span>
                              ) : canJoin ? (
                                <button
                                  onClick={() => handleJoinGame(game.id)}
                                  disabled={loading}
                                  className="btn-primary"
                                  style={{
                                    fontSize: '12px',
                                    padding: '6px 12px'
                                  }}
                                >
                                  JOIN
                                </button>
                              ) : (
                                <span style={{ 
                                  fontSize: '12px', 
                                  color: '#6b7280'
                                }}>
                                  FULL
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
              
              {/* Horizontal Line */}
              <div style={{
                width: '100%',
                height: '1px',
                backgroundColor: '#e5e7eb',
                marginBottom: '16px'
              }}></div>
              
              {/* No Finished Games State */}
              {filteredFinishedGames.length === 0 && (
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
              )}

              {/* Finished Games Table */}
              {filteredFinishedGames.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse'
                  }}>
                    {/* Table Header */}
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          Creator
                        </th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          Challenger
                        </th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          Bet Amount
                        </th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'center',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          Result
                        </th>
                      </tr>
                    </thead>
                    
                    {/* Table Body - FILTERED FINISHED GAMES DATA */}
                    <tbody>
                      {filteredFinishedGames.map((game, index) => {
                        const userIsCreator = publicKey && game.creator === publicKey.toString();
                        const userIsPlayer = publicKey && game.player === publicKey.toString();
                        const userWon = publicKey && game.winner === publicKey.toString();
                        const userParticipated = userIsCreator || userIsPlayer;
                        
                        return (
                          <tr key={game.id}>
                            <td style={{
                              padding: '12px 16px',
                              fontSize: '14px',
                              color: '#1f2937',
                              borderBottom: '1px solid #f3f4f6'
                            }}>
                              {userIsCreator ? '👤 You' : `🎮 ${truncateAddress(game.creator)}`}
                            </td>
                            <td style={{
                              padding: '12px 16px',
                              fontSize: '14px',
                              color: '#1f2937',
                              borderBottom: '1px solid #f3f4f6'
                            }}>
                              {userIsPlayer ? '👤 You' : `🎮 ${truncateAddress(game.player)}`}
                            </td>
                            <td style={{
                              padding: '12px 16px',
                              fontSize: '14px',
                              color: '#059669',
                              fontWeight: '600',
                              borderBottom: '1px solid #f3f4f6'
                            }}>
                              {game.betAmount.toFixed(4)} SOL
                            </td>
                            <td style={{
                              padding: '12px 16px',
                              textAlign: 'center',
                              borderBottom: '1px solid #f3f4f6'
                            }}>
                              {userParticipated ? (
                                <span style={{
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: userWon ? '#059669' : '#dc2626',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}>
                                  {userWon ? '🏆 WON' : '💸 LOST'}
                                </span>
                              ) : (
                                <span style={{
                                  fontSize: '12px',
                                  color: '#6b7280',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}>
                                  {game.result === 'heads' ? '👑' : '🔥'} {game.result.toUpperCase()}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};