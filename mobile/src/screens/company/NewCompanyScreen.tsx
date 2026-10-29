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

type Props = NativeStackScreenProps<RootStackParamList, "NewCompany">;

export function NewCompanyScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      await companyApi.create(token, {
        name: name.trim(),
        legalName: legalName.trim() || undefined,
        website: website.trim() || undefined,
        description: description.trim() || undefined,
      });
      navigation.goBack();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create company");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.helper}>
        Your company goes into a pending state. An admin will review your details before you can submit sender IDs for approval.
      </Text>
      <TextField label="Brand name" value={name} onChangeText={setName} placeholder="Acme Bank" />
      <TextField label="Legal name" value={legalName} onChangeText={setLegalName} placeholder="Acme Banking Corp" />
      <TextField label="Website" value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" placeholder="https://acme.example.com" />
      <TextField label="Description" value={description} onChangeText={setDescription} multiline numberOfLines={4} style={{ minHeight: 100, textAlignVertical: "top" }} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Submit for review" onPress={submit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  helper: { color: theme.colors.textMuted, ...theme.text.body, marginBottom: theme.space(4) },
  error: { color: theme.colors.danger, marginBottom: theme.space(2) },
});
