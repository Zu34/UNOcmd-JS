// src/logic/players/player.js

const Card = require("../cards/Card");
const Deck = require("../cards/Deck");

class Player {
  /**
   * @param {string} name
   * @param {number} [id=-1]
   */
  constructor(name, id = -1) {
    this.name = name;
    /** @type {Deck} */
    this.hand = new Deck();
    this.id = id;
  }

  /**
   * Get all cards from hand that are playable on the given card.
   * @param {Card} card - The card to play on top of.
   * @param {boolean} [toPlay=false] - Whether the card is about to be played.
   * @param {boolean} [isStacking=false] - Whether to consider stacking rules.
   * @returns {Card[]}
   */
  getPlayableCards(card, toPlay = false, isStacking = false) {
    return this.hand.cards.filter((c) => c.isValidOn(card, toPlay, isStacking));
  }

  /**
   * String representation of the player.
   * @returns {string}
   */
  toString() {
    return this.name;
  }

  /**
   * Serialize player to JSON.
   * @returns {object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      hand: this.hand.toJSON(),
    };
  }

  /**
   * Create player instance from JSON data.
   * @param {object} json
   * @returns {Player}
   */
  static fromJSON(json) {
    const player = new Player(json.name, json.id);
    player.hand = Deck.fromJSON(json.hand);
    return player;
  }
}

module.exports = Player;
