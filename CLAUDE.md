# icarepro — Claude Instructions

## Logo Usage Rules

- **Dark background** (`#1A1A2E` or similar dark):
  - `"icare"` = `#C9A84C` (gold)
  - `"pro"` = `#FFFFFF` (white)
- **Light background** (`#F5F0E8`, `#FFFFFF` or similar light):
  - `"icare"` = `#C9A84C` (gold)
  - `"pro"` = `#1A1A2E` (dark navy)
- Always **lowercase**, **bold**, **no space** between the two words
- Never use uppercase; never split with different font weights

### JSX patterns

Dark background:
```tsx
<span className="font-extrabold">
  <span className="text-gold">icare</span>
  <span className="text-white">pro</span>
</span>
```

Light background:
```tsx
<span className="font-extrabold">
  <span className="text-gold">icare</span>
  <span style={{ color: '#1A1A2E' }}>pro</span>
</span>
```

Inline-style variant (Landing.tsx / portal components):
```tsx
<span style={{ fontWeight: 800 }}>
  <span style={{ color: '#C9A84C' }}>icare</span>
  <span style={{ color: '#FFFFFF' }}>pro</span>  {/* or '#1A1A2E' on light */}
</span>
```
