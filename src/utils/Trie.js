/**
 * Trie (Prefix Tree) data structure for efficient word storage and lookup
 * Used for validating Scrabble words in real-time
 */
export class Trie {
  constructor(words = []) {
    this.root = {};
    words.forEach(word => this.insert(word));
  }

  /**
   * Insert a word into the trie
   * @param {string} word - Word to insert
   */
  insert(word) {
    const normalized = word.toUpperCase();
    let node = this.root;
    
    for (const char of normalized) {
      if (!node[char]) {
        node[char] = {};
      }
      node = node[char];
    }
    
    // Mark end of word
    node.isWord = true;
  }

  /**
   * Search for an exact word in the trie
   * @param {string} word - Word to search for
   * @returns {boolean} True if word exists
   */
  search(word) {
    const normalized = word.toUpperCase();
    let node = this.root;
    
    for (const char of normalized) {
      if (!node[char]) {
        return false;
      }
      node = node[char];
    }
    
    return node.isWord === true;
  }

  /**
   * Check if any word in trie starts with the given prefix
   * @param {string} prefix - Prefix to search for
   * @returns {boolean} True if prefix exists
   */
  startsWith(prefix) {
    const normalized = prefix.toUpperCase();
    let node = this.root;
    
    for (const char of normalized) {
      if (!node[char]) {
        return false;
      }
      node = node[char];
    }
    
    return true;
  }

  /**
   * Get all words with a given prefix (for autocomplete)
   * @param {string} prefix - Prefix to search for
   * @returns {string[]} Array of words with prefix
   */
  getWordsWithPrefix(prefix) {
    const normalized = prefix.toUpperCase();
    let node = this.root;
    
    for (const char of normalized) {
      if (!node[char]) {
        return [];
      }
      node = node[char];
    }
    
    const words = [];
    this._dfs(node, normalized, words);
    return words;
  }

  /**
   * DFS helper to collect all words from a node
   * @private
   */
  _dfs(node, current, words) {
    if (node.isWord) {
      words.push(current);
    }
    
    for (const [char, childNode] of Object.entries(node)) {
      if (char !== 'isWord') {
        this._dfs(childNode, current + char, words);
      }
    }
  }
}
