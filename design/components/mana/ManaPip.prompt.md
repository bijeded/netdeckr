Mana color pips for showing a deck's color identity — use anywhere a deck, archetype, or card's WUBRG colors appear.

```jsx
<ManaPips colors="UR" size={16} />
<ManaPip color="G" />
```

`ManaPip` is a single dot; `ManaPips` splits a color string ("WUBRG") into a row. Bump `size` to 16 for card headers, keep 13 for inline/list use.
