The signature MetaStack card — one metagame archetype with art header, tier chip, share %, delta, and share bar. Lay them out in a `repeat(auto-fill,minmax(248px,1fr))` grid.

```jsx
<ArchetypeCard rank={1} name="Izzet Cauldron" colors="UR" pct={14.2} delta={2.1} hue={265} maxPct={14.2} onClick={expand} />
```

Set `maxPct` to the leader's share so bars are comparable. `selected` adds the violet ring for the expanded state. Art header is a placeholder gradient — swap for real card art when available.
