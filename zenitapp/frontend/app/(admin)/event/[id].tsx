import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { StatusBadge } from "@/components/ui/Badge";
import { api } from "@/services/api";
import { colors, radius, spacing, typography } from "@/constants/theme";
import type { EquipmentCondition, EventStatus, User, ZenitEvent } from "@/types";

const STATUS_FLOW: EventStatus[] = ["pendiente", "confirmado", "en_curso", "finalizado", "cancelado"];

interface EquipmentEntry {
  id: number;
  service_id: number;
  condition_before: EquipmentCondition | null;
  condition_after: EquipmentCondition | null;
}

export default function AdminEventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<ZenitEvent | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [equipment, setEquipment] = useState<EquipmentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eventData, staff, checklist] = await Promise.all([
        api.get<ZenitEvent>(`/api/events/${id}`),
        api.get<User[]>("/api/users?role=empleado"),
        api.get<EquipmentEntry[]>(`/api/events/${id}/equipment`),
      ]);
      setEvent(eventData);
      setEmployees(staff);
      setEquipment(checklist);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function changeStatus(status: EventStatus) {
    setBusy(true);
    try {
      const updated = await api.patch<ZenitEvent>(`/api/events/${id}/status`, { status });
      setEvent(updated);
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

  if (loading || !event) {
    return (
      <ScreenContainer>
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      </ScreenContainer>
    );
  }

  const assignedIds = new Set(event.staff_assignments.map((a) => a.employee_id));

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: true, title: event.title, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.textPrimary }} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{event.title}</Text>
          <StatusBadge status={event.status} />
        </View>
        <Text style={styles.meta}>Cliente: {event.client?.full_name ?? `#${event.client_id}`}</Text>
        <Text style={styles.meta}>{new Date(event.event_date).toLocaleString("es-AR")}</Text>

        <Text style={styles.sectionTitle}>Estado del evento</Text>
        <View style={styles.statusRow}>
          {STATUS_FLOW.map((status) => (
            <Pressable
              key={status}
              disabled={busy}
              onPress={() => changeStatus(status)}
              style={[styles.statusChip, event.status === status && styles.statusChipActive]}
            >
              <Text style={[styles.statusChipText, event.status === status && styles.statusChipTextActive]}>
                {status}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Personal asignado</Text>
        {event.staff_assignments.map((assignment) => (
          <View key={assignment.id} style={styles.staffRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.staffName}>{assignment.employee?.full_name ?? `#${assignment.employee_id}`}</Text>
              <Text style={styles.staffRole}>{assignment.role_in_event ?? "Sin rol asignado"}</Text>
            </View>
            <Pressable
              style={[styles.attendanceBtn, assignment.attended && styles.attendanceBtnActive]}
              onPress={() => toggleAttendance(assignment.id, assignment.attended)}
            >
              <Ionicons
                name={assignment.attended ? "checkmark-circle" : "ellipse-outline"}
                size={16}
                color={assignment.attended ? colors.success : colors.textMuted}
              />
              <Text style={[styles.attendanceText, assignment.attended && { color: colors.success }]}>
                {assignment.attended ? "Asistió" : "Marcar asistencia"}
              </Text>
            </Pressable>
          </View>
        ))}

        <Text style={styles.subTitle}>Agregar empleado</Text>
        <View style={styles.chipsWrap}>
          {employees
            .filter((e) => !assignedIds.has(e.id))
            .map((e) => (
              <Pressable key={e.id} style={styles.addChip} onPress={() => assignEmployee(e.id)}>
                <Ionicons name="add" size={14} color={colors.primary} />
                <Text style={styles.addChipText}>{e.full_name}</Text>
              </Pressable>
            ))}
        </View>

        <Text style={styles.sectionTitle}>Control de equipos</Text>
        {event.services.map((es) => {
          const checklistEntry = equipment.find((c) => c.service_id === es.service_id);
          return (
            <View key={es.id} style={styles.equipmentRow}>
              <Text style={styles.equipmentName}>{es.service?.name ?? `Servicio #${es.service_id}`}</Text>
              {!checklistEntry ? (
                <Pressable style={styles.equipmentBtn} onPress={() => checkoutEquipment(es.service_id)}>
                  <Text style={styles.equipmentBtnText}>Registrar salida</Text>
                </Pressable>
              ) : !checklistEntry.condition_after ? (
                <View style={styles.equipmentActions}>
                  <Pressable
                    style={[styles.equipmentBtn, { backgroundColor: colors.success }]}
                    onPress={() => checkinEquipment(checklistEntry.id, "bueno")}
                  >
                    <Text style={styles.equipmentBtnText}>OK</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.equipmentBtn, { backgroundColor: colors.danger }]}
                    onPress={() => checkinEquipment(checklistEntry.id, "dañado")}
                  >
                    <Text style={styles.equipmentBtnText}>Dañado</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.equipmentBtn, { backgroundColor: colors.warning }]}
                    onPress={() => checkinEquipment(checklistEntry.id, "faltante")}
                  >
                    <Text style={styles.equipmentBtnText}>Faltante</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.equipmentDone}>Retornado: {checklistEntry.condition_after}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: spacing.md },
  title: { ...typography.h1, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  meta: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },
  subTitle: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm, marginBottom: spacing.xs, textTransform: "uppercase" },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  statusChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusChipText: { color: colors.textSecondary, fontSize: 12 },
  statusChipTextActive: { color: colors.white, fontWeight: "700" },
  staffRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  staffName: { color: colors.textPrimary, fontWeight: "600", fontSize: 14 },
  staffRole: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  attendanceBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  attendanceBtnActive: {},
  attendanceText: { color: colors.textMuted, fontSize: 12 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  addChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  addChipText: { color: colors.primary, fontSize: 12 },
  equipmentRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  equipmentName: { color: colors.textPrimary, fontSize: 14, fontWeight: "600", marginBottom: spacing.xs },
  equipmentActions: { flexDirection: "row", gap: spacing.xs },
  equipmentBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    alignSelf: "flex-start",
  },
  equipmentBtnText: { color: colors.white, fontSize: 12, fontWeight: "600" },
  equipmentDone: { color: colors.textMuted, fontSize: 12 },
});
