///|
/// Winner indices are zero-based and can contain multiple players in a tie.
pub struct Showdown {
  winners : Array[Int]
  evaluations : Array[Evaluation]
} derive(Debug)

///|
pub extend Showdown with @moonbitlang/core/debug.Debug::{to_repr}

///|
/// Determine winners with exactly five board cards and two cards per player.
/// This compares hands only; it does not model bets, folded players or side pots.
pub fn showdown(
  hands : Array[Array[Card]],
  board : Array[Card],
) -> Result[Showdown, String] {
  if hands.length() < 2 || hands.length() > 23 {
    return Err("Expected 2 to 23 players")
  }
  if board.length() != 5 {
    return Err("Showdown requires five board cards")
  }
  let all = board.copy()
  for hand in hands {
    if hand.length() != 2 {
      return Err("Each player needs two hole cards")
    }
    for card in hand {
      all.push(card)
    }
  }
  if validate_unique(all) is Some(e) {
    return Err(e)
  }
  let evaluations = []
  let winners = []
  let mut best = -1
  for i in 0..<hands.length() {
    let cards = board.copy()
    for card in hands[i] {
      cards.push(card)
    }
    let evaluation = best_unchecked(cards)
    evaluations.push(evaluation)
    if evaluation.strength > best {
      winners.clear()
      winners.push(i)
      best = evaluation.strength
    } else if evaluation.strength == best {
      winners.push(i)
    }
  }
  Ok({ winners, evaluations, })
}

///|
/// Exact counts over equally likely remaining boards for two known hands.
pub struct Equity {
  wins : Int
  losses : Int
  ties : Int
  total : Int
} derive(Eq, Debug)

///|
pub extend Equity with Eq::{equal, not_equal}

///|
pub extend Equity with @moonbitlang/core/debug.Debug::{to_repr}

///|
/// Fraction won outright (ties excluded).
pub fn Equity::win_probability(self : Equity) -> Double {
  self.wins.to_double() / self.total.to_double()
}

///|
/// Expected pot fraction with ties split equally between the two players.
pub fn Equity::pot_equity(self : Equity) -> Double {
  (self.wins.to_double() + self.ties.to_double() / 2.0) / self.total.to_double()
}

///|
/// Enumerate remaining boards on flop, turn or river (3 to 5 known board cards).
/// Preflop and opponent ranges are deliberately outside v0.1's scope.
pub fn exact_equity(
  hero : Array[Card],
  villain : Array[Card],
  board : Array[Card],
) -> Result[Equity, String] {
  if hero.length() != 2 || villain.length() != 2 {
    return Err("Each player needs two hole cards")
  }
  if board.length() < 3 || board.length() > 5 {
    return Err("Exact equity requires 3 to 5 board cards")
  }
  let known = board.copy()
  for card in hero {
    known.push(card)
  }
  for card in villain {
    known.push(card)
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
  let completed = board.copy()
  let counts = [0, 0, 0]
  enumerate_boards(hero, villain, completed, deck, 0, counts)
  Ok({
    wins: counts[0],
    losses: counts[1],
    ties: counts[2],
    total: counts[0] + counts[1] + counts[2],
  })
}

///|
fn enumerate_boards(
  hero : Array[Card],
  villain : Array[Card],
  board : Array[Card],
  deck : Array[Card],
  start : Int,
  counts : Array[Int],
) -> Unit {
  if board.length() == 5 {
    let h = board.copy()
    let v = board.copy()
    for card in hero {
      h.push(card)
    }
    for card in villain {
      v.push(card)
    }
    let result = compare(best_unchecked(h), best_unchecked(v))
    let index = if result > 0 { 0 } else if result < 0 { 1 } else { 2 }
    counts[index] += 1
    return
  }
  let needed = 5 - board.length()
  for i in start..<(deck.length() - needed + 1) {
    board.push(deck[i])
    enumerate_boards(hero, villain, board, deck, i + 1, counts)
    ignore(board.pop())
  }
}
