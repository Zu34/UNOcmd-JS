// src/logic/cards/Deck.js

const Card = require("./Card");
const cardCounts = require("../../constants/cardCounts");
const colors = require("../../constants/colors");
const Color = require("./Color");
const Value = require("./Value");

class Deck {
  constructor() {
    /** @type {Card[]} */
    this.cards = [];
  }

  /**
   * Get the top card of the deck.
   * @param {boolean} [remove=false] - Whether to remove the top card.
   * @returns {Card|undefined}
   */
  getTopCard(remove = false) {
    if (remove) return this.cards.shift();
    return this.cards[0];
  }

  /**
   * Find a card by color and/or value.
   * @param {Color|string} [color] - Color to search for.
   * @param {Value|string} [value] - Value to search for.
   * @returns {Card|null}
   */
  getCard(color, value) {
    if (color === undefined && value === undefined) return null;

    if (typeof color === "string") color = new Color(color);
    if (typeof value === "string") value = new Value(value);

    const isWild = value?.isWild() || false;

    const card = this.cards.find(c => {
      const colorMatches = isWild || !color || c.color.color === color.color;
      const valueMatches = !value || c.value.value === value.value;
      return colorMatches && valueMatches;
    });

    if (!card) return null;

    if (card.wild) {
      card.wildPickedColor = color;
    }

    return card;
  }

  /**
   * Count cards by their color.
   * @returns {Object<string, number>} - Object with color keys and counts.
   */
  getColorCounts() {
    return this.cards.reduce((counts, card) => {
      counts[card.color.color] = (counts[card.color.color] || 0) + 1;
      return counts;
    }, {});
  }

  /**
   * Remove a specific card from the deck.
   * @param {Card} card
   * @returns {boolean} - True if removed, false otherwise.
   */
  removeCard(card) {
    const index = this.cards.findIndex(
      c => c === card || (c.color.color === card.color.color && c.value.value === card.value.value)
    );
    if (index === -1) return false;
    this.cards.splice(index, 1);
    return true;
  }

  /**
   * Add a card to the top of the deck.
   * @param {Card} card
   */
  addCard(card) {
    this.cards.unshift(card);
  }

  /**
   * Populate the deck with the default set of cards.
   * @returns {Deck}
   */
  insertDefaultCards() {
    this.cards = [];
    for (const color in cardCounts) {
      for (const value in cardCounts[color]) {
        const count = cardCounts[color][value];
        for (let i = 0; i < count; i++) {
          this.addCard(new Card(color, value, color === colors.BLACK));
        }
      }
    }
    this.shuffle();
    return this;
  }

  /**
   * Shuffle the deck randomly.
   * @returns {Deck}
   */
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    return this;
  }

  /**
   * Convert the deck to JSON.
   * @returns {Array}
   */
  toJSON() {
    return this.cards.map(card => card.toJSON());
  }

  /**
   * Create a deck instance from JSON.
   * @param {Array} json
   * @returns {Deck}
   */
  static fromJSON(json) {
    const deck = new Deck();
    deck.cards = json.map(Card.fromJSON);
    return deck;
  }
}

module.exports = Deck;
