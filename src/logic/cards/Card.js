// src/logic/cards/Card.js

const colors = require("../../constants/colors");
const values = require("../../constants/values");
const Color = require("./Color");
const Value = require("./Value");

class Card {
  #colorInstance;
  #valueInstance;

  /**
   * @param {Color | string} color 
   * @param {Value | string} value 
   * @param {boolean=} wild 
   */
  constructor(color, value, wild = false) {
    this.color = typeof color === "string" ? new Color(color) : color;
    this.value = typeof value === "string" ? new Value(value) : value;

    this.wild = wild || (this.color.isWild() && this.value.isWild());

    // Wild cards get a picked color, default to BLACK if not chosen yet
    this.wildPickedColor = this.wild ? new Color(colors.BLACK) : null;
  }

  /**
   * Checks if this card can be played on top of another card.
   * @param {Card} card - The card on the discard pile
   * @param {boolean} [toPlay=false] - If true, do not allow wild card without chosen color
   * @param {boolean} [isStacking=false] - If true, check stacking rules for special cards
   * @returns {boolean} - Whether the card can be played
   */
  isValidOn(card, toPlay = false, isStacking = false) {
    if (!card) return false;

    if (isStacking) {
      if ([values.DRAW_TWO, values.WILD_DRAW_FOUR].includes(this.value.value)) {
        return card.value.value === this.value.value;
      }
      return false;
    }

    // Wild cards cannot be played on wild cards
    if (this.wild && card.wild) return false;

    // Wild cards can be played if not in "toPlay" mode
    if (!toPlay && this.wild) return true;

    // Wild cards must have a picked color to be valid in "toPlay" mode
    if (this.wild) {
      return this.wildPickedColor?.color !== colors.BLACK;
    }

    // Normal card matches by color or value
    return this.color.color === card.color.color || this.value.value === card.value.value;
  }

  toString() {
    return `${this.color} ${this.value}`;
  }

  // Color getter/setter
  get color() {
    return this.#colorInstance;
  }
  set color(color) {
    this.#colorInstance = typeof color === "string" ? new Color(color) : color;
  }

  // Value getter/setter
  get value() {
    return this.#valueInstance;
  }
  set value(value) {
    this.#valueInstance = typeof value === "string" ? new Value(value) : value;
  }

  toJSON() {
    return {
      color: this.color.toJSON(),
      value: this.value.toJSON(),
      wild: this.wild,
      wildPickedColor: this.wildPickedColor?.toJSON() ?? null,
    };
  }

  static fromJSON(json) {
    const card = new Card(
      Color.fromJSON(json.color),
      Value.fromJSON(json.value),
      json.wild
    );

    if (json.wildPickedColor) {
      card.wildPickedColor = Color.fromJSON(json.wildPickedColor);
    }

    return card;
  }
}

module.exports = Card;
