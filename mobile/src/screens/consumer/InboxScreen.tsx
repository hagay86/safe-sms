import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { theme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { messages as messagesApi } from "../../api/endpoints";
import type { InboxMessage } from "../../types";
import { ApiError } from "../../api/client";

export function InboxScreen() {
  const { token } = useAuth();
  const [rows, setRows] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await messagesApi.inbox(token);
      setRows(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load inbox");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const verifiedCount = rows.filter((r) => r.verified).length;
  const blockedCount = rows.length - verifiedCount;

  return (
    <Screen
      contentStyle={{ paddingTop: theme.space(4) }}
      scroll
    >
      <ScrollHeader
        verifiedCount={verifiedCount}
        blockedCount={blockedCount}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && rows.length === 0 ? <Text style={styles.helper}>Loading…</Text> : null}
      {!loading && rows.length === 0 ? (
        <Text style={styles.helper}>No messages yet. Verified SMS from approved senders will show up here.</Text>
      ) : null}

      <View style={styles.list}>
        {rows.map((r) => (
          <MessageCard key={r.id} msg={r} />
        ))}
      </View>

      <Button
        title={loading ? "Refreshing…" : "Refresh inbox"}
        variant="secondary"
        onPress={() => void load()}
        loading={loading && rows.length > 0}
        style={{ marginTop: theme.space(4) }}
      />
    </Screen>
  );
}

function ScrollHeader({ verifiedCount, blockedCount }: { verifiedCount: number; blockedCount: number }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Inbox</Text>
      <View style={styles.countsRow}>
        <CountPill label="Verified" count={verifiedCount} color={theme.colors.success} />
        <CountPill label="Blocked" count={blockedCount} color={theme.colors.danger} />
      </View>
    </View>
  );
}

function CountPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.pillCount, { color }]}>{count}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

function MessageCard({ msg }: { msg: InboxMessage }) {
  const verified = msg.verified;
  return (
    <Card style={verified ? styles.verifiedCard : styles.blockedCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.sender}>{msg.claimedSender}</Text>
          <Text style={styles.company}>
            {verified ? msg.companyName ?? "Verified sender" : "Unverified sender"}
          </Text>
        </View>
        <View
          style={[
            styles.tag,
            { backgroundColor: verified ? "#0f3020" : "#3a1414" },
          ]}
        >
          <Text style={{ color: verified ? theme.colors.success : theme.colors.danger, fontWeight: "700" }}>
            {verified ? "VERIFIED" : "BLOCKED"}
          </Text>
        </View>
      </View>
      <Text style={styles.body}>{msg.body}</Text>
      {!verified ? (
        <Text style={styles.warning}>
          This sender is not registered with SafeSMS. Do not click links or share personal info.
        </Text>
      ) : null}
      <Text style={styles.timestamp}>{new Date(msg.createdAt).toLocaleString()}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: theme.space(4) },
  title: { ...theme.text.title, color: theme.colors.text, fontSize: 28 },
  countsRow: { flexDirection: "row", gap: theme.space(2), marginTop: theme.space(3) },
  pill: {
    paddingHorizontal: theme.space(3),
    paddingVertical: theme.space(2),
    borderRadius: theme.radius.md,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 80,
  },
  pillCount: { fontSize: 20, fontWeight: "700" },
  pillLabel: { color: theme.colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8 },
  list: {},
  verifiedCard: { borderColor: "#1b3b29" },
  blockedCard: { borderColor: "#4a1b1b" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: theme.space(2) },
  sender: { color: theme.colors.text, fontSize: 16, fontWeight: "700" },
  company: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  body: { color: theme.colors.text, fontSize: 15, lineHeight: 22 },
  warning: { color: theme.colors.danger, fontSize: 12, marginTop: theme.space(2), fontStyle: "italic" },
  timestamp: { color: theme.colors.textMuted, fontSize: 11, marginTop: theme.space(2) },
  helper: { color: theme.colors.textMuted, ...theme.text.body },
  error: { color: theme.colors.danger, marginBottom: theme.space(2) },
});
