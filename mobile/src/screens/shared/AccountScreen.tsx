import React from "react";
import { StyleSheet, Text } from "react-native";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { theme } from "../../theme";
import { useAuth } from "../../context/AuthContext";

export function AccountScreen() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <Screen>
      <Text style={styles.title}>Account</Text>
      <Card>
        <Row label="Name" value={user.displayName ?? "—"} />
        <Row label="Email" value={user.email} />
        <Row label="Role" value={user.role} />
        {user.phone ? <Row label="Phone" value={user.phone} /> : null}
      </Card>
      <Button title="Sign out" variant="secondary" onPress={() => void logout()} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.text.title, color: theme.colors.text, marginBottom: theme.space(3) },
  label: {
    ...theme.text.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.space(1),
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  value: { ...theme.text.body, color: theme.colors.text, marginBottom: theme.space(3) },
});
