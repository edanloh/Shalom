import { useEffect, useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import CustomTextInput from '@components/CustomTextInput';
import ActionButton from '@components/ActionButton';
import { useAuth } from '@contexts/AuthContext';
import styles from '@/styles/styles';
import { Colors, Spacing, TextStyles } from '@/constants';
import { validatePassword } from '@/utils/authUtils';

export default function ResetPasswordScreen({ navigation }: any) {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [warningText, setWarningText] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordWarning, setPasswordWarning] = useState('');
  const { resetPassword, logout } = useAuth();

  const handleConfirmReset = async () => {
    if (!newPassword) {
      setWarningText('Please enter the new password');
      return;
    }
    setLoading(true);
    const response = await resetPassword(newPassword);
    setLoading(false);
    if (response.success) {
      setSuccess(true);
      setWarningText('');
      logout();
    } else {
      setWarningText(response.error || 'Failed to reset password');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { justifyContent: 'center', padding: Spacing.lg },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image source={require('@assets/shalom.png')} style={styles.logo} />
          </View>
          <Text style={[TextStyles.h2]}>Shalom</Text>
        </View>
        <View style={styles.form}>
          <Text style={TextStyles.h3}>
            {success ? 'Password Reset Successful': 'Enter New Password'}
          </Text>
          <Text style={styles.infoText}>
            {success ? 'You can now sign in with your new password.' : 'Enter your new password.'}
          </Text>
          {warningText ? (
            <Text style={{ color: Colors.textWarning, marginBottom: 8 }}>
              {warningText}
            </Text>
          ) : null}
          {!success ? (
            <>
              {/* Password */}
              <CustomTextInput
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  setPasswordWarning(text ? validatePassword(text) : "");
                }}
                placeholder="New Password"
                secureTextEntry={true}
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
                eyeIconStyle={styles.eyeIcon}
                warningText={newPassword ? passwordWarning : ""}
                returnKeyType="go"
                onSubmitEditing={handleConfirmReset}
              />
              <ActionButton
                onPress={handleConfirmReset}
                disabled={loading}
                loading={loading}
                text={loading ? "Resetting..." : "Confirm Reset"}
              />
            </>
          ) : (
            <View style={{ marginTop: 16 }}>
              <ActionButton
                onPress={() => navigation.navigate("Login")}
                text="Go to Login"
              />
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
