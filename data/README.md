# Mordheimer weapons and armour data

Extracted on 2026-09-09 from:

- https://mordheimer.net/docs/weapons-armour/close-combat
- https://mordheimer.net/docs/weapons-armour/missile
- https://mordheimer.net/docs/weapons-armour/blackpowder
- https://mordheimer.net/docs/weapons-armour/armour

Each JSON file is an array of objects with `name`, `cost`, `availability`, `range`, `strength`, `specialRules`, `type`, and `save`. `null` means the source does not state a non-cost field or the field does not apply. As required by the numeric `cost` schema, `cost: 0` means the source does not state a cost. Special rules retain the source's displayed rule names; when the source gives an unlabeled rule, the complete displayed rule text is retained.

## Source ambiguities and numeric cost normalization

The numeric schema cannot encode dice additions, price multipliers, free-first-item qualifications, or alternate brace prices. For costs such as `10 + 1D6 gc`, `cost` contains the fixed base (10); for brace alternatives it contains the single-weapon price. The source lists Dagger as `1st free/2 gc`, represented by its purchase price of 2. Gromril Weapon, Ithilmar Weapon, and Obsidian Weapon are listed at `4 x Price`, `3 x Price`, and `4 x Price`; their numeric values represent those multipliers rather than gold crowns. Pair pricing remains the listed pair total.

Bec de Corbin, Fist, Firepots Miragliano, and Masterwork Heavy Armour have no displayed cost and therefore use the documented numeric sentinel `0`. Ball Shot, Chain Shot, and Grape Shot are included as separate entries because the Blackpowder page gives each a named cost/range/strength block under Swivel Gun; the source gives them no separate availability.
