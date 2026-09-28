///|
fn cards(text : String) -> Array[@moonholdem.Card] {
  @moonholdem.parse_cards(text).unwrap()
}

///|
fn eval(text : String) -> @moonholdem.Evaluation {
  @moonholdem.evaluate(cards(text)).unwrap()
}

///|
test "all 52 cards round trip and invalid notations fail" {
  let ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]
  let suits = ["c", "d", "h", "s"]
  for r in ranks {
    for s in suits {
      let text = r + s
      assert_eq(@moonholdem.parse_card(text).unwrap().text(), text)
    }
  }
  for text in ["", "10h", "as", "AX", "1c", "Joker"] {
    assert_true(@moonholdem.parse_card(text) is Err(_))
  }
  assert_true(@moonholdem.parse_cards("As As") is Err(_))
  assert_eq(cards(" As  Kh ").length(), 2)
}

///|
test "all nine categories and strict category ordering" {
  let examples = [
    "As Jd 9h 6c 3s", "As Ad 9h 6c 3s", "As Ad 9h 9c 3s", "As Ad Ah 6c 3s", "9s 8d 7h 6c 5s",
    "As Js 9s 6s 3s", "As Ad Ah 6c 6s", "As Ad Ah Ac 3s", "As Ks Qs Js Ts",
  ]
  let categories = [
    @moonholdem.HighCard,
    @moonholdem.OnePair,
    @moonholdem.TwoPair,
    @moonholdem.ThreeOfAKind,
    @moonholdem.Straight,
    @moonholdem.Flush,
    @moonholdem.FullHouse,
    @moonholdem.FourOfAKind,
    @moonholdem.StraightFlush,
  ]
  for i in 0..<examples.length() {
    assert_eq(eval(examples[i]).category, categories[i])
    if i > 0 {
      assert_eq(
        @moonholdem.compare(eval(examples[i]), eval(examples[i - 1])),
        1,
      )
    }
  }
}

///|
test "wheel is five high and ace cannot wrap a straight" {
  assert_eq(eval("As 2d 3h 4c 5s").tie_break, [5])
  assert_eq(
    @moonholdem.compare(eval("As 2d 3h 4c 5s"), eval("2s 3d 4h 5c 6s")),
    -1,
  )
  assert_eq(eval("Qs Kd Ah 2c 3s").category, @moonholdem.HighCard)
  assert_eq(eval("As 2s 3s 4s 5s").category, @moonholdem.StraightFlush)
}

///|
test "tie breakers across all non-straight categories" {
  let stronger = [
    "As Kd 9h 6c 3s", "As Ad Kh 6c 3s", "As Ad Kh Kc 3s", "As Ad Ah Kc 3s", "As Ks 9s 6s 3s",
    "As Ad Ah Kc Ks", "As Ad Ah Ac Ks",
  ]
  let weaker = [
    "As Qd 9h 6c 3s", "As Ad Qh 6c 3s", "As Ad Qh Qc 3s", "As Ad Ah Qc 3s", "As Qs 9s 6s 3s",
    "As Ad Ah Qc Qs", "As Ad Ah Ac Qs",
  ]
  for i in 0..<stronger.length() {
    assert_eq(@moonholdem.compare(eval(stronger[i]), eval(weaker[i])), 1)
    assert_eq(@moonholdem.compare(eval(weaker[i]), eval(stronger[i])), -1)
  }
  assert_eq(
    @moonholdem.compare(eval("As Ad Kh Kc Qs"), eval("Ah Ac Ks Kd Js")),
    1,
  )
  assert_eq(
    @moonholdem.compare(eval("As Ad Kh Qc Js"), eval("Ah Ac Ks Qd Ts")),
    1,
  )
}

///|
test "suits never break ties" {
  assert_eq(
    @moonholdem.compare(eval("As Ks Qs Js Ts"), eval("Ah Kh Qh Jh Th")),
    0,
  )
  assert_eq(
    @moonholdem.compare(eval("As Ad Kh Qc Js"), eval("Ah Ac Ks Qd Jh")),
    0,
  )
}

///|
test "seven cards choose best full house from two trips" {
  let result = eval("As Ad Ah Ks Kd Kh 2c")
  assert_eq(result.category, @moonholdem.FullHouse)
  assert_eq(result.tie_break, [14, 13])
  assert_eq(result.best_five.length(), 5)
  assert_eq(
    @moonholdem.compare(
      @moonholdem.evaluate_five(result.best_five).unwrap(),
      result,
    ),
    0,
  )
}

///|
test "three pairs keep top two and best kicker" {
  assert_eq(eval("As Ad Ks Kd Qs Qd Jh").tie_break, [14, 13, 12])
}

///|
test "six and seven card flush select top five" {
  assert_eq(eval("As Ks 9s 6s 3s 2s").tie_break, [14, 13, 9, 6, 3])
  assert_eq(eval("As Ks 9s 6s 3s 2s Qd").tie_break, [14, 13, 9, 6, 3])
}

///|
test "input length and duplicates are checked by evaluator" {
  assert_true(@moonholdem.evaluate(cards("As Ks")) is Err(_))
  assert_true(@moonholdem.evaluate(cards("As Ks Qs Js Ts 9s 8s 7s")) is Err(_))
  assert_true(@moonholdem.evaluate_five(cards("As Ks Qs Js Ts 9s")) is Err(_))
  let duplicate = cards("As Ks Qs Js")
  duplicate.push(duplicate[0])
  assert_true(@moonholdem.evaluate(duplicate) is Err(_))
  assert_true(@moonholdem.evaluate_five(duplicate) is Err(_))
}

///|
test "permutation invariance over all five-card permutations" {
  let source = cards("As 2d 3h 4c 5s")
  let expected = @moonholdem.evaluate_five(source).unwrap()
  for a in 0..<5 {
    for b in 0..<5 {
      for c in 0..<5 {
        for d in 0..<5 {
          for e in 0..<5 {
            if a == b ||
              a == c ||
              a == d ||
              a == e ||
              b == c ||
              b == d ||
              b == e ||
              c == d ||
              c == e ||
              d == e {
              continue
            }
            let actual = @moonholdem.evaluate_five([
              source[a],
              source[b],
              source[c],
              source[d],
              source[e],
            ]).unwrap()
            assert_eq(@moonholdem.compare(actual, expected), 0)
          }
        }
      }
    }
  }
}

///|
test "showdown can play board and split among three players" {
  let result = @moonholdem.showdown(
    [cards("2c 3c"), cards("4d 5d"), cards("6h 7h")],
    cards("As Ks Qs Js Ts"),
  ).unwrap()
  assert_eq(result.winners, [0, 1, 2])
}

///|
test "showdown finds sole winner and validates shared deck" {
  assert_eq(
    @moonholdem.showdown(
      [cards("As Ad"), cards("Ks Kd")],
      cards("2c 3d 7h 9s Jc"),
    ).unwrap().winners,
    [0],
  )
  assert_true(
    @moonholdem.showdown(
      [cards("As Ad"), cards("As Kd")],
      cards("2c 3d 7h 9s Jc"),
    )
    is Err(_),
  )
  assert_true(
    @moonholdem.showdown([cards("As Ad")], cards("2c 3d 7h 9s Jc")) is Err(_),
  )
  assert_true(
    @moonholdem.showdown([cards("As"), cards("Ks Kd")], cards("2c 3d 7h 9s Jc"))
    is Err(_),
  )
  assert_true(
    @moonholdem.showdown([cards("As Ad"), cards("Ks Kd")], cards("2c 3d 7h"))
    is Err(_),
  )
}

///|
test "river equity distinguishes outright wins from split equity" {
  let tied = @moonholdem.exact_equity(
    cards("2c 3c"),
    cards("4d 5d"),
    cards("As Ks Qs Js Ts"),
  ).unwrap()
  assert_eq(tied.total, 1)
  assert_eq(tied.ties, 1)
  assert_eq(tied.win_probability(), 0.0)
  assert_eq(tied.pot_equity(), 0.5)
  let won = @moonholdem.exact_equity(
    cards("As Ad"),
    cards("Ks Kd"),
    cards("2c 3d 7h 9s Jc"),
  ).unwrap()
  assert_eq(won.wins, 1)
  assert_eq(won.pot_equity(), 1.0)
}

///|
test "turn enumeration has 44 outcomes with exactly two king outs" {
  let result = @moonholdem.exact_equity(
    cards("As Ad"),
    cards("Ks Kd"),
    cards("2c 3d 7h 9s"),
  ).unwrap()
  assert_eq(result.total, 44)
  assert_eq(result.wins, 42)
  assert_eq(result.losses, 2)
  assert_eq(result.ties, 0)
}

///|
test "flop enumeration has 990 outcomes and player swap symmetry" {
  let hero = cards("As Ad")
  let villain = cards("Ks Kd")
  let board = cards("2c 3d 7h")
  let a = @moonholdem.exact_equity(hero, villain, board).unwrap()
  let b = @moonholdem.exact_equity(villain, hero, board).unwrap()
  assert_eq(a.total, 990)
  assert_eq(a.wins + a.losses + a.ties, a.total)
  assert_eq(a.wins, b.losses)
  assert_eq(a.losses, b.wins)
  assert_eq(a.ties, b.ties)
}

///|
test "equity rejects preflop wrong hand size and duplicate cards" {
  assert_true(
    @moonholdem.exact_equity(cards("As Ad"), cards("Ks Kd"), []) is Err(_),
  )
  assert_true(
    @moonholdem.exact_equity(cards("As"), cards("Ks Kd"), cards("2c 3d 7h"))
    is Err(_),
  )
  assert_true(
    @moonholdem.exact_equity(cards("As Ad"), cards("Ks Kd"), cards("As 3d 7h"))
    is Err(_),
  )
}
