import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ClientForm } from "@/components/ui/ClientForm";
import { Button } from "@/components/ui/Button";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TextField } from "@/components/ui/TextField";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/services/api";
import type { Service, User, ZenitEvent } from "@/types";

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const maxQuantity = 2_147_483_647;

function parseLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(year) ||
    date.getMonth() + 1 !== Number(month) ||
    date.getDate() !== Number(day) ||
    date.getHours() !== Number(hour) ||
    date.getMinutes() !== Number(minute)
  ) return null;
  return date;
}

function formatLocalDate(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function NewEventScreen() {
  const { user } = useAuth();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const [addingClient, setAddingClient] = useState(false);
  const [original, setOriginal] = useState<ZenitEvent | null>(null);
  const [clients, setClients] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [client, setClient] = useState<User | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [eventType, setEventType] = useState("");
  const [location, setLocation] = useState("");
  const [guests, setGuests] = useState("");
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [clientData, serviceData, event] = await Promise.all([
        api.get<User[]>("/api/users?role=cliente"),
        api.get<Service[]>("/api/services"),
        editId ? api.get<ZenitEvent>(`/api/events/${editId}`) : Promise.resolve(null),
      ]);
      setClients(clientData.filter((item) => item.is_active));
      setOriginal(event);
      const catalog = new Map(serviceData.map((service) => [service.id, service]));
      const eventQuantities: Record<number, string> = {};
      for (const line of event?.services ?? []) {
        if (line.service && !catalog.has(line.service_id)) {
          catalog.set(line.service_id, line.service);
        }
        eventQuantities[line.service_id] = String(
          Number(eventQuantities[line.service_id] ?? 0) + line.quantity
        );
      }
      setServices([...catalog.values()]);
      setClient(event?.client ?? null);
      setClientSearch("");
      setTitle(event?.title ?? "");
      setDate(event ? formatLocalDate(event.event_date) : "");
      setEventType(event?.event_type ?? "");
      setLocation(event?.location ?? "");
      setGuests(event?.guests_count?.toString() ?? "");
      setNotes(event?.notes ?? "");
      setQuantities(eventQuantities);
      setFeedback("");
      setAddingClient(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [editId]);

  useFocusEffect(useCallback(() => {
    if (user?.role === "admin") void load();
  }, [load, user?.role]));

  const query = clientSearch.trim().toLowerCase();
  const matchingClients = clients
    .filter((item) => `${item.full_name} ${item.email}`.toLowerCase().includes(query))
    .slice(0, 8);
  function unitPrice(service: Service) {
    const lines = original?.services.filter((line) => line.service_id === service.id);
    const quantity = lines?.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
    return lines && quantity
      ? lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0) / quantity
      : service.unit_price;
  }

  const selected = services
    .filter((service) => (quantities[service.id] ?? "") !== "")
    .map((service) => ({
      service_id: service.id,
      quantity: Number(quantities[service.id]),
      unitPrice: unitPrice(service),
    }));
  const total = selected.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  async function submit() {
    if (submitting.current) return;
    if ((!editId && !client) || !title.trim()) {
      setFeedback("Elegí un cliente e ingresá el nombre del evento.");
      return;
    }
    const eventDate = parseLocalDate(date);
    if (!eventDate) {
      setFeedback("Ingresá una fecha y hora válidas con el formato AAAA-MM-DD HH:mm.");
      return;
    }
    if (guests && (Number(guests) < 1 || Number(guests) > maxQuantity)) {
      setFeedback("Ingresá una cantidad válida de invitados.");
      return;
    }
    if (selected.length === 0 || selected.some(({ quantity }) => quantity < 1 || quantity > maxQuantity)) {
      setFeedback("Ingresá una cantidad válida para cada insumo que quieras agregar.");
      return;
    }

    submitting.current = true;
    setSaving(true);
    setFeedback("");
    try {
      const payload = {
        title: title.trim(),
        event_date: original && formatLocalDate(original.event_date) === date.trim()
          ? original.event_date
          : eventDate.toISOString(),
        event_type: eventType.trim() || null,
        location: location.trim() || null,
        guests_count: guests ? Number(guests) : null,
        notes: notes.trim() || null,
        items: selected.map(({ service_id, quantity }) => ({ service_id, quantity })),
      };
      const event = editId
        ? await api.put<ZenitEvent>(`/api/events/${editId}`, payload)
        : await api.post<ZenitEvent>("/api/events", { ...payload, client_id: client?.id });
      router.replace(`/(admin)/event/${event.id}`);
    } catch (error) {
      setFeedback(error instanceof ApiError && error.status === 400
        ? error.message
        : "No se pudo crear el evento.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  if (user?.role !== "admin") return <Redirect href="/(admin)/operations" />;

  return (
    <ScreenContainer>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Button label={editId ? "Volver al evento" : "Volver a Operación"} variant="outline" disabled={saving} onPress={() => editId
          ? router.navigate(`/(admin)/event/${editId}`)
          : router.navigate("/(admin)/operations")} />
        <Text style={styles.title}>{editId ? "Editar evento" : "Nuevo evento"}</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : loadError ? (
          <>
            <Text style={styles.text}>No se pudieron cargar los clientes y el catálogo.</Text>
            <Button label="Reintentar" onPress={load} />
          </>
        ) : (
          <>
            <TextField label="Nombre del evento" value={title} onChangeText={setTitle} maxLength={200} />
            <TextField label="Fecha y hora local" placeholder="AAAA-MM-DD HH:mm" value={date} onChangeText={setDate} />
            <TextField label="Tipo de evento (opcional)" value={eventType} onChangeText={setEventType} maxLength={100} />
            <TextField label="Lugar (opcional)" value={location} onChangeText={setLocation} maxLength={300} />
            <TextField label="Invitados (opcional)" keyboardType="number-pad" value={guests} onChangeText={(value) => setGuests(value.replace(/\D/g, ""))} maxLength={10} />
            <TextField label="Notas (opcional)" value={notes} onChangeText={setNotes} multiline />
            <Text style={styles.section}>Cliente</Text>
            {editId ? (
              <Text style={styles.text}>{client?.full_name ?? `Cliente #${original?.client_id}`}</Text>
            ) : addingClient ? (
              <ClientForm
                onCreated={(created) => {
                  setClients((current) => [...current, created]);
                  setClient(created);
                  setAddingClient(false);
                }}
                onCancel={() => setAddingClient(false)}
              />
            ) : client ? (
              <Pressable accessibilityRole="button" style={styles.row} onPress={() => setClient(null)}>
                <Text style={styles.text}>{client.full_name} · Cambiar cliente</Text>
              </Pressable>
            ) : (
              <>
                <Button label="Nuevo cliente" variant="outline" onPress={() => setAddingClient(true)} />
                <TextField label="Buscar por nombre o correo" value={clientSearch} onChangeText={setClientSearch} autoCapitalize="none" />
                {matchingClients.map((item) => (
                  <Pressable key={item.id} accessibilityRole="button" style={styles.row} onPress={() => setClient(item)}>
                    <Text style={styles.text}>{item.full_name}</Text>
                    <Text style={styles.meta}>{item.email}</Text>
                  </Pressable>
                ))}
                {matchingClients.length === 0 && <Text style={styles.meta}>No hay clientes activos que coincidan.</Text>}
              </>
            )}
            <Text style={styles.section}>Insumos del catálogo</Text>
            {services.length > 0 ? (
              <>
                <Text style={styles.meta}>Ingresá la cantidad de cada insumo que quieras incluir.</Text>
                <Button
                  label="Agregar todos"
                  variant="outline"
                  disabled={saving}
                  onPress={() => setQuantities((current) => Object.fromEntries(
                    services.map((service) => [service.id, current[service.id] || (service.is_active ? "1" : "")])
                  ))}
                />
                {services.map((service) => (
                  <View key={service.id} style={[styles.row, styles.service]}>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.text}>{service.name}{service.is_active ? "" : " (inactivo)"}</Text>
                      <Text style={styles.meta}>{money.format(unitPrice(service))} · {service.price_unit.replace(/_/g, " ")}</Text>
                    </View>
                    <TextField
                      label="Cantidad"
                      accessibilityLabel={`Cantidad de ${service.name}`}
                      keyboardType="number-pad"
                      value={quantities[service.id] ?? ""}
                      onChangeText={(value) => setQuantities((current) => ({
                        ...current,
                        [service.id]: value.replace(/\D/g, ""),
                      }))}
                      maxLength={10}
                      style={styles.quantity}
                    />
                  </View>
                ))}
              </>
            ) : <Text style={styles.meta}>No hay insumos activos en el catálogo.</Text>}
            <Text style={styles.section}>Total estimado {money.format(total)}</Text>
            {!!feedback && <Text accessibilityRole="alert" style={styles.error}>{feedback}</Text>}
            <Button
              label={editId ? "Guardar cambios" : "Crear evento"}
              onPress={submit}
              loading={saving}
              disabled={addingClient || (!editId && !client) || !services.length}
            />
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: spacing.md, gap: spacing.xs },
  title: { ...typography.h1, color: colors.textPrimary, marginVertical: spacing.md },
  section: { ...typography.h3, color: colors.textPrimary, marginVertical: spacing.sm },
  text: { ...typography.body, color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginBottom: spacing.xs },
  row: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm },
  service: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  serviceInfo: { flex: 1 },
  quantity: { minWidth: 88 },
  error: { color: colors.danger, marginBottom: spacing.sm },
});
