import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "../../components/Screen";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { theme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../api/client";
import type { RootStackParamList } from "../../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>SafeSMS</Text>
        <Text style={styles.subtitle}>Only messages from verified senders reach your inbox.</Text>
      </View>

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Sign in" onPress={submit} loading={loading} style={{ marginTop: theme.space(2) }} />
      <Button
        title="Create an account"
        variant="ghost"
        onPress={() => navigation.navigate("Signup")}
        style={{ marginTop: theme.space(2) }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: theme.space(8), marginTop: theme.space(4) },
  title: { ...theme.text.title, color: theme.colors.text, fontSize: 32 },
  subtitle: { ...theme.text.body, color: theme.colors.textMuted, marginTop: theme.space(2) },
  error: { color: theme.colors.danger, marginBottom: theme.space(2) },
});
