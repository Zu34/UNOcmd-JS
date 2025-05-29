// src/logic/cards/Value.js

const definitionConstants = require('../../constants/values');

class Value {
  /**
   * @param {string} value
   */
  constructor(value) {
    if (this._isValid(value)) {
      this.value = value;
    } else {
      throw new Error(`Invalid value: ${value}`);
    }
  }

  /**
   * Validate the given value.
   * @param {string} [value=this.value]
   * @returns {boolean}
   */
  _isValid(value = this.value) {
    return value in definitionConstants;
  }

  /**
   * Check if the value is a wild card.
   * @returns {boolean}
   */
  isWild() {
    return (
      this.value === definitionConstants.WILD ||
      this.value === definitionConstants.WILD_DRAW_FOUR
    );
  }

  /**
   * Get string representation.
   * @returns {string}
   */
  toString() {
    return this.value;
  }

  /**
   * Serialize to JSON.
   * @returns {string}
   */
  toJSON() {
    return this.value;
  }

  /**
   * Deserialize from JSON.
   * @param {string} json
   * @returns {Value}
   */
  static fromJSON(json) {
    return new Value(json);
  }
}

module.exports = Value;
