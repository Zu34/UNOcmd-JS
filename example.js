// example.js

const { Game, events, constants, Player, Config } = require('./index.js');
const readline = require('readline');

class ComputerPlayer extends Player {
  constructor(name, id) {
    super(name, id);
    console.log("Computer player created");
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askUser = (question) => new Promise(resolve => rl.question(question, resolve));

function parseCardInput(input) {
  // Simplified mapping
  const replacements = {
    wd4: 'WILD_DRAW_FOUR',
    d2: 'DRAW_TWO',
    r: 'RED',
    g: 'GREEN',
    b: 'BLUE',
    y: 'YELLOW',
    w: 'WILD',
    s: 'SKIP',
    rev: 'REVERSE',
    0: 'ZERO',
    1: 'ONE',
    2: 'TWO',
    3: 'THREE',
    4: 'FOUR',
    5: 'FIVE',
    6: 'SIX',
    7: 'SEVEN',
    8: 'EIGHT',
    9: 'NINE',
  };

  let parts = input.toLowerCase().split(/\s+/);
  parts = parts.map(part => replacements[part] || part.toUpperCase());

  return parts;
}

async function main() {
  const config = new Config();
  config.override.classes.Player = ComputerPlayer;

  const playerName = await askUser("What's your name? ");

  const game = new Game([playerName, "Computer"], config);

  // Register events
  game.eventManager.addEvent(new events.PlayerPlayEvent((player, card) => {
    console.log(`${player.name} played ${card}`);
  }));

  game.eventManager.addEvent(new events.PlayerChangeEvent((_, newPlayer) => {
    console.log(`It's now ${newPlayer.name}'s turn.`);
  }));

  game.eventManager.addEvent(new events.PlayerDrawEvent((player, cards) => {
    if (player.name === "Computer") {
      console.log(`${player.name} drew ${cards.length} cards`);
    } else {
      console.log(`${player.name} drew ${cards}`);
    }
  }));

  game.start();

  // Main game loop
  while (!game.isFinished) {
    const currentPlayer = game.currentPlayer;

    if (currentPlayer.name === "Computer") {
      await computerTurn(game);
    } else {
      await userTurn(game, playerName);
    }
  }

  console.log(`Game Over! Winner: ${game.winner.name}`);
  rl.close();
}

async function computerTurn(game) {
  const player = game.currentPlayer;
  const topCard = game.discardedCards.getTopCard();

  const playable = player.getPlayableCards(topCard);
  if (playable.length === 0) {
    game.draw(player);
    return;
  }

  // Prioritize non-wild cards
  let choices = playable.filter(c => !c.wild);
  if (choices.length === 0) choices = playable;

  const card = choices[Math.floor(Math.random() * choices.length)];

  if (card.wild) {
    const counts = player.hand.getColorCounts();
    const preferredColor = Object.entries(counts).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
    card.wildPickedColor = constants.colors[preferredColor];
  }

  const played = game.play(player, card);
  if (!played) {
    // Retry once (optional)
    await computerTurn(game);
  }
}

async function userTurn(game, playerName) {
  const player = game.currentPlayer;
  const topCard = game.discardedCards.getTopCard();

  console.log("\nOpponent's cards:");
  game.players.forEach(p => {
    if (p.name !== playerName) {
      console.log(`  ${p.name}: ${p.hand.cards.length} cards`);
    }
  });

  console.log(`\nDiscard pile: ${topCard}`);
  console.log(`Your hand: ${player.hand.cards.join(', ')}`);

  console.log("Colors in hand:");
  const counts = player.hand.getColorCounts();
  for (const color in counts) {
    console.log(`  ${color}: ${counts[color]}`);
  }

  const playable = player.getPlayableCards(topCard);
  console.log("Playable cards:", playable.join(', '));

  const input = await askUser("Play a card or type 'd' to draw: ");
  if (input.toLowerCase() === 'd') {
    game.draw(player);
    return;
  }

  const [color, value] = parseCardInput(input);
  const card = player.hand.getCard(color, value);

  if (!card) {
    console.log("Invalid card. Try again.");
    return userTurn(game, playerName);
  }

  const played = game.play(player, card);
  if (!played) {
    console.log("Cannot play that card. Try again.");
    return userTurn(game, playerName);
  }
}

// Run the game
main().catch(err => {
  console.error(err);
  rl.close();
});
