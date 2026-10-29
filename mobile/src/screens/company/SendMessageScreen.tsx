import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "../../components/Screen";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { theme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { company as companyApi, messages as messagesApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import type { MessageTemplate, SenderId } from "../../types";
import type { RootStackParamList } from "../../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "SendMessage">;

export function SendMessageScreen({ route, navigation }: Props) {
  const { companyId } = route.params;
  const { token } = useAuth();
  const [senders, setSenders] = useState<SenderId[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [senderIdId, setSenderIdId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [recipientPhone, setRecipientPhone] = useState("");
  const [vars, setVars] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const [s, t] = await Promise.all([
      companyApi.listSenders(token, companyId),
      companyApi.listTemplates(token, companyId),
    ]);
    const approvedSenders = s.filter((x) => x.status === "APPROVED");
    const approvedTemplates = t.filter((x) => x.status === "APPROVED");
    setSenders(approvedSenders);
    setTemplates(approvedTemplates);
    if (approvedSenders[0]) setSenderIdId(approvedSenders[0].id);
  }, [token, companyId]);

  useEffect(() => { void load(); }, [load]);

  const templatesForSender = useMemo(
    () => templates.filter((t) => t.senderIdId === senderIdId),
    [templates, senderIdId],
  );

  // Reset the selected template when the sender changes, so UI never shows a
  // template that belongs to a different sender.
  useEffect(() => {
    if (templatesForSender.length && !templatesForSender.find((t) => t.id === templateId)) {
      setTemplateId(templatesForSender[0].id);
    }
  }, [templatesForSender, templateId]);

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null;

  async function submit() {
    if (!token || !senderIdId || !templateId) return;
    setError(null);
    setLoading(true);
    setSuccess(false);
    try {
      await messagesApi.send(token, {
        companyId,
        senderIdId,
        templateId,
        recipientPhone: recipientPhone.trim(),
        variables: vars,
      });
      setSuccess(true);
      setTimeout(() => navigation.goBack(), 800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.helper}>
        Pick an approved sender + template, address a recipient by phone, and fill in any template variables.
      </Text>

      <Text style={styles.label}>Sender</Text>
      <View style={styles.row}>
        {senders.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => setSenderIdId(s.id)}
            style={[styles.chip, senderIdId === s.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, senderIdId === s.id && styles.chipTextActive]}>{s.value}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Template</Text>
      <View style={styles.col}>
        {templatesForSender.length === 0 ? (
          <Text style={styles.muted}>No approved templates for this sender yet.</Text>
        ) : (
          templatesForSender.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTemplateId(t.id)}
              style={[styles.templateRow, templateId === t.id && styles.templateRowActive]}
            >
              <Text style={styles.templateBody}>{t.body}</Text>
            </Pressable>
          ))
        )}
      </View>

      <TextField
        label="Recipient phone"
        value={recipientPhone}
        onChangeText={setRecipientPhone}
        keyboardType="phone-pad"
        placeholder="+15551110001"
      />

      {selectedTemplate?.placeholders.map((p) => (
        <TextField
          key={p}
          label={`Variable: ${p}`}
          value={vars[p] ?? ""}
          onChangeText={(v) => setVars((prev) => ({ ...prev, [p]: v }))}
        />
      ))}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>Sent!</Text> : null}

      <Button title="Send SMS" onPress={submit} loading={loading} disabled={!senderIdId || !templateId || !recipientPhone} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  helper: { color: theme.colors.textMuted, ...theme.text.body, marginBottom: theme.space(4) },
  label: { ...theme.text.caption, color: theme.colors.textMuted, marginBottom: theme.space(1), textTransform: "uppercase", letterSpacing: 0.8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: theme.space(2), marginBottom: theme.space(3) },
  col: { gap: theme.space(2), marginBottom: theme.space(3) },
  chip: { paddingHorizontal: theme.space(3), paddingVertical: theme.space(2), borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: theme.colors.primaryText },
  templateRow: { padding: theme.space(3), borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  templateRowActive: { borderColor: theme.colors.primary },
  templateBody: { color: theme.colors.text, fontSize: 14 },
  muted: { color: theme.colors.textMuted, fontSize: 13 },
  error: { color: theme.colors.danger, marginBottom: theme.space(2) },
  success: { color: theme.colors.success, marginBottom: theme.space(2) },
});
