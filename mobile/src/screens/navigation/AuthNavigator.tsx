import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../auth/Login";
import RegisterScreen from "../auth/Register";
import ForgotPasswordScreen from "../auth/ForgotPassword";
import ConfirmSignUpScreen from "../auth/ConfirmSignUp";
import SMSLoginScreen from "../auth/SMSLogin";
import SMSRegisterScreen from "../auth/SMSRegister";
import type { AuthStackParamList } from "@/types/navigation";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#fff" }, // works on web & mobile
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ConfirmSignUp" component={ConfirmSignUpScreen} />
      <Stack.Screen name="SMSLogin" component={SMSLoginScreen} />
      <Stack.Screen name="SMSRegister" component={SMSRegisterScreen} />
    </Stack.Navigator>
  );
}
