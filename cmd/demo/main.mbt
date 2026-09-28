///|
fn show_hand(hand : @holdem.Evaluation) -> Unit {
  println("Category: " + @debug.to_string(hand.category))
  let names = hand.best_five.map(fn(card) { card.text() })
  println("Best five: " + names.join(" "))
  println("Tie-break ranks: " + @debug.to_string(hand.tie_break))
}

///|
fn main {
  let cards = @holdem.parse_cards("As Ad Ah Ks Kd Kh 2c").unwrap()
  let best = @holdem.evaluate(cards).unwrap()
  println("MoonHoldem: best five out of seven")
  show_hand(best)
  let hero = @holdem.parse_cards("As Ad").unwrap()
  let villain = @holdem.parse_cards("Ks Kd").unwrap()
  let board = @holdem.parse_cards("2c 3d 7h 9s Jc").unwrap()
  let result = @holdem.showdown([hero, villain], board).unwrap()
  println("Showdown: As Ad vs Ks Kd, board 2c 3d 7h 9s Jc")
  println("Winners (zero-based): " + @debug.to_string(result.winners))
  for i in 0..<result.evaluations.length() {
    println("Player \{i}:")
    show_hand(result.evaluations[i])
  }
  let turn = @holdem.parse_cards("2c 3d 7h 9s").unwrap()
  let equity = @holdem.exact_equity(hero, villain, turn).unwrap()
  println("Turn equity: AA vs KK, board 2c 3d 7h 9s")
  println(
    "\{equity.wins} wins, \{equity.losses} losses, \{equity.ties} ties, \{equity.total} possible rivers",
  )
  println("Win probability: \{equity.win_probability()}")
  println("Pot equity: \{equity.pot_equity()}")
}
