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
  let explanation = @holdem.explain_comparison(
    @holdem.evaluate(h).unwrap(),
    @holdem.evaluate(v).unwrap(),
  )
  let value : Json = {
    "reason": explanation.reason.to_json(),
    "hero_decisive": explanation.left_decisive.map(fn(c) { c.text() }).to_json(),
    "villain_decisive": explanation.right_decisive
    .map(fn(c) { c.text() })
    .to_json(),
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

///|
/// Pipe-separated two-card hands, e.g. "As Ad|Ks Kd|Qs Qd".
pub fn analyze_table(hands_text : String, board_text : String) -> String {
  let hands = []
  for text in hands_text.split("|") {
    match @holdem.parse_cards(text.to_owned()) {
      Ok(h) => hands.push(h)
      Err(_) => return error_json("底牌格式不正确或有重复牌。")
    }
  }
  if hands.length() < 2 || hands.length() > 9 {
    return error_json("请选择 2 至 9 位玩家。")
  }
  for hand in hands {
    if hand.length() != 2 {
      return error_json("请为每位玩家选择两张底牌。")
    }
  }
  let board = match @holdem.parse_cards(board_text) {
    Ok(v) => v
    Err(_) => return error_json("公共牌格式不正确或有重复牌。")
  }
  if board.length() < 3 || board.length() > 5 {
    return error_json("请选择三至五张公共牌。")
  }
  let equity = match @holdem.exact_table_equity(hands, board) {
    Ok(v) => v
    Err(_) => return error_json("同一张牌不能出现在多个位置。")
  }
  let evaluations = []
  let views = []
  let leaders = []
  for i in 0..<hands.length() {
    let cards = board.copy()
    for c in hands[i] {
      cards.push(c)
    }
    let evaluation = @holdem.evaluate(cards).unwrap()
    evaluations.push(evaluation)
    views.push(view(cards))
    if leaders.is_empty() ||
      @holdem.compare(evaluation, evaluations[leaders[0]]) > 0 {
      leaders.clear()
      leaders.push(i)
    } else if @holdem.compare(evaluation, evaluations[leaders[0]]) == 0 {
      leaders.push(i)
    }
  }
  let players : Array[Json] = []
  for i in 0..<hands.length() {
    // Compare a leader to its strongest opponent, others to the first leader.
    let mut reference = leaders[0]
    if i == reference {
      reference = if i == 0 { 1 } else { 0 }
      for j in 0..<hands.length() {
        if j != i && @holdem.compare(evaluations[j], evaluations[reference]) > 0 {
          reference = j
        }
      }
    }
    let explanation = @holdem.explain_comparison(
      evaluations[i],
      evaluations[reference],
    )
    players.push({
      "hand": views[i].to_json(),
      "reference": reference.to_json(),
      "reason": explanation.reason.to_json(),
      "decisive": explanation.left_decisive.map(fn(c) { c.text() }).to_json(),
      "wins": equity.players[i].wins.to_json(),
      "ties": equity.players[i].ties.to_json(),
      "losses": equity.players[i].losses.to_json(),
      "equity": equity.players[i].equity.to_json(),
    })
  }
  let value : Json = {
    "players": players.to_json(),
    "leaders": leaders.to_json(),
    "total": equity.total.to_json(),
  }
  value.stringify()
}
