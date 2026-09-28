///|
/// Counts are relative to the whole table. A tie means sharing first place.
pub struct PlayerEquity {
  wins : Int
  ties : Int
  losses : Int
  equity : Double
}

///|
/// Exact outcomes for 2–8 known hands; equity splits tied boards by winner count.
pub struct TableEquity {
  players : Array[PlayerEquity]
  total : Int
}

///|
/// Enumerate all remaining community cards on flop, turn or river.
/// No folds, unequal stakes, side pots, unknown hands or additional dead cards.
pub fn exact_table_equity(
  hands : Array[Array[Card]],
  board : Array[Card],
) -> Result[TableEquity, String] {
  if hands.length() < 2 || hands.length() > 8 {
    return Err("Expected 2 to 8 players")
  }
  if board.length() < 3 || board.length() > 5 {
    return Err("Expected 3 to 5 community cards")
  }
  let known = board.copy()
  for hand in hands {
    if hand.length() != 2 {
      return Err("Each player needs two hole cards")
    }
    for card in hand {
      known.push(card)
    }
  }
  if validate_unique(known) is Some(e) {
    return Err(e)
  }
  let deck = []
  for id in 0..<52 {
    let card = Card::{ id, }
    if !known.contains(card) {
      deck.push(card)
    }
  }
  let wins = Array::make(hands.length(), 0)
  let ties = Array::make(hands.length(), 0)
  let shares = Array::make(hands.length(), 0.0)
  let total = enumerate_table(hands, board.copy(), deck, 0, wins, ties, shares)
  let players = []
  for i in 0..<hands.length() {
    players.push({
      wins: wins[i],
      ties: ties[i],
      losses: total - wins[i] - ties[i],
      equity: shares[i] / total.to_double(),
    })
  }
  Ok({ players, total, })
}

///|
fn enumerate_table(
  hands : Array[Array[Card]],
  board : Array[Card],
  deck : Array[Card],
  start : Int,
  wins : Array[Int],
  ties : Array[Int],
  shares : Array[Double],
) -> Int {
  if board.length() == 5 {
    let winners = []
    let mut highest = -1
    for i in 0..<hands.length() {
      let cards = board.copy()
      for card in hands[i] {
        cards.push(card)
      }
      let strength = best_unchecked(cards).strength
      if strength > highest {
        highest = strength
        winners.clear()
        winners.push(i)
      } else if strength == highest {
        winners.push(i)
      }
    }
    for i in winners {
      if winners.length() == 1 {
        wins[i] += 1
      } else {
        ties[i] += 1
      }
      shares[i] += 1.0 / winners.length().to_double()
    }
    return 1
  }
  let mut total = 0
  let needed = 5 - board.length()
  for i in start..<(deck.length() - needed + 1) {
    board.push(deck[i])
    total += enumerate_table(hands, board, deck, i + 1, wins, ties, shares)
    ignore(board.pop())
  }
  total
}
