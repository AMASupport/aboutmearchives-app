import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { login } from '../utils/api';
import { saveAuth } from '../utils/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password');
      return;
    }

    setLoading(true);
    const result = await login(email.trim().toLowerCase(), password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    await saveAuth(result.data.token, result.data.user);
    router.replace('/(tabs)');
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <Image
          source={require('../assets/logo-header.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>Every Life. Every Story.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor="#999"
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} activeOpacity={0.7} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Don't have an account?{' '}
          <Text style={styles.footerLink}>Visit aboutmearchives.com</Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2C5F7B' },
  inner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  logo: { width: 240, height: 60, marginBottom: 8 },
  tagline: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontStyle: 'italic', marginBottom: 40 },
  form: { width: '100%' },
  label: { color: '#FFF', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#2D3436',
    marginBottom: 16,
  },
  error: { color: '#FAEEDA', fontSize: 13, textAlign: 'center', marginBottom: 12, backgroundColor: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 6 },
  loginBtn: { backgroundColor: '#D4A574', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 4 },
  loginBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  footer: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 32, textAlign: 'center' },
  footerLink: { color: '#D4A574', fontWeight: '600' },
});