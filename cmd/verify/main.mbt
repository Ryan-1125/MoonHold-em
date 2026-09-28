///|
/// Exhaustive independent category-frequency check of all C(52,5) hands.
fn main {
  let deck = []
  for rank in ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"] {
    for suit in ["c", "d", "h", "s"] {
      deck.push(@holdem.parse_card(rank + suit).unwrap())
    }
  }
  let counts = Array::make(9, 0)
  for a in 0..<48 {
    for b in (a + 1)..<49 {
      for c in (b + 1)..<50 {
        for d in (c + 1)..<51 {
          for e in (d + 1)..<52 {
            let hand = @holdem.evaluate_five([
              deck[a],
              deck[b],
              deck[c],
              deck[d],
              deck[e],
            ]).unwrap()
            let category = match hand.category {
              HighCard => 0
              OnePair => 1
              TwoPair => 2
              ThreeOfAKind => 3
              Straight => 4
              Flush => 5
              FullHouse => 6
              FourOfAKind => 7
              StraightFlush => 8
            }
            counts[category] += 1
          }
        }
      }
    }
  }
  let expected = [1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 40]
  if counts != expected {
    abort("Five-card category frequencies do not match")
  }
  println("Verified all 2,598,960 five-card hands: category frequencies match.")
}
