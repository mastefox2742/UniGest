import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { colors, spacing, radius, shadow, typography } from '@/lib/theme'

// ─── Types ────────────────────────────────────────────────────────────────────

type Notif = {
  id:         string
  type:       'info' | 'warning' | 'success' | 'error'
  title:      string
  message:    string
  is_read:    boolean
  created_at: string
}

const TYPE_CFG: Record<Notif['type'], { icon: string; bg: string; border: string; text: string }> = {
  info:    { icon: 'ℹ️',  bg: colors.infoBg,    border: colors.info,    text: colors.infoDark },
  warning: { icon: '⚠️',  bg: colors.warningBg, border: colors.warning, text: colors.warningDark },
  success: { icon: '✅',  bg: colors.successBg, border: colors.success, text: colors.successDark },
  error:   { icon: '🔴',  bg: colors.errorBg,   border: colors.error,   text: colors.errorDark },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (m < 1)  return 'À l\'instant'
  if (m < 60) return `Il y a ${m} min`
  if (h < 24) return `Il y a ${h}h`
  if (d < 7)  return `Il y a ${d}j`
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const [notifs, setNotifs]       = useState<Notif[]>([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter]       = useState<'all' | 'unread'>('all')

  async function loadNotifications() {
    try {
      const data = await apiFetch<Notif[]>('/api/notifications?limit=50')
      setNotifs(data ?? [])
    } catch (err) {
      console.error('[Notifications]', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function markAsRead(id: string) {
    await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' })

    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function markAllRead() {
    await apiFetch('/api/notifications/read-all', { method: 'POST' })

    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  useEffect(() => { loadNotifications() }, [])

  const unreadCount = notifs.filter(n => !n.is_read).length
  const displayed   = filter === 'unread' ? notifs.filter(n => !n.is_read) : notifs

  const renderItem = ({ item }: { item: Notif }) => {
    const cfg = TYPE_CFG[item.type] ?? TYPE_CFG.info

    return (
      <TouchableOpacity
        style={[
          styles.card,
          !item.is_read && styles.cardUnread,
          !item.is_read && { borderLeftColor: cfg.border },
        ]}
        onPress={() => !item.is_read && markAsRead(item.id)}
        activeOpacity={item.is_read ? 1 : 0.7}
      >
        <View style={styles.cardRow}>
          <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
            <Text style={styles.iconText}>{cfg.icon}</Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardTop}>
              <Text style={styles.notifTitle} numberOfLines={2}>{item.title}</Text>
              {!item.is_read && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.notifMessage} numberOfLines={3}>{item.message}</Text>
            <Text style={styles.notifTime}>{timeAgo(item.created_at)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>🔔 Notifications</Text>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead} activeOpacity={0.7}>
              <Text style={styles.markAllText}>Tout lire</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filtre */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              Toutes ({notifs.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'unread' && styles.filterBtnActive]}
            onPress={() => setFilter('unread')}
          >
            <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
              Non lues {unreadCount > 0 ? `(${unreadCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadNotifications() }}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={styles.emptyTitle}>Tout est lu !</Text>
              <Text style={styles.emptySubtitle}>Aucune notification en attente.</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingTop:        56,
    paddingHorizontal: spacing.xl,
    paddingBottom:     spacing.md,
    backgroundColor:   colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    marginBottom:    spacing.md,
  },
  title:       { ...typography['2xl'], fontWeight: '800', color: colors.text },
  markAllBtn:  { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.primaryLight },
  markAllText: { ...typography.sm, color: colors.primary, fontWeight: '600' },

  filterRow: {
    flexDirection:   'row',
    backgroundColor: colors.background,
    borderRadius:    radius.md,
    padding:         3,
    gap:             3,
  },
  filterBtn: {
    flex:            1,
    paddingVertical: spacing.sm,
    alignItems:      'center',
    borderRadius:    radius.sm,
  },
  filterBtnActive: {
    backgroundColor: colors.card,
    ...shadow.sm,
  },
  filterText:       { ...typography.sm, color: colors.textSecond },
  filterTextActive: { fontWeight: '700', color: colors.text },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: spacing.sm },
  emptyEmoji:    { fontSize: 48 },
  emptyTitle:    { ...typography.lg, fontWeight: '700', color: colors.text },
  emptySubtitle: { ...typography.base, color: colors.textMuted },

  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 32 },

  card: {
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    ...shadow.sm,
  },
  cardUnread: {
    borderLeftWidth: 4,
  },

  cardRow:    { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  iconBox:    { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconText:   { fontSize: 20 },
  cardContent: { flex: 1, gap: 3 },

  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  notifTitle:   { ...typography.base, fontWeight: '700', color: colors.text, flex: 1 },
  unreadDot:    { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.primary, marginTop: 4, flexShrink: 0 },
  notifMessage: { ...typography.sm, color: colors.textSecond, lineHeight: 18 },
  notifTime:    { ...typography.xs, color: colors.textMuted, marginTop: 2 },
})
