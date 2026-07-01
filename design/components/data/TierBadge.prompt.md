Tier chip for archetypes. Thresholds: ≥10% T1, ≥5% T2, ≥1% T3, else Otros.

```jsx
<TierBadge pct={14.2} />   {/* → T1 */}
<TierBadge tier="T2" />
```

Use `tierFor(pct)` if you just need the label string.
