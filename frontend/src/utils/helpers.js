export const getCategoryEmoji = (category) => {
  const emojiMap = {
    'Chinese': '🥡',
    'Burger': '🍔',
    'Soup': '🥣',
    'Pav Bhaji': '🫓',
    'Noodles': '🍜',
    'Rice': '🍚',
    'Maggi': '🍲',
    'Rolls': '🌯',
    'Momos': '🥟',
    'Finger': '🍗',
    'Combos': '🍱',
    'Starters': '🍟',
    'Main Course': '🍛',
    'Breads': '🍞',
    'Desserts': '🍨',
    'Beverages': '🥤',
    'Water': '🧊',
    'Water Bottle': '💧',
    'Cold Drink': '🥤',
    'Soda': '🥫',
    'Cola': '🥤',
    'Soft Drink': '🧋',
  };
  
  // If category is found in the map, return its emoji
  if (emojiMap[category]) {
    return emojiMap[category];
  }
  
  // For categories not in the predefined list, assign a random food emoji
  const defaultEmojis = [
    '🍽️', '🍴', '🥄', '🍳', '🥘', '🍝', '🌮', 
    '🥗', '🥪', '🌭', '🍕', '🥓', '🧆', '🥙',
    '🧇', '🍖', '🍤', '🥞', '🍙', '🍘', '🥠'
  ];
  
  // Use a hash function based on the category name to ensure consistency
  // This way the same category will always get the same emoji
  const hashCode = str => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };
  
  const hash = Math.abs(hashCode(category));
  const index = hash % defaultEmojis.length;
  
  return defaultEmojis[index];
}; 