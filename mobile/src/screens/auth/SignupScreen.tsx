import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "../../components/Screen";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { theme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../api/client";
import type { Role } from "../../types";
import type { RootStackParamList } from "../../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

export function SignupScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("CONSUMER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        role,
        displayName: displayName.trim() || undefined,
        phone: role === "CONSUMER" ? phone.trim() || undefined : undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>
        Consumers get a verified inbox. Companies can register sender IDs and templates for approval.
      </Text>

      <View style={styles.roleRow}>
        {(["CONSUMER", "COMPANY"] as Role[]).map((r) => (
          <Pressable
            key={r}
            onPress={() => setRole(r)}
            style={[styles.roleChip, role === r && styles.roleChipActive]}
          >
            <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
              {r === "CONSUMER" ? "Consumer" : "Company"}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextField
        label="Display name"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="How should we call you?"
      />
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
        placeholder="Minimum 8 characters"
      />
      {role === "CONSUMER" && (
        <TextField
          label="Phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+15551110001"
          helper="Your phone is the address verified SMS will be delivered to."
        />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Create account" onPress={submit} loading={loading} style={{ marginTop: theme.space(2) }} />
      <Button title="I already have an account" variant="ghost" onPress={() => navigation.navigate("Login")} style={{ marginTop: theme.space(2) }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.text.title, color: theme.colors.text, fontSize: 28 },
  subtitle: { ...theme.text.body, color: theme.colors.textMuted, marginTop: theme.space(2), marginBottom: theme.space(4) },
  roleRow: { flexDirection: "row", gap: theme.space(2), marginBottom: theme.space(4) },
  roleChip: {
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(3),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flex: 1,
    alignItems: "center",
  },
  roleChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  roleText: { color: theme.colors.textMuted, fontWeight: "600" },
  roleTextActive: { color: theme.colors.primaryText },
  error: { color: theme.colors.danger, marginBottom: theme.space(2) },
});
