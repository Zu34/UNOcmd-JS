// src/logic/Game.js

const { deprecate } = require('node:util');
const Config = require('../Config');
const colors = require('../constants/colors');
const events = require('../constants/events');
const values = require('../constants/values');
const Event = require('../events/Event');
const EventManager = require('../events/EventManager');
const PlayerChangeEvent = require('../events/PlayerChangeEvent');
const PlayerDrawEvent = require('../events/PlayerDrawEvent');
const PlayerPlayEvent = require('../events/PlayerPlayEvent');
const Card = require('./cards/Card');

// Overridable classes
let Deck = require('./cards/Deck');
let Player = require('./players/Player');

module.exports = class Game {
  /**
   * @param {string[] | Player[]} players
   * @param {Config} config
   */
  constructor(players = [], config = new Config()) {
    if (!Array.isArray(players)) throw new Error("Players must be an array");

    // Validate players array: strings or Player instances only
    for (const player of players) {
      if (typeof player === "string") continue;
      if (!(player instanceof Player)) {
        throw new Error("Players must be an array of strings or Player instances");
      }
    }

    if (!(config instanceof Config)) throw new Error("Config must be an instance of Config");

    this.config = config;

    // Override classes if provided
    const ovrClasses = this.config.override.classes;
    Deck = ovrClasses.Deck || Deck;
    Player = ovrClasses.Player || Player;

    this.initPlayers = players;

    /** @type {"CW" | "CCW"} */
    this.rotation = config.defaultRotation;

    /** @type {Player | null} */
    this.currentPlayer = null;

    /** @type {"NOT_STARTED" | "PLAYING" | "STACK_DRAW" | "CONTEST"} */
    this.state = "NOT_STARTED";

    /** Amount of cards to draw after stacking */
    this.stackDrawAmount = 0;

    /** @type {Deck} */
    this.discardedCards = new Deck();

    /** @type {Deck[]} */
    this.decks = [];

    /** @type {Player[]} */
    this.players = [];

    /** @type {EventManager} */
    this.eventManager = new EventManager();
  }

  /**
   * @deprecated since version 3.2.0. Use Game.players or Game.initPlayers instead.
   * Returns player names as strings.
   * @returns {string[]}
   */
  get playerNames() {
    return deprecate(() => {
      if (this.players.length > 0) {
        return this.players.map(player => player.name);
      }
      return this.initPlayers.map(p => (p instanceof Player ? p.name : p));
    }, "playerNames (Game#playerNames) is deprecated. Use Game#players or Game#initPlayers instead.")();
  }

  set playerNames(value) {
    deprecate(() => {
      this.initPlayers = value;
    }, "playerNames (Game#playerNames) is deprecated. Use Game#players or Game#initPlayers instead.")();
  }

  /**
   * Starts the game: initializes decks and players, picks current player,
   * and sets the initial card on discard pile.
   */
  start() {
    if (this.initPlayers.length < 2) throw new Error("Not enough players");
    if (this.state !== "NOT_STARTED") throw new Error("Game already started");

    const decksNeeded = Math.ceil(this.initPlayers.length / this.config.playersPerDeck);
    for (let i = 0; i < decksNeeded; i++) {
      this.decks.push(new Deck().insertDefaultCards());
    }

    for (let i = 0; i < this.initPlayers.length; i++) {
      let player = this.initPlayers[i];
      if (typeof player === "string") {
        player = new Player(player, i);
      }
      this.draw(player, this.config.initialCards, false, true, true, true);
      this.players.push(player);
    }

    this.currentPlayer = this.#getRandomFromArr(this.players);

    // Pick valid first card to start the discard pile
    const deck = this.#getDeck();
    const validFirstCards = deck.cards.filter(c =>
      c.color.color !== colors.BLACK &&
      c.value.value !== values.DRAW_TWO &&
      c.value.value !== values.REVERSE &&
      c.value.value !== values.SKIP
    );

    const card = this.#getRandomFromArr(validFirstCards);
    this.discardedCards.addCard(card);
    deck.removeCard(card);

    this.state = "PLAYING";
  }

  /**
   * Draw cards for a player with various options
   * @param {Player} player
   * @param {number} cards
   * @param {boolean} isNext whether to advance the player after draw
   * @param {boolean} silent whether to suppress draw event
   * @param {boolean} nextSilent whether to suppress player change event
   * @param {boolean} force ignore turn check
   * @returns {boolean} whether drawing was successful
   */
  draw(player, cards = 1, isNext = true, silent = false, nextSilent = false, force = false) {
    if (!player) throw new Error("No player provided");
    if (!(player instanceof Player)) throw new Error("Player must be an instance of Player");

    if (typeof cards !== "number" || cards < 1 || !Number.isInteger(cards)) {
      throw new Error("Cards must be a positive integer");
    }
    if (!force && player !== this.currentPlayer) return false;

    let deck = this.#getDeck();
    const drawnCards = [];

    if (this.state === "STACK_DRAW") {
      cards = this.stackDrawAmount;
      this.stackDrawAmount = 0;
      this.state = "PLAYING";
    }

    for (let i = 0; i < cards; i++) {
      if (deck.cards.length > 0) {
        const card = deck.getTopCard(true);
        player.hand.addCard(card);
        drawnCards.push(card);
      } else {
        deck = this.#getDeck();
        if (deck.cards.length === 0) break;
        i--;
      }
    }

    if (!silent) this.eventManager.fireEvent(PlayerDrawEvent.fire(player, drawnCards));

    if (isNext) this.setNextPlayer(nextSilent);

    return drawnCards.length === cards;
  }

  /**
   * Applies game logic for special cards (reverse, skip, draw two, draw four)
   * @param {Player} player
   * @param {Card} card
   * @returns {boolean}
   */
  #gameLogic(player, card) {
    switch (card.value.value) {
      case values.REVERSE:
        this.flipDirection();
        if (this.players.length === 2) {
          this.setNextPlayer(true);
        }
        return true;

      case values.SKIP:
        this.setNextPlayer(true);
        return true;

      case values.DRAW_TWO:
        if (
          this.config.stackCards &&
          this.getNextPlayer().hand.getCard(undefined, values.DRAW_TWO) !== null
        ) {
          this.stackDrawAmount += 2;
          this.state = "STACK_DRAW";
        } else {
          if (this.state === "STACK_DRAW") {
            this.stackDrawAmount += 2;
            this.draw(this.getNextPlayer(), this.stackDrawAmount, true, false, true, true);
            this.stackDrawAmount = 0;
            this.state = "PLAYING";
          } else {
            this.draw(this.getNextPlayer(), 2, true, false, true, true);
          }
        }
        return true;

      case values.WILD_DRAW_FOUR:
        if (
          this.config.stackCards &&
          this.getNextPlayer().hand.getCard(undefined, values.WILD_DRAW_FOUR) !== null
        ) {
          this.stackDrawAmount += 4;
          this.state = "STACK_DRAW";
        } else {
          if (this.state === "STACK_DRAW") {
            this.stackDrawAmount += 4;
            this.draw(this.getNextPlayer(), this.stackDrawAmount, true, false, true, true);
            this.stackDrawAmount = 0;
            this.state = "PLAYING";
          } else {
            this.draw(this.getNextPlayer(), 4, true, false, true, true);
          }
        }
        return true;

      case values.WILD:
        // No additional game logic needed here for wild
        return true;

      default:
        return true;
    }
  }

  /**
   * Player attempts to play a card
   * @param {Player} player
   * @param {Card} card
   * @returns {boolean} success
   */
  play(player, card) {
    if (!player) throw new Error("No player provided");
    if (!(player instanceof Player)) throw new Error("Player must be an instance of Player");
    if (!card) throw new Error("No card provided");
    if (!(card instanceof Card)) throw new Error("Card must be an instance of Card");

    const topDiscard = this.discardedCards.getTopCard();

    if (
      player.hand.cards.includes(card) &&
      player === this.currentPlayer &&
      card.isValidOn(topDiscard, true, this.config.stackCards && this.state === "STACK_DRAW")
    ) {
      if (card.wild) card.color = card.wildPickedColor;

      if (typeof this.config.override.functions.gameLogic === 'function') {
        this.config.override.functions.gameLogic(player, card);
      } else {
        this.#gameLogic(player, card);
      }

      player.hand.removeCard(card);
      this.discardedCards.addCard(card);
      this.eventManager.fireEvent(PlayerPlayEvent.fire(player, card, this.getNextPlayer()));
      this.setNextPlayer();
      return true;
    }

    return false;
  }

  /**
   * Gets the next player based on rotation and current player
   * @param {"CW" | "CCW"} rotation
   * @param {Player | null} currentPlayer
   * @returns {Player}
   */
  getNextPlayer(rotation = this.rotation, currentPlayer = this.currentPlayer) {
    if (rotation !== "CW" && rotation !== "CCW") {
      throw new Error("Invalid rotation. It must be 'CW' or 'CCW'.");
    }
    if (currentPlayer !== null && !(currentPlayer instanceof Player)) {
      throw new Error("CurrentPlayer must be an instance of Player or null.");
    }
    if (currentPlayer === null) return this.#getRandomFromArr(this.players);

    let index = this.players.indexOf(currentPlayer);
    if (rotation === "CW") {
      index = (index + 1) % this.players.length;
    } else {
      index = (index - 1 + this.players.length) % this.players.length;
    }
    return this.players[index];
  }

  /**
   * Serialize game state to JSON
   */
  toJSON() {
    return {
      config: this.config.toJSON(),
      initPlayers: this.initPlayers.map(p => (p instanceof Player ? p.toJSON() : p)),
      rotation: this.rotation,
      currentPlayer: this.currentPlayer,
      state: this.state,
      discardedCards: this.discardedCards.toJSON(),
      decks: this.decks.map(d => d.toJSON()),
      players: this.players.map(p => p.toJSON()),
    };
  }

  /**
   * Reconstructs a Game instance from JSON
   * @param {any} json
   * @param {Config} config only override part is used
   * @returns {Game}
   */
  static fromJSON(json, config) {
    const invalidText = "Invalid JSON: {0}. You can only import a game that was exported or you did something wrong.";
    if (!json) throw new Error(invalidText.replace("{0}", "No JSON provided"));
    if (!json.initPlayers) throw new Error(invalidText.replace("{0}", "No initPlayers"));
    if (!json.decks) throw new Error(invalidText.replace("{0}", "No decks"));
    if (!json.players) throw new Error(invalidText.replace("{0}", "No players"));
    if (!json.discardedCards) throw new Error(invalidText.replace("{0}", "No discardedCards"));

    // Use provided config or default
    config = config instanceof Config ? config : new Config();

    const game = new Game(json.initPlayers, config);
    game.rotation = json.rotation;
    game.currentPlayer = json.currentPlayer;

    game.decks = json.decks.map(deckJson => Deck.fromJSON(deckJson));
    game.players = json.players.map(playerJson => Player.fromJSON(playerJson));
    game.discardedCards = Deck.fromJSON(json.discardedCards);

    game.state = json.state;

    return game;
  }

  /**
   * Advances currentPlayer to the next player
   * @param {boolean} silent if true, does not fire player change event
   */
  setNextPlayer(silent = false) {
    this.currentPlayer = this.getNextPlayer();

    if (!silent) {
      this.eventManager.fireEvent(PlayerChangeEvent.fire(this.currentPlayer));
    }
  }

  /**
   * Flips the rotation of play direction
   */
  flipDirection() {
    this.rotation = this.rotation === "CW" ? "CCW" : "CW";
  }

  /**
   * Get the active deck (the one with cards left, or reshuffle if empty)
   * @returns {Deck}
   */
  #getDeck() {
    let deck = this.decks.find(d => d.cards.length > 0);
    if (!deck) {
      // Reshuffle discarded cards except the top one
      const topCard = this.discardedCards.getTopCard(true);
      const cardsToShuffle = this.discardedCards.cards;
      this.discardedCards = new Deck();
      if (topCard) this.discardedCards.addCard(topCard);
      deck = new Deck();
      deck.cards = cardsToShuffle;
      deck.shuffle();
      this.decks = [deck];
    }
    return deck;
  }

  /**
   * Utility to get a random element from an array
   * @param {Array} arr
   */
  #getRandomFromArr(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }
};
