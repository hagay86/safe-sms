import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "../../components/Screen";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { theme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { company as companyApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import type { SenderId } from "../../types";
import type { RootStackParamList } from "../../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "NewTemplate">;

export function NewTemplateScreen({ route, navigation }: Props) {
  const { companyId } = route.params;
  const { token } = useAuth();
  const [senders, setSenders] = useState<SenderId[]>([]);
  const [senderIdId, setSenderIdId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const rows = await companyApi.listSenders(token, companyId);
      setSenders(rows);
      if (rows.length && !senderIdId) setSenderIdId(rows[0].id);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [token, companyId, senderIdId]);

  useEffect(() => { void load(); }, [load]);

  async function submit() {
    if (!token || !senderIdId) return;
    setError(null);
    setLoading(true);
    try {
      await companyApi.createTemplate(token, companyId, { senderIdId, body });
      navigation.goBack();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create template");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.helper}>
        Templates use {"{{placeholder}}"} tokens for variable text (e.g. {"{{name}}, {{code}}"}). The shape is approved once; each send fills in the values.
      </Text>

      <Text style={styles.label}>Sender ID</Text>
      <View style={styles.senderRow}>
        {senders.length === 0 ? (
          <Text style={styles.muted}>No sender IDs yet — create one first.</Text>
        ) : (
          senders.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => setSenderIdId(s.id)}
              style={[styles.chip, senderIdId === s.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, senderIdId === s.id && styles.chipTextActive]}>
                {s.value}
              </Text>
            </Pressable>
          ))
        )}
      </View>

      <TextField
        label="Template body"
        value={body}
        onChangeText={setBody}
        multiline
        numberOfLines={6}
        style={{ minHeight: 140, textAlignVertical: "top" }}
        placeholder="Hi {{name}}, your OTP is {{code}}."
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Submit for review" onPress={submit} disabled={!senderIdId || body.trim().length === 0} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  helper: { color: theme.colors.textMuted, ...theme.text.body, marginBottom: theme.space(4) },
  label: { ...theme.text.caption, color: theme.colors.textMuted, marginBottom: theme.space(1), textTransform: "uppercase", letterSpacing: 0.8 },
  senderRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.space(2), marginBottom: theme.space(3) },
  chip: {
    paddingHorizontal: theme.space(3),
    paddingVertical: theme.space(2),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: theme.colors.primaryText },
  muted: { color: theme.colors.textMuted, fontSize: 13 },
  error: { color: theme.colors.danger, marginBottom: theme.space(2) },
});
