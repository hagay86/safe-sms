import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { StatusBadge } from "../../components/StatusBadge";
import { theme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { company as companyApi } from "../../api/endpoints";
import type { Company } from "../../types";
import type { RootStackParamList } from "../../navigation/RootNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function CompanyHomeScreen() {
  const { token } = useAuth();
  const nav = useNavigation<Nav>();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setCompanies(await companyApi.list(token));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Reload whenever the tab regains focus so newly-created resources appear.
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => { void load(); }, [load]);

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Your companies</Text>
        <Button title="+ New" onPress={() => nav.navigate("NewCompany")} style={{ height: 36 }} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && companies.length === 0 ? <Text style={styles.helper}>Loading…</Text> : null}
      {!loading && companies.length === 0 ? (
        <Card>
          <Text style={styles.helper}>You haven't registered a company yet. Tap "+ New" to submit one for review.</Text>
        </Card>
      ) : null}

      {companies.map((c) => (
        <Pressable key={c.id} onPress={() => nav.navigate("CompanyDetail", { companyId: c.id })}>
          <Card>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{c.name}</Text>
              <StatusBadge status={c.status} />
            </View>
            {c.website ? <Text style={styles.muted}>{c.website}</Text> : null}
            <Text style={styles.meta}>
              {(c._count?.senderIds ?? 0)} sender IDs · {(c._count?.templates ?? 0)} templates
            </Text>
            {c.reviewNote ? <Text style={styles.note}>Reviewer note: {c.reviewNote}</Text> : null}
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: theme.space(3) },
  title: { ...theme.text.title, color: theme.colors.text },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: theme.space(1) },
  name: { ...theme.text.heading, color: theme.colors.text },
  muted: { color: theme.colors.textMuted, fontSize: 13 },
  meta: { color: theme.colors.textMuted, fontSize: 13, marginTop: theme.space(1) },
  note: { color: theme.colors.warning, fontSize: 12, marginTop: theme.space(2), fontStyle: "italic" },
  helper: { color: theme.colors.textMuted, ...theme.text.body },
  error: { color: theme.colors.danger, marginBottom: theme.space(2) },
});
