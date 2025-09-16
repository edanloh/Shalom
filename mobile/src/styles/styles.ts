import { StyleSheet } from "react-native";
import colors from "./colors";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  slimScrollContent: { flexGrow: 1, justifyContent: "flex-start", padding: 0 },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
    minHeight: 40,
    backgroundColor: colors.background,
  },
  header: { alignItems: "center" },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.headerText,
    marginBottom: 8,
    letterSpacing: 1,
    fontFamily: "Lexend-Regular",
  },
  buttonSecondary: {
    backgroundColor: colors.buttonSecondary,
    borderRadius: 12,
    padding: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  image: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  form: {
    borderRadius: 16,
    padding: 24,
  },
  eyeIcon: { padding: 16 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: colors.buttonSecondary,
  },
  inputIcon: { marginLeft: 16 },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: "white",
    fontFamily: "Lexend-Light",
    borderRadius: 12,
  },
  loginContainer: { flexDirection: "row", justifyContent: "center" },
  loginText: { color: colors.loginText, fontSize: 14 },
  loginLink: { color: colors.loginLink, fontSize: 14, fontWeight: "600" },
  infoText: {
    color: colors.infoText,
    fontSize: 14,
    marginBottom: 16,
    fontFamily: "Lexend-Light",
  },
  warningText: {
    fontSize: 12,
    fontFamily: "Lexend-Light",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "white" },
});

export default styles;
