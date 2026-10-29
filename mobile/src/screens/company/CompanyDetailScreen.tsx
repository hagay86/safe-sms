import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { StatusBadge } from "../../components/StatusBadge";
import { theme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { company as companyApi } from "../../api/endpoints";
import type { Company, MessageTemplate, SenderId } from "../../types";
import type { RootStackParamList } from "../../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "CompanyDetail">;

export function CompanyDetailScreen({ route, navigation }: Props) {
  const { companyId } = route.params;
  const { token } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [senders, setSenders] = useState<SenderId[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [cos, s, t] = await Promise.all([
        companyApi.list(token),
        companyApi.listSenders(token, companyId),
        companyApi.listTemplates(token, companyId),
      ]);
      setCompany(cos.find((c) => c.id === companyId) ?? null);
      setSenders(s);
      setTemplates(t);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, companyId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const canSend =
    company?.status === "APPROVED" &&
    senders.some((s) => s.status === "APPROVED") &&
    templates.some((t) => t.status === "APPROVED");

  return (
    <Screen>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && !company ? <Text style={styles.helper}>Loading…</Text> : null}

      {company ? (
        <>
          <Card>
            <View style={styles.row}>
              <Text style={styles.title}>{company.name}</Text>
              <StatusBadge status={company.status} />
            </View>
            {company.description ? <Text style={styles.muted}>{company.description}</Text> : null}
            {company.reviewNote ? <Text style={styles.note}>Reviewer note: {company.reviewNote}</Text> : null}
          </Card>

          <SectionHeader
            title="Sender IDs"
            onAdd={() => navigation.navigate("NewSender", { companyId })}
          />
          {senders.length === 0 ? (
            <Card><Text style={styles.helper}>No sender IDs yet.</Text></Card>
          ) : (
            senders.map((s) => (
              <Card key={s.id}>
                <View style={styles.row}>
                  <Text style={styles.value}>{s.value}</Text>
                  <StatusBadge status={s.status} />
                </View>
                {s.reviewNote ? <Text style={styles.note}>{s.reviewNote}</Text> : null}
              </Card>
            ))
          )}

          <SectionHeader
            title="Message templates"
            onAdd={() => navigation.navigate("NewTemplate", { companyId })}
          />
          {templates.length === 0 ? (
            <Card><Text style={styles.helper}>No templates yet.</Text></Card>
          ) : (
            templates.map((t) => (
              <Card key={t.id}>
                <View style={styles.row}>
                  <Text style={styles.value} numberOfLines={2}>{t.body}</Text>
                  <StatusBadge status={t.status} />
                </View>
                {t.senderId ? <Text style={styles.muted}>via {t.senderId.value}</Text> : null}
                {t.placeholders.length > 0 ? (
                  <Text style={styles.muted}>Variables: {t.placeholders.join(", ")}</Text>
                ) : null}
                {t.reviewNote ? <Text style={styles.note}>{t.reviewNote}</Text> : null}
              </Card>
            ))
          )}

          <Button
            title="Send an approved SMS"
            onPress={() => navigation.navigate("SendMessage", { companyId })}
            disabled={!canSend}
            style={{ marginTop: theme.space(4) }}
          />
          {!canSend ? (
            <Text style={styles.helperCenter}>
              You can send once the company, a sender ID, and at least one template are all APPROVED.
            </Text>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Button title="+ Add" onPress={onAdd} variant="secondary" style={{ height: 36, paddingHorizontal: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: theme.space(2) },
  title: { ...theme.text.title, color: theme.colors.text, flex: 1 },
  value: { ...theme.text.heading, color: theme.colors.text, flex: 1 },
  muted: { color: theme.colors.textMuted, fontSize: 13, marginTop: theme.space(1) },
  note: { color: theme.colors.warning, fontSize: 12, marginTop: theme.space(2), fontStyle: "italic" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: theme.space(4), marginBottom: theme.space(2) },
  sectionTitle: { ...theme.text.heading, color: theme.colors.text },
  helper: { color: theme.colors.textMuted, ...theme.text.body },
  helperCenter: { color: theme.colors.textMuted, fontSize: 12, marginTop: theme.space(2), textAlign: "center" },
  error: { color: theme.colors.danger, marginBottom: theme.space(2) },
});
