import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Login, Register, ConfirmSignUp, ForgotPassword } from '../index';
import type { AuthStackParamList } from "@/types/navigation";
import { Colors } from "@/constants/Colors";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.primary }, // works on web & mobile
      }}
    >
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      <Stack.Screen name="ConfirmSignUp" component={ConfirmSignUp} />
    </Stack.Navigator>
  );
}
