import { StyleSheet } from "react-native";
import { Colors, TextStyles, Spacing, BorderRadius, Typography } from "@/constants";

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.primary 
  },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: "center", 
    padding: Spacing.lg 
  },
  slimScrollContent: { 
    flexGrow: 1, 
    justifyContent: "flex-start", 
    padding: 0 
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    minHeight: 40,
    backgroundColor: Colors.primary,
  },
  header: { 
    alignItems: "center" 
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...TextStyles.h1,
    marginBottom: Spacing.base,
    letterSpacing: 1,
  },
  buttonSecondary: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    marginBottom: Spacing.base,
  },
  image: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  form: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  eyeIcon: { 
    padding: Spacing.base 
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.textInputBg,
  },
  inputIcon: { 
    marginLeft: Spacing.base 
  },
  input: {
    flex: 1,
    padding: Spacing.base,
    ...TextStyles.body,
    borderRadius: BorderRadius.md,
  },
  loginContainer: { 
    flexDirection: "row", 
    justifyContent: "center" 
  },
  loginText: { 
    ...TextStyles.body,
    color: Colors.textSecondary,
  },
  loginLink: { 
    ...TextStyles.body,
    color: Colors.secondary,
  },
  infoText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  warningText: {
    ...TextStyles.small,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Spacing.lg,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerTitle: { 
    ...TextStyles.h4,
    fontFamily: Typography.fontFamily.semiBold,
    marginBottom: 0,
  },
});

export default styles;
