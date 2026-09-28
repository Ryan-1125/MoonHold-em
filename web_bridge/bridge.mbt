///|
struct HandView {
  category : String
  best : Array[String]
  ranks : Array[Int]
} derive(ToJson)

///|
fn view(cards : Array[@holdem.Card]) -> HandView {
  let result = @holdem.evaluate(cards).unwrap()
  let category = match result.category {
    HighCard => "高牌"
    OnePair => "一对"
    TwoPair => "两对"
    ThreeOfAKind => "三条"
    Straight => "顺子"
    Flush => "同花"
    FullHouse => "葫芦"
    FourOfAKind => "四条"
    StraightFlush => "同花顺"
  }
  {
    category,
    best: result.best_five.map(fn(c) { c.text() }),
    ranks: result.tie_break,
  }
}

///|
fn error_json(message : String) -> String {
  let value : Json = { "error": message.to_json() }
  value.stringify()
}

///|
/// JSON boundary for the browser; all evaluation stays in MoonBit.
pub fn analyze(
  hero_text : String,
  villain_text : String,
  board_text : String,
) -> String {
  let hero = match @holdem.parse_cards(hero_text) {
    Ok(v) => v
    Err(_) =>
      return error_json("玩家一的牌面格式不正确或有重复牌。")
  }
  let villain = match @holdem.parse_cards(villain_text) {
    Ok(v) => v
    Err(_) =>
      return error_json("玩家二的牌面格式不正确或有重复牌。")
  }
  let board = match @holdem.parse_cards(board_text) {
    Ok(v) => v
    Err(_) => return error_json("公共牌格式不正确或有重复牌。")
  }
  if hero.length() != 2 || villain.length() != 2 {
    return error_json("请为每位玩家选择两张底牌。")
  }
  if board.length() < 3 || board.length() > 5 {
    return error_json("请选择三至五张公共牌。")
  }
  let equity = match @holdem.exact_equity(hero, villain, board) {
    Ok(v) => v
    Err(_) =>
      return error_json(
        "同一张牌不能出现在多个位置，请检查底牌与公共牌。",
      )
  }
  let h = board.copy()
  let v = board.copy()
  for c in hero {
    h.push(c)
  }
  for c in villain {
    v.push(c)
  }
  let value : Json = {
    "hero": view(h).to_json(),
    "villain": view(v).to_json(),
    "comparison": @holdem.compare(
      @holdem.evaluate(h).unwrap(),
      @holdem.evaluate(v).unwrap(),
    ).to_json(),
    "wins": equity.wins.to_json(),
    "losses": equity.losses.to_json(),
    "ties": equity.ties.to_json(),
    "total": equity.total.to_json(),
    "equity": equity.pot_equity().to_json(),
  }
  value.stringify()
}

///|
pub extend HandView with ToJson::{to_json}
