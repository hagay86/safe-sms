import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { theme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { admin as adminApi } from "../../api/endpoints";
import type { Decision, PendingQueue } from "../../types";
import { ApiError } from "../../api/client";

type TargetKind = "company" | "sender" | "template";

export function AdminQueueScreen() {
  const { token } = useAuth();
  const [queue, setQueue] = useState<PendingQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setQueue(await adminApi.pending(token));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => { void load(); }, [load]);

  async function decide(kind: TargetKind, id: string, decision: Decision) {
    if (!token) return;
    setError(null);
    setActing(`${kind}:${id}:${decision}`);
    try {
      if (kind === "company") await adminApi.decideCompany(token, id, decision);
      else if (kind === "sender") await adminApi.decideSender(token, id, decision);
      else await adminApi.decideTemplate(token, id, decision);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit decision");
    } finally {
      setActing(null);
    }
  }

  const empty =
    queue &&
    queue.companies.length === 0 &&
    queue.senderIds.length === 0 &&
    queue.templates.length === 0;

  return (
    <Screen>
      <Text style={styles.title}>Moderation queue</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && !queue ? <Text style={styles.helper}>Loading…</Text> : null}
      {empty ? (
        <Card><Text style={styles.helper}>Nothing pending. Nice work.</Text></Card>
      ) : null}

      {queue?.companies.length ? (
        <>
          <SectionTitle text={`Companies (${queue.companies.length})`} />
          {queue.companies.map((c) => (
            <Card key={c.id}>
              <Text style={styles.name}>{c.name}</Text>
              {c.legalName ? <Text style={styles.muted}>Legal: {c.legalName}</Text> : null}
              {c.website ? <Text style={styles.muted}>{c.website}</Text> : null}
              {c.description ? <Text style={styles.body}>{c.description}</Text> : null}
              <DecisionRow
                onApprove={() => void decide("company", c.id, "APPROVE")}
                onReject={() => void decide("company", c.id, "REJECT")}
                busy={acting?.startsWith(`company:${c.id}`)}
              />
            </Card>
          ))}
        </>
      ) : null}

      {queue?.senderIds.length ? (
        <>
          <SectionTitle text={`Sender IDs (${queue.senderIds.length})`} />
          {queue.senderIds.map((s) => (
            <Card key={s.id}>
              <Text style={styles.name}>{s.value}</Text>
              <Text style={styles.muted}>
                Company: {s.company.name} ({s.company.status})
              </Text>
              <DecisionRow
                onApprove={() => void decide("sender", s.id, "APPROVE")}
                onReject={() => void decide("sender", s.id, "REJECT")}
                busy={acting?.startsWith(`sender:${s.id}`)}
              />
            </Card>
          ))}
        </>
      ) : null}

      {queue?.templates.length ? (
        <>
          <SectionTitle text={`Templates (${queue.templates.length})`} />
          {queue.templates.map((t) => (
            <Card key={t.id}>
              <Text style={styles.body}>{t.body}</Text>
              <Text style={styles.muted}>
                via {t.senderId.value} ({t.senderId.status}) · {t.company.name}
              </Text>
              {t.placeholders.length ? (
                <Text style={styles.muted}>Variables: {t.placeholders.join(", ")}</Text>
              ) : null}
              <DecisionRow
                onApprove={() => void decide("template", t.id, "APPROVE")}
                onReject={() => void decide("template", t.id, "REJECT")}
                busy={acting?.startsWith(`template:${t.id}`)}
              />
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function DecisionRow({ onApprove, onReject, busy }: { onApprove: () => void; onReject: () => void; busy?: boolean }) {
  return (
    <View style={styles.decisionRow}>
      <Button title="Approve" onPress={onApprove} style={{ flex: 1 }} loading={busy} />
      <Button title="Reject" onPress={onReject} variant="danger" style={{ flex: 1 }} loading={busy} />
    </View>
  );
}

function SectionTitle({ text }: { text: string }) {
  return <Text style={styles.sectionTitle}>{text}</Text>;
}

const styles = StyleSheet.create({
  title: { ...theme.text.title, color: theme.colors.text, marginBottom: theme.space(3) },
  sectionTitle: { ...theme.text.heading, color: theme.colors.text, marginTop: theme.space(3), marginBottom: theme.space(2) },
  name: { ...theme.text.heading, color: theme.colors.text, marginBottom: theme.space(1) },
  body: { color: theme.colors.text, fontSize: 14, marginTop: theme.space(2) },
  muted: { color: theme.colors.textMuted, fontSize: 13, marginTop: theme.space(1) },
  decisionRow: { flexDirection: "row", gap: theme.space(2), marginTop: theme.space(3) },
  helper: { color: theme.colors.textMuted, ...theme.text.body },
  error: { color: theme.colors.danger, marginBottom: theme.space(2) },
});
