export { Colors, type ColorKeys } from "./Colors";
export {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  TextStyles,
  ContainerStyles,
} from "./GlobalStyles";

// App constants
import { ADMIN_EMAIL as ENV_ADMIN_EMAIL } from "react-native-dotenv";
export const ADMIN_EMAIL = ENV_ADMIN_EMAIL;
