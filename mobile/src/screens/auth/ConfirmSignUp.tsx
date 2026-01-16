import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { Spacing, TextStyles } from '@/constants';
import ActionButton from '@components/ActionButton';
import styles from '@/styles/styles';

export default function ConfirmSignUp({ navigation }: any) {
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
          <Text style={TextStyles.h3}>Sign Up Successful</Text>
          <Text style={styles.infoText}>
            Please sign in with your email and password
          </Text>
          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <ActionButton
              onPress={() => navigation.navigate('Login')}
              text={'Go to Login'}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
