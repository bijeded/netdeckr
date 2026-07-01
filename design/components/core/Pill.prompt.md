Rounded toggle chip for mutually-exclusive switches — the format selector (Standard/Pioneer/Modern…) in the topbar.

```jsx
<Pill active>Standard</Pill>
<Pill onClick={...}>Pioneer</Pill>
```

Render in a horizontal `display:flex; gap:8px` row. Exactly one `active` at a time.
