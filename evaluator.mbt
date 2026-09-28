///|
/// Categories ordered by standard high-poker strength.
pub(all) enum Category {
  HighCard
  OnePair
  TwoPair
  ThreeOfAKind
  Straight
  Flush
  FullHouse
  FourOfAKind
  StraightFlush
} derive(Eq, Debug)

///|
/// The selected five cards and the ranks used to break ties, highest priority first.
/// Suits never break a tie. A royal flush is an ace-high StraightFlush.
pub struct Evaluation {
  category : Category
  tie_break : Array[Int]
  best_five : Array[Card]
  priv strength : Int
} derive(Eq, Debug)

///|
/// Compare evaluations: 1 if left wins, -1 if right wins, 0 for a tie.
pub fn compare(left : Evaluation, right : Evaluation) -> Int {
  if left.strength > right.strength {
    1
  } else if left.strength < right.strength {
    -1
  } else {
    0
  }
}

///|
/// Evaluate exactly five distinct cards.
pub fn evaluate_five(cards : Array[Card]) -> Result[Evaluation, String] {
  if cards.length() != 5 {
    return Err("Expected exactly five cards")
  }
  if validate_unique(cards) is Some(e) {
    return Err(e)
  }
  Ok(rank_five(cards))
}

///|
/// Evaluate five, six or seven distinct cards by exhaustive five-card subsets.
/// Equal-strength subsets keep the first combination in input order.
pub fn evaluate(cards : Array[Card]) -> Result[Evaluation, String] {
  if cards.length() < 5 || cards.length() > 7 {
    return Err("Expected five to seven cards")
  }
  if validate_unique(cards) is Some(e) {
    return Err(e)
  }
  Ok(best_unchecked(cards))
}

///|
fn best_unchecked(cards : Array[Card]) -> Evaluation {
  let mut best = rank_five([cards[0], cards[1], cards[2], cards[3], cards[4]])
  let n = cards.length()
  for a in 0..<(n - 4) {
    for b in (a + 1)..<(n - 3) {
      for c in (b + 1)..<(n - 2) {
        for d in (c + 1)..<(n - 1) {
          for e in (d + 1)..<n {
            let candidate = rank_five([
              cards[a],
              cards[b],
              cards[c],
              cards[d],
              cards[e],
            ])
            if candidate.strength > best.strength {
              best = candidate
            }
          }
        }
      }
    }
  }
  best
}

///|
fn rank_five(cards : Array[Card]) -> Evaluation {
  let counts = Array::make(15, 0)
  let mut flush = true
  for card in cards {
    counts[card.id / 4 + 2] += 1
    if card.id % 4 != cards[0].id % 4 {
      flush = false
    }
  }
  let singles = []
  let pairs = []
  let mut trips = 0
  let mut quads = 0
  let ranks = []
  for i in 0..<13 {
    let r = 14 - i
    if counts[r] > 0 {
      ranks.push(r)
    }
    match counts[r] {
      4 => quads = r
      3 => trips = r
      2 => pairs.push(r)
      1 => singles.push(r)
      _ => ()
    }
  }
  let mut straight = 0
  if ranks.length() == 5 {
    if ranks[0] - ranks[4] == 4 {
      straight = ranks[0]
    } else if ranks == [14, 5, 4, 3, 2] {
      straight = 5
    }
  }
  let (category, number, tie_break) = if flush && straight > 0 {
    (StraightFlush, 8, [straight])
  } else if quads > 0 {
    (FourOfAKind, 7, [quads, singles[0]])
  } else if trips > 0 && pairs.length() == 1 {
    (FullHouse, 6, [trips, pairs[0]])
  } else if flush {
    (Flush, 5, ranks)
  } else if straight > 0 {
    (Straight, 4, [straight])
  } else if trips > 0 {
    (ThreeOfAKind, 3, [trips, singles[0], singles[1]])
  } else if pairs.length() == 2 {
    (TwoPair, 2, [pairs[0], pairs[1], singles[0]])
  } else if pairs.length() == 1 {
    (OnePair, 1, [pairs[0], singles[0], singles[1], singles[2]])
  } else {
    (HighCard, 0, ranks)
  }
  let mut strength = number
  for i in 0..<5 {
    strength = strength * 15 +
      (if i < tie_break.length() { tie_break[i] } else { 0 })
  }
  { category, tie_break, best_five: cards.copy(), strength, }
}
