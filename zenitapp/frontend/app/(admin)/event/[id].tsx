import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { StatusBadge } from "@/components/ui/Badge";
import { api } from "@/services/api";
import { colors, radius, spacing, typography } from "@/constants/theme";
import type { EquipmentCondition, EventStatus, User, ZenitEvent } from "@/types";

const STATUS_LABELS: Record<EventStatus, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  en_curso: "En curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const CONDITION_LABELS: Record<EquipmentCondition, string> = {
  bueno: "Buen estado",
  dañado: "Dañado",
  faltante: "Faltante",
  en_mantenimiento: "En mantenimiento",
};

const dateFormat = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  hourCycle: "h23",
});

interface EquipmentEntry {
  id: number;
  service_id: number;
  condition_before: EquipmentCondition | null;
  condition_after: EquipmentCondition | null;
}

export default function AdminEventDetailScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { width } = useWindowDimensions();
  const [loadError, setLoadError] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [statusError, setStatusError] = useState("");
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<ZenitEvent | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [equipment, setEquipment] = useState<EquipmentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [eventData, staff, checklist] = await Promise.all([
        api.get<ZenitEvent>(`/api/events/${id}`),
        isAdmin ? api.get<User[]>("/api/users?role=empleado") : Promise.resolve([]),
        api.get<EquipmentEntry[]>(`/api/events/${id}/equipment`),
      ]);
      setEvent(eventData);
      setEmployees(staff);
      setEquipment(checklist);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function changeStatus(status: EventStatus) {
    setBusy(true);
    setStatusError("");
    try {
      const updated = await api.patch<ZenitEvent>(`/api/events/${id}/status`, { status });
      setEvent(updated);
      setConfirmCancel(false);
    } catch {
      setStatusError("No se pudo actualizar el estado del evento.");
    } finally {
      setBusy(false);
    }
  }

  async function assignEmployee(employeeId: number) {
    setBusy(true);
    try {
      await api.post(`/api/events/${id}/staff`, { employee_id: employeeId });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleAttendance(assignmentId: number, attended: boolean) {
    setBusy(true);
    try {
      await api.patch(`/api/events/${id}/staff/${assignmentId}/attendance`, { attended: !attended });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function checkoutEquipment(serviceId: number) {
    setBusy(true);
    try {
      await api.post(`/api/events/${id}/equipment`, {
        service_id: serviceId,
        condition_before: "bueno",
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function checkinEquipment(checklistId: number, condition: EquipmentCondition) {
    setBusy(true);
    try {
      await api.patch(`/api/events/${id}/equipment/${checklistId}/return`, {
        condition_after: condition,
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading || loadError || !event) {
    return (
      <ScreenContainer>
        <View style={[styles.page, styles.feedback]}>
          {loading ? <ActivityIndicator color={colors.primary} /> : (
            <>
              <Text accessibilityRole="alert" style={styles.meta}>No se pudo cargar el evento.</Text>
              <Button label="Reintentar" variant="outline" onPress={load} />
              <Button label="Volver a Operación" variant="secondary" onPress={() => router.navigate("/(admin)/operations")} />
            </>
          )}
        </View>
      </ScreenContainer>
    );
  }

  const assignedIds = new Set(event.staff_assignments.map((assignment) => assignment.employee_id));
  const availableEmployees = employees.filter((employee) => !assignedIds.has(employee.id));
  const details = [
    { label: "Cliente", value: event.client?.full_name ?? `#${event.client_id}` },
    { label: "Fecha y hora", value: dateFormat.format(new Date(event.event_date)) },
    { label: "Tipo", value: event.event_type },
    { label: "Lugar", value: event.location },
    { label: "Invitados", value: event.guests_count },
  ].filter(({ value }) => value !== null && value !== undefined && value !== "");

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.page}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate("/(admin)/operations")}
            style={styles.back}
          >
            <Ionicons name="arrow-back" size={17} color={colors.primary} />
            <Text style={styles.backText}>Volver a Operación</Text>
          </Pressable>
          <View style={styles.panel}>
            <View style={styles.headerRow}>
              <View style={styles.heading}>
                <Text accessibilityRole="header" style={styles.title}>{event.title}</Text>
                <StatusBadge status={event.status} />
              </View>
              {isAdmin && (
                <Button
                  label="Editar evento"
                  disabled={busy}
                  onPress={() => router.push({ pathname: "/(admin)/event/new", params: { editId: id } })}
                />
              )}
            </View>
            <View style={styles.detailGrid}>
              {details.map(({ label, value }) => (
                <View key={label} style={styles.detail}>
                  <Text style={styles.label}>{label}</Text>
                  <Text style={styles.value}>{value}</Text>
                </View>
              ))}
            </View>
            {event.notes ? (
              <View style={styles.sectionBreak}>
                <Text style={styles.label}>Notas</Text>
                <Text style={styles.value}>{event.notes}</Text>
              </View>
            ) : null}
            {isAdmin && (
              <View style={[styles.sectionBreak, styles.statusSection]}>
                <Text style={styles.label}>Cambiar estado</Text>
                <View style={styles.actions}>
                  {(Object.keys(STATUS_LABELS) as EventStatus[])
                    .filter((status) => status !== "cancelado" || event.status === "cancelado")
                    .map((status) => {
                      const selected = event.status === status;
                      return (
                        <Pressable
                          key={status}
                          accessibilityRole="button"
                          accessibilityState={{ selected, disabled: busy || selected }}
                          disabled={busy || selected}
                          onPress={() => changeStatus(status)}
                          style={[styles.chip, selected && styles.selectedChip]}
                        >
                          <Text style={[styles.chipText, selected && styles.selectedText]}>{STATUS_LABELS[status]}</Text>
                        </Pressable>
                      );
                    })}
                </View>
                {event.status !== "cancelado" && (
                  confirmCancel ? (
                    <View style={styles.cancelBox}>
                      <Text style={styles.value}>¿Querés cancelar este evento? El historial seguirá disponible.</Text>
                      <View style={styles.actions}>
                        <Button label="Confirmar cancelación" variant="danger" loading={busy} onPress={() => changeStatus("cancelado")} />
                        <Button label="Volver" variant="secondary" disabled={busy} onPress={() => setConfirmCancel(false)} />
                      </View>
                    </View>
                  ) : (
                    <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirmCancel(true)} style={styles.cancelAction}>
                      <Text style={styles.dangerText}>Cancelar evento</Text>
                    </Pressable>
                  )
                )}
                {!!statusError && <Text accessibilityRole="alert" style={styles.dangerText}>{statusError}</Text>}
              </View>
            )}
          </View>

          <View style={[styles.sections, width >= 900 && styles.columns]}>
            <View style={[styles.panel, width >= 900 && styles.column]}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Personal asignado</Text>
              {event.staff_assignments.length === 0 && <Text style={styles.meta}>Todavía no hay personal asignado.</Text>}
              {event.staff_assignments.map((assignment) => (
                <View key={assignment.id} style={styles.item}>
                  <View style={styles.itemDetails}>
                    <Text style={styles.value}>{assignment.employee?.full_name ?? `#${assignment.employee_id}`}</Text>
                    <Text style={styles.meta}>{assignment.role_in_event ?? "Sin rol asignado"}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: assignment.attended }}
                    disabled={busy}
                    style={styles.inlineAction}
                    onPress={() => toggleAttendance(assignment.id, assignment.attended)}
                  >
                    <Ionicons
                      name={assignment.attended ? "checkmark-circle" : "ellipse-outline"}
                      size={17}
                      color={assignment.attended ? colors.success : colors.primary}
                    />
                    <Text style={assignment.attended ? styles.successText : styles.backText}>
                      {assignment.attended ? "Asistió" : "Marcar asistencia"}
                    </Text>
                  </Pressable>
                </View>
              ))}
              {isAdmin && availableEmployees.length > 0 && (
                <View style={[styles.sectionBreak, styles.statusSection]}>
                  <Text style={styles.label}>Agregar empleado</Text>
                  <View style={styles.actions}>
                    {availableEmployees.map((employee) => (
                      <Pressable
                        key={employee.id}
                        accessibilityRole="button"
                        disabled={busy}
                        style={[styles.chip, styles.inlineAction]}
                        onPress={() => assignEmployee(employee.id)}
                      >
                        <Ionicons name="add" size={15} color={colors.primary} />
                        <Text style={styles.backText}>{employee.full_name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
            <View style={[styles.panel, width >= 900 && styles.column]}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Control de equipos</Text>
              {event.services.length === 0 && <Text style={styles.meta}>No hay equipos asociados a este evento.</Text>}
              {event.services.map((line) => {
                const entry = equipment.find((check) => check.service_id === line.service_id);
                return (
                  <View key={line.id} style={styles.item}>
                    <View style={styles.itemDetails}>
                      <Text style={styles.value}>{line.service?.name ?? `Servicio #${line.service_id}`}</Text>
                      <Text style={styles.meta}>
                        {entry?.condition_after ? `Devuelto · ${CONDITION_LABELS[entry.condition_after]}`
                          : entry ? "Pendiente de devolución" : "Pendiente de salida"}
                      </Text>
                    </View>
                    {!entry ? (
                      <Pressable accessibilityRole="button" disabled={busy} style={styles.chip} onPress={() => checkoutEquipment(line.service_id)}>
                        <Text style={styles.backText}>Registrar salida</Text>
                      </Pressable>
                    ) : !entry.condition_after && (
                      <View style={styles.returnActions}>
                        <Text style={styles.label}>Registrar devolución</Text>
                        <View style={styles.actions}>
                          {(["bueno", "dañado", "faltante"] as const).map((condition) => (
                            <Pressable
                              key={condition}
                              accessibilityRole="button"
                              disabled={busy}
                              style={styles.chip}
                              onPress={() => checkinEquipment(entry.id, condition)}
                            >
                              <Text style={styles.chipText}>{CONDITION_LABELS[condition]}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingVertical: spacing.lg },
  page: { width: "100%", maxWidth: 1080, alignSelf: "center", gap: spacing.md },
  feedback: { paddingVertical: spacing.xl, alignItems: "flex-start" },
  back: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start", paddingVertical: spacing.xs },
  backText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.sm },
  heading: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", flexShrink: 1, gap: spacing.sm },
  title: { ...typography.h1, color: colors.textPrimary, flexShrink: 1 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  detail: { minWidth: 120, maxWidth: "100%", flexGrow: 1, gap: spacing.xs },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  value: { color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  meta: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  sectionBreak: { borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.md, gap: spacing.xs },
  statusSection: { gap: spacing.sm },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },
  sections: { gap: spacing.md },
  columns: { flexDirection: "row", alignItems: "flex-start" },
  column: { flex: 1 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  selectedChip: { borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  selectedText: { color: colors.primary },
  cancelBox: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  cancelAction: { alignSelf: "flex-start", paddingVertical: spacing.xs },
  dangerText: { color: colors.danger, fontWeight: "600", fontSize: 13 },
  successText: { color: colors.success, fontWeight: "600", fontSize: 13 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  itemDetails: { flexGrow: 1, flexBasis: 140, gap: 2 },
  inlineAction: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  returnActions: { width: "100%", gap: spacing.xs },
});
