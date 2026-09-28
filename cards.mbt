///|
/// A validated standard-deck card. Construct with parse_card.
pub struct Card {
  priv id : Int
} derive(Eq, Debug)

///|
/// Parse a two-character ASCII card, e.g. As, Th, 2c (case sensitive).
pub fn parse_card(text : String) -> Result[Card, String] {
  let ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]
  let suits = ["c", "d", "h", "s"]
  for r in 0..<13 {
    for s in 0..<4 {
      if text == ranks[r] + suits[s] {
        return Ok({ id: r * 4 + s, })
      }
    }
  }
  Err("Invalid card: " + text + ". Expected As, Th, 2c, etc.")
}

///|
/// Parse space-separated cards and reject duplicate physical cards.
pub fn parse_cards(text : String) -> Result[Array[Card], String] {
  let cards = []
  for part in text.split(" ") {
    let token = part.to_owned()
    if token == "" {
      continue
    }
    match parse_card(token) {
      Ok(card) => cards.push(card)
      Err(e) => return Err(e)
    }
  }
  match validate_unique(cards) {
    Some(e) => Err(e)
    None => Ok(cards)
  }
}

///|
/// Render a card in the canonical ASCII notation.
pub fn Card::text(self : Card) -> String {
  let ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]
  let suits = ["c", "d", "h", "s"]
  ranks[self.id / 4] + suits[self.id % 4]
}

///|
fn validate_unique(cards : Array[Card]) -> String? {
  let seen = Array::make(52, false)
  for card in cards {
    if seen[card.id] {
      return Some("Duplicate card: " + card.text())
    }
    seen[card.id] = true
  }
  None
}
