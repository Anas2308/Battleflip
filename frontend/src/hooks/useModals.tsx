import { useState, useCallback } from 'react';

export type ModalType = 'howToPlay' | 'createLobby' | 'coinFlip' | null;

export interface CoinFlipModalData {
  gameId: string;
  lobbyName: string;
  betAmount: number;
  totalPot: number;
  isResume?: boolean; // Flag für fortgesetzte Spiele
}

export type CoinFlipPhase = 'selection' | 'flipping' | 'result';

export interface CoinFlipResult {
  choice: 'heads' | 'tails';
  result: 'heads' | 'tails';
  won: boolean;
  winAmount: number;
}

export const useModals = () => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [coinFlipData, setCoinFlipData] = useState<CoinFlipModalData | null>(null);
  const [coinFlipPhase, setCoinFlipPhase] = useState<CoinFlipPhase>('selection');
  const [coinFlipResult, setCoinFlipResult] = useState<CoinFlipResult | null>(null);

  const openModal = useCallback((modal: ModalType, data?: CoinFlipModalData) => {
    console.log('🎯 Opening modal:', modal, data);
    setActiveModal(modal);
    if (modal === 'coinFlip' && data) {
      setCoinFlipData(data);
      setCoinFlipPhase('selection');
      setCoinFlipResult(null);
    }
  }, []);

  const closeModal = useCallback(() => {
    console.log('🎯 Closing modal');
    setActiveModal(null);
    setCoinFlipData(null);
    setCoinFlipPhase('selection');
    setCoinFlipResult(null);
  }, []);

  const openHowToPlay = useCallback(() => {
    console.log('🎯 Opening How to Play');
    openModal('howToPlay');
  }, [openModal]);
  
  const openCreateLobby = useCallback(() => {
    console.log('🎯 Opening Create Lobby');
    openModal('createLobby');
  }, [openModal]);
  
  const openCoinFlip = useCallback((data: CoinFlipModalData) => {
    console.log('🎯 Opening Coin Flip', data);
    openModal('coinFlip', data);
  }, [openModal]);

  // Coin Flip State Management
  const startFlipping = useCallback(() => {
    setCoinFlipPhase('flipping');
  }, []);

  const showResult = useCallback((result: CoinFlipResult) => {
    setCoinFlipResult(result);
    setCoinFlipPhase('result');
  }, []);

  const resetCoinFlip = useCallback(() => {
    setCoinFlipPhase('selection');
    setCoinFlipResult(null);
  }, []);

  return {
    activeModal,
    coinFlipData,
    coinFlipPhase,
    coinFlipResult,
    openModal,
    closeModal,
    openHowToPlay,
    openCreateLobby,
    openCoinFlip,
    startFlipping,
    showResult,
    resetCoinFlip,
    isOpen: (modal: ModalType) => activeModal === modal
  };
};