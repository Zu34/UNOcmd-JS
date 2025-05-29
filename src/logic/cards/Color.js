// src/logic/cards/Color.js

const COLORS = require("../../constants/colors");

class Color {
  /**
   * @param {string} color
   */
  constructor(color) {
    if (this.isValid(color)) {
      this.color = color;
    } else {
      throw new Error(`Invalid color: ${color}`);
    }
  }

  /**
   * Validate if the color exists in constants
   * @param {string} [color=this.color]
   * @returns {boolean}
   */
  isValid(color = this.color) {
    return COLORS.hasOwnProperty(color);
  }

  /**
   * Check if this color is the wild color (BLACK)
   * @returns {boolean}
   */
  isWild() {
    return this.color === COLORS.BLACK;
  }

  toString() {
    return this.color;
  }

  toJSON() {
    return this.color;
  }

  /**
   * Create a Color instance from JSON/string
   * @param {string} json
   * @returns {Color}
   */
  static fromJSON(json) {
    return new Color(json);
  }
}

module.exports = Color;
