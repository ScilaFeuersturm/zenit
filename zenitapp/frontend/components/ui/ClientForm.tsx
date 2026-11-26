import React, { useRef, useState } from "react";
import { Text } from "react-native";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { colors } from "@/constants/theme";
import { api, ApiError } from "@/services/api";
import type { User } from "@/types";

export function ClientForm({ onCreated, onCancel }: {
  onCreated: (client: User) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  async function save() {
    if (submitting.current) return;
    if (!name.trim() || !email.trim() || password.length < 8) {
      setError("Completá el nombre, el correo y una contraseña de al menos 8 caracteres.");
      return;
    }
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      const client = await api.post<User>("/api/users/clients", {
        full_name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        password,
      });
      onCreated(client);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400
        ? err.message
        : err instanceof ApiError && err.status === 422
          ? "Revisá el correo y la longitud de los datos ingresados."
          : "No se pudo dar de alta al cliente.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <>
      <TextField label="Nombre completo" value={name} onChangeText={setName} maxLength={255} />
      <TextField label="Correo" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextField label="Teléfono (opcional)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} maxLength={30} />
      <TextField label="Contraseña inicial (mínimo 8 caracteres)" secureTextEntry value={password} onChangeText={setPassword} />
      {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
      <Button label="Guardar cliente" onPress={save} loading={saving} />
      <Button label="Volver" variant="outline" onPress={onCancel} disabled={saving} />
    </>
  );
}
