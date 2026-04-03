import { Tabs } from 'expo-router';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TEAL = '#2C5F7B';
const GOLD = '#D4A574';
const GRAY = '#AAAAAA';

function LogoHeader() {
  return (
    <View style={styles.logoContainer}>
      <Image
        source={require('../../assets/logo-header.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: TEAL, height: 120 },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        tabBarActiveTintColor: TEAL,
        tabBarInactiveTintColor: GRAY,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E0DDD6',
          borderTopWidth: 0.5,
          paddingBottom: 20,
          paddingTop: 10,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: () => <LogoHeader />,
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: 'Record',
          headerTitle: 'Record',
          tabBarIcon: ({ color, size }) => <Ionicons name="radio-button-on" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: 'Family',
          headerTitle: 'Family Tree',
          tabBarIcon: ({ color, size }) => <Ionicons name="git-network-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tapestry"
        options={{
          title: 'Tapestry',
          headerTitle: 'The Tapestry',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault',
          headerTitle: 'Time Vault',
          tabBarIcon: ({ color, size }) => <Ionicons name="lock-closed-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    height: 44,
    width: 220,
  },
});