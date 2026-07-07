import { Tabs } from 'expo-router'
import { StyleSheet, View, Text, Platform } from 'react-native'
import { colors, spacing, radius, typography } from '@/lib/theme'

function TabIcon({
  emoji, label, focused, badge,
}: {
  emoji: string; label: string; focused: boolean; badge?: number
}) {
  return (
    <View style={tabStyles.item}>
      <View>
        <Text style={[tabStyles.emoji, focused && tabStyles.emojiFocused]}>{emoji}</Text>
        {badge !== undefined && badge > 0 && (
          <View style={tabStyles.badge}>
            <Text style={tabStyles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[tabStyles.label, focused && tabStyles.labelFocused]}>{label}</Text>
    </View>
  )
}

export default function StudentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown:     false,
        tabBarStyle:     tabStyles.bar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Accueil" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="libretto"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📋" label="Libretto" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="exams"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📝" label="Examens" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🗓️" label="Planning" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="fees"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="💶" label="Frais" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Profil" focused={focused} />
          ),
        }}
      />
      {/* Screens accessibles mais sans onglet visible */}
      <Tabs.Screen
        name="notifications"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="thesis"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="internships"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="alumni"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="courses"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="course-detail"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="certificates"
        options={{ href: null }}
      />
    </Tabs>
  )
}

const tabStyles = StyleSheet.create({
  bar: {
    backgroundColor: colors.card,
    borderTopWidth:  1,
    borderTopColor:  colors.borderLight,
    height:          Platform.OS === 'ios' ? 82 : 68,
    paddingBottom:   Platform.OS === 'ios' ? 24 : 10,
    paddingTop:      spacing.sm,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: -2 },
    shadowOpacity:   0.06,
    shadowRadius:    8,
    elevation:       8,
  },
  item: {
    alignItems: 'center',
    gap:        2,
  },
  emoji:        { fontSize: 20, opacity: 0.45 },
  emojiFocused: { opacity: 1 },
  label:        { ...typography.xs, color: colors.textMuted },
  labelFocused: { color: colors.primary, fontWeight: '700' },

  badge: {
    position:        'absolute',
    top:             -4,
    right:           -8,
    backgroundColor: colors.error,
    borderRadius:    radius.full,
    minWidth:        16,
    height:          16,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
})
