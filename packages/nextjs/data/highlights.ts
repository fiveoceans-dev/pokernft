export interface Highlight {
  id: number;
  title: string;
  description: string;
  image: string;
  type: 'community' | 'gameplay' | 'tournament' | 'feature';
  date?: string;
  link?: string;
}

export const highlights: Highlight[] = [
  {
    id: 1,
    title: "Epic Bluff Victory",
    description: "Player makes incredible bluff to win $50K pot",
    image: "/highlights/pokernfts_highlights_1.jpg",
    type: "gameplay",
    date: "2024-12-15"
  },
  {
    id: 2,
    title: "Community Champions",
    description: "Top players from our weekly tournaments",
    image: "/highlights/pokernfts_highlights_2.jpg",
    type: "community",
    date: "2024-12-10"
  },
  {
    id: 3,
    title: "High Stakes Action",
    description: "Intense moments from $1000 buy-in tournament",
    image: "/highlights/pokernfts_highlights_3.jpg",
    type: "tournament",
    date: "2024-12-08"
  },
  {
    id: 4,
    title: "Perfect Royal Flush",
    description: "Rare royal flush wins massive jackpot",
    image: "/highlights/pokernfts_highlights_4.jpg",
    type: "gameplay",
    date: "2024-12-05"
  },
  {
    id: 5,
    title: "New NFT Collection",
    description: "Exclusive PokerNFTs series launch",
    image: "/highlights/pokernfts_highlights_5.jpg",
    type: "feature",
    date: "2024-12-03"
  },
  {
    id: 6,
    title: "Tournament Finals",
    description: "Grand finale showdown moments",
    image: "/highlights/pokernfts_highlights_6.jpg",
    type: "tournament",
    date: "2024-12-01"
  },
  {
    id: 7,
    title: "Player Spotlight",
    description: "Featured community member achievements",
    image: "/highlights/pokernfts_highlights_7.jpg",
    type: "community",
    date: "2024-11-28"
  },
  {
    id: 8,
    title: "All-In Moment",
    description: "Heart-stopping all-in decision",
    image: "/highlights/pokernfts_highlights_8.jpg",
    type: "gameplay",
    date: "2024-11-25"
  },
  {
    id: 9,
    title: "Weekly Champions",
    description: "Winners from last week's tournaments",
    image: "/highlights/pokernfts_highlights_9.jpg",
    type: "community",
    date: "2024-11-22"
  }
];

// Utility functions for highlights
export const getHighlightsByType = (type: Highlight['type']): Highlight[] => {
  return highlights.filter(highlight => highlight.type === type);
};

export const getRecentHighlights = (count: number = 9): Highlight[] => {
  return highlights
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, count);
};

export const getHighlightById = (id: number): Highlight | undefined => {
  return highlights.find(highlight => highlight.id === id);
};

// Export for easy access to different types
export const communityHighlights = getHighlightsByType('community');
export const gameplayHighlights = getHighlightsByType('gameplay');
export const tournamentHighlights = getHighlightsByType('tournament');
export const featureHighlights = getHighlightsByType('feature');