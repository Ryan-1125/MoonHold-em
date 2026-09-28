///|
/// Chinese explanation and decisive cards for an already evaluated comparison.
/// With incomplete boards this describes current strength, not eventual odds.
pub struct ComparisonExplanation {
  reason : String
  left_decisive : Array[Card]
  right_decisive : Array[Card]
}

///|
fn rank_label(rank : Int) -> String {
  match rank {
    14 => "A"
    13 => "K"
    12 => "Q"
    11 => "J"
    _ => rank.to_string()
  }
}

///|
fn category_label(category : Category) -> String {
  match category {
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
}

///|
fn comparison_part(category : Category, index : Int) -> String {
  match category {
    OnePair =>
      if index == 0 {
        "对子"
      } else {
        "其余牌中的第\{index}张"
      }
    TwoPair =>
      match index {
        0 => "较大对子"
        1 => "较小对子"
        _ => "其余牌"
      }
    ThreeOfAKind | FourOfAKind =>
      if index == 0 {
        category_label(category)
      } else {
        "其余牌中的第\{index}张"
      }
    FullHouse => if index == 0 { "三条" } else { "对子" }
    Straight | StraightFlush => "顺子的最高牌"
    Flush | HighCard => "第\{index + 1}大牌"
  }
}

///|
fn category_cards(hand : Evaluation) -> Array[Card] {
  let n = match hand.category {
    OnePair | ThreeOfAKind | FourOfAKind => 1
    TwoPair => 2
    _ => hand.tie_break.length()
  }
  match hand.category {
    Straight | StraightFlush => hand.best_five.copy()
    _ =>
      hand.best_five.filter(fn(c) {
        let rank = c.id / 4 + 2
        for i in 0..<n {
          if rank == hand.tie_break[i] {
            return true
          }
        }
        false
      })
  }
}

///|
/// Explain the first decisive comparison. Equal hands have no decisive cards.
pub fn explain_comparison(
  left : Evaluation,
  right : Evaluation,
) -> ComparisonExplanation {
  let comparison = compare(left, right)
  if comparison == 0 {
    return {
      reason: "双方都是\{category_label(left.category)}，最佳五张的比较点数完全相同。花色不分大小，因此牌力相同。",
      left_decisive: [],
      right_decisive: [],
    }
  }
  if left.category != right.category {
    let winner = if comparison > 0 { "玩家一" } else { "玩家二" }
    let stronger = if comparison > 0 { left.category } else { right.category }
    let weaker = if comparison > 0 { right.category } else { left.category }
    return {
      reason: "玩家一是\{category_label(left.category)}，玩家二是\{category_label(right.category)}。\{category_label(stronger)}大于\{category_label(weaker)}，所以\{winner}牌力更强。",
      left_decisive: category_cards(left),
      right_decisive: category_cards(right),
    }
  }
  let mut index = 0
  while left.tie_break[index] == right.tie_break[index] {
    index += 1
  }
  let l = left.tie_break[index]
  let r = right.tie_break[index]
  let part = comparison_part(left.category, index)
  let prefix = if index == 0 {
    ""
  } else {
    "前面的比较项相同，再比较\{part}。"
  }
  let winner = if comparison > 0 { "玩家一" } else { "玩家二" }
  let high = rank_label(if comparison > 0 { l } else { r })
  let low = rank_label(if comparison > 0 { r } else { l })
  let wheel = if (left.category == Straight || left.category == StraightFlush) &&
    (l == 5 || r == 5) {
    "A2345 按 5 高顺子计算，A 在这里不按最大点数比较。"
  } else {
    ""
  }
  {
    reason: "双方都是\{category_label(left.category)}。\{prefix}玩家一的\{part}是\{rank_label(l)}，玩家二是\{rank_label(r)}；\{high}大于\{low}，所以\{winner}牌力更强。\{wheel}",
    left_decisive: left.best_five.filter(fn(c) { c.id / 4 + 2 == l }),
    right_decisive: right.best_five.filter(fn(c) { c.id / 4 + 2 == r }),
  }
}
