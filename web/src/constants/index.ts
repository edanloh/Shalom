export { Colors } from "./Colors";
export {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Transitions,
  StatusStyles,
  ButtonStyles,
  CardStyles,
} from "./GlobalStyles";

// App constants - for web, we'll use environment variables
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "admin@shalom.edu";
