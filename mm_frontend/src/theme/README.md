# MortgageMate Theme Documentation

## Brand Colors

### Primary Green (from Owl Logo)
- **Main:** `#409540`
- **Light:** `#5AAA5A` (for hover states)
- **Dark:** `#2E6B2E` (for active states)

### Secondary Brown (from Owl Logo)
- **Main:** `#705327`
- **Light:** `#8A6A3F` (for hover states)
- **Dark:** `#573F1C` (for active states)

## Using the Theme

The theme is automatically applied to all Material-UI components throughout the app via the `ThemeProvider` in `App.tsx`.

### Accessing Theme Colors in Components

```tsx
import { useTheme } from '@mui/material/styles';

function MyComponent() {
  const theme = useTheme();

  return (
    <Box sx={{
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText
    }}>
      Green background with white text
    </Box>
  );
}
```

### Using Theme Colors with `sx` Prop

```tsx
<Button
  variant="contained"
  color="primary"  // Uses green
>
  Primary Action
</Button>

<Button
  variant="contained"
  color="secondary"  // Uses brown
>
  Secondary Action
</Button>

<Box sx={{
  bgcolor: 'primary.main',     // #409540
  color: 'primary.contrastText' // #FFFFFF
}}>
  Custom Box
</Box>
```

## Component Customizations

The theme includes custom styling for:

- **Buttons**: Rounded corners, no shadows, subtle hover animations
- **Cards**: Softer shadows, increased border radius
- **TextFields**: Consistent border radius
- **AppBar**: Subtle shadow for depth

## Typography

### Font Choice: Inter

**Inter** is a professional, highly legible font designed specifically for screens. It's widely used by financial services and fintech companies because of its:
- **Clarity**: Excellent readability at all sizes
- **Professionalism**: Clean, modern appearance that conveys trust
- **Versatility**: Works well for both headings and body text
- **Financial Industry Use**: Used by Stripe, GitHub, and many financial platforms

### Font Weights & Letter Spacing

- **Headings (h1-h2)**: Bold weight (700) with tight letter spacing (-0.02em to -0.01em)
- **Headings (h3-h6)**: Semi-bold weight (600) with refined letter spacing
- **Body Text**: Regular weight (400) with subtle letter spacing (0.005em) for readability
- **Buttons**: Medium weight (500), normal case (no uppercase transformation)

The tight letter spacing on headings gives a premium, modern feel appropriate for a professional financial service.

## Shape

- **Border Radius**: 8px for most components, 12px for cards
