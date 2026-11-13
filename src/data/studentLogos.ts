export interface StudentLogo {
  id: string;
  name: string;
  emoji: string;
  category: 'animals' | 'space' | 'sports' | 'gems';
}

export const STUDENT_LOGOS: StudentLogo[] = [
  // Animals (10)
  { id: 'lion', name: 'Lion', emoji: '🦁', category: 'animals' },
  { id: 'dolphin', name: 'Dolphin', emoji: '🐬', category: 'animals' },
  { id: 'eagle', name: 'Eagle', emoji: '🦅', category: 'animals' },
  { id: 'panda', name: 'Panda', emoji: '🐼', category: 'animals' },
  { id: 'fox', name: 'Fox', emoji: '🦊', category: 'animals' },
  { id: 'bear', name: 'Bear', emoji: '🐻', category: 'animals' },
  { id: 'tiger', name: 'Tiger', emoji: '🐯', category: 'animals' },
  { id: 'owl', name: 'Owl', emoji: '🦉', category: 'animals' },
  { id: 'dino', name: 'Dino', emoji: '🦖', category: 'animals' },
  { id: 'unicorn', name: 'Unicorn', emoji: '🦄', category: 'animals' },

  // Space & Nature (10)
  { id: 'rocket', name: 'Rocket', emoji: '🚀', category: 'space' },
  { id: 'comet', name: 'Comet', emoji: '☄️', category: 'space' },
  { id: 'star', name: 'Star', emoji: '⭐', category: 'space' },
  { id: 'lightning', name: 'Lightning', emoji: '⚡', category: 'space' },
  { id: 'planet', name: 'Planet', emoji: '🪐', category: 'space' },
  { id: 'fire', name: 'Fire', emoji: '🔥', category: 'space' },
  { id: 'volcano', name: 'Volcano', emoji: '🌋', category: 'space' },
  { id: 'rainbow', name: 'Rainbow', emoji: '🌈', category: 'space' },
  { id: 'wave', name: 'Wave', emoji: '🌊', category: 'space' },
  { id: 'sun', name: 'Sun', emoji: '☀️', category: 'space' },

  // Sports & Fun (8)
  { id: 'soccer', name: 'Soccer', emoji: '⚽', category: 'sports' },
  { id: 'basketball', name: 'Basketball', emoji: '🏀', category: 'sports' },
  { id: 'trophy', name: 'Champion', emoji: '🏆', category: 'sports' },
  { id: 'gamepad', name: 'Gamer', emoji: '🎮', category: 'sports' },
  { id: 'guitar', name: 'Rocker', emoji: '🎸', category: 'sports' },
  { id: 'palette', name: 'Artist', emoji: '🎨', category: 'sports' },
  { id: 'skateboard', name: 'Skater', emoji: '🛹', category: 'sports' },
  { id: 'target', name: 'BullsEye', emoji: '🎯', category: 'sports' },

  // Gems & Lucky (6)
  { id: 'diamond', name: 'Diamond', emoji: '💎', category: 'gems' },
  { id: 'crown', name: 'Crown', emoji: '👑', category: 'gems' },
  { id: 'clover', name: 'Lucky', emoji: '🍀', category: 'gems' },
  { id: 'crystal', name: 'Crystal', emoji: '🔮', category: 'gems' },
  { id: 'sparkles', name: 'Sparkles', emoji: '✨', category: 'gems' },
  { id: 'shield', name: 'Shield', emoji: '🛡️', category: 'gems' },
];
