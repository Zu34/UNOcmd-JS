// index.js

// Card-related modules
const {
    Card,
    Deck,
    Color,
    Value
  } = {
    Card: require('./src/logic/cards/Card'),
    Deck: require('./src/logic/cards/Deck'),
    Color: require('./src/logic/cards/Color'),
    Value: require('./src/logic/cards/Value'),
  };
  
  // Player and Game logic
  const Player = require('./src/logic/players/Player');
  const Game = require('./src/logic/Game');
  const Config = require('./src/Config');
  
  // Event system
  const {
    Event,
    EventManager,
    PlayerPlayEvent,
    PlayerDrawEvent,
    PlayerChangeEvent,
    FireEvent
  } = {
    Event: require('./src/events/Event'),
    EventManager: require('./src/events/EventManager'),
    PlayerPlayEvent: require('./src/events/PlayerPlayEvent'),
    PlayerDrawEvent: require('./src/events/PlayerDrawEvent'),
    PlayerChangeEvent: require('./src/events/PlayerChangeEvent'),
    FireEvent: require('./src/events/FireEvent'),
  };
  
  // Constants grouped by category
  const constants = {
    cardCounts: require('./src/constants/cardCounts'),
    colors: require('./src/constants/colors'),
    events: require('./src/constants/events'),
    values: require('./src/constants/values'),
  };
  
  // Export all modules and constants cleanly
  module.exports = {
    Game,
    Config,
    Card,
    Deck,
    Color,
    Value,
    Player,
    constants,
    events: {
      FireEvent,
      EventManager,
      Event,
      PlayerPlayEvent,
      PlayerDrawEvent,
      PlayerChangeEvent,
    },
  };
  