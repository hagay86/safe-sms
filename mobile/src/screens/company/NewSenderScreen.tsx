import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "../../components/Screen";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { theme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { company as companyApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import type { RootStackParamList } from "../../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "NewSender">;

export function NewSenderScreen({ route, navigation }: Props) {
  const { companyId } = route.params;
  const { token } = useAuth();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      await companyApi.createSender(token, companyId, value.trim());
      navigation.goBack();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create sender ID");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.helper}>
        The sender ID is the brand name or short code consumers will see. It must be globally unique and will be reviewed before use.
      </Text>
      <TextField
        label="Sender ID"
        value={value}
        onChangeText={setValue}
        autoCapitalize="characters"
        placeholder="ACMEBANK"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Submit for review" onPress={submit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  helper: { color: theme.colors.textMuted, ...theme.text.body, marginBottom: theme.space(4) },
  error: { color: theme.colors.danger, marginBottom: theme.space(2) },
});
