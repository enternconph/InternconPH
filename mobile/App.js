import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Platform
} from 'react-native';
import {
  Home,
  Clock,
  BookOpen,
  FileCheck,
  Award,
  QrCode
} from 'lucide-react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import AccessBlockedScreen from './src/screens/AccessBlockedScreen';
import HomeScreen from './src/screens/HomeScreen';
import DtrScreen from './src/screens/DtrScreen';
import JournalScreen from './src/screens/JournalScreen';
import ClearanceScreen from './src/screens/ClearanceScreen';
import EvaluationScreen from './src/screens/EvaluationScreen';
import AttendanceQrModal from './src/components/AttendanceQrModal';
import { colors } from './src/utils/theme';

function MainNavigator() {
  const { user, loading, isOjtActive } = useAuth();
  const [activeTab, setActiveTab] = useState('Home');
  const [showQrModal, setShowQrModal] = useState(false);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Connecting to InternConPH Network...</Text>
      </View>
    );
  }

  // If not logged in -> Login Screen
  if (!user) {
    return <LoginScreen />;
  }

  // If student is logged in, but their OJT status is not ongoing/active -> Access Blocked Screen
  if (!isOjtActive) {
    return <AccessBlockedScreen />;
  }

  // Active OJT Student -> Main Tab Suite
  const navigationProxy = {
    navigate: (tabName) => setActiveTab(tabName)
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Active Screen View */}
      <View style={styles.screenWrapper}>
        {activeTab === 'Home' && <HomeScreen navigation={navigationProxy} />}
        {activeTab === 'DTR' && <DtrScreen navigation={navigationProxy} />}
        {activeTab === 'Journal' && <JournalScreen navigation={navigationProxy} />}
        {activeTab === 'Clearance' && <ClearanceScreen navigation={navigationProxy} />}
        {activeTab === 'Evaluations' && <EvaluationScreen navigation={navigationProxy} />}
      </View>

      {/* Floating Center QR Attendance Button */}
      <View style={styles.centerQrWrapper} pointerEvents="box-none">
        <TouchableOpacity
          onPress={() => setShowQrModal(true)}
          style={styles.floatingQrBtn}
          activeOpacity={0.85}
        >
          <QrCode size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.bottomBar}>
        {/* Tab 1: Home */}
        <TouchableOpacity
          onPress={() => setActiveTab('Home')}
          style={styles.tabItem}
          activeOpacity={0.7}
        >
          <Home
            size={20}
            color={activeTab === 'Home' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'Home' && styles.tabLabelActive
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        {/* Tab 2: DTR */}
        <TouchableOpacity
          onPress={() => setActiveTab('DTR')}
          style={styles.tabItem}
          activeOpacity={0.7}
        >
          <Clock
            size={20}
            color={activeTab === 'DTR' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'DTR' && styles.tabLabelActive
            ]}
          >
            DTR
          </Text>
        </TouchableOpacity>

        {/* Spacer for center QR button */}
        <View style={styles.tabCenterSpacer}>
          <Text style={styles.centerQrLabel}>SCAN QR</Text>
        </View>

        {/* Tab 3: Journal */}
        <TouchableOpacity
          onPress={() => setActiveTab('Journal')}
          style={styles.tabItem}
          activeOpacity={0.7}
        >
          <BookOpen
            size={20}
            color={activeTab === 'Journal' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'Journal' && styles.tabLabelActive
            ]}
          >
            Journal
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Clearance */}
        <TouchableOpacity
          onPress={() => setActiveTab('Clearance')}
          style={styles.tabItem}
          activeOpacity={0.7}
        >
          <FileCheck
            size={20}
            color={activeTab === 'Clearance' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'Clearance' && styles.tabLabelActive
            ]}
          >
            Clearance
          </Text>
        </TouchableOpacity>
      </View>

      {/* Dynamic Attendance QR Modal */}
      <AttendanceQrModal
        visible={showQrModal}
        onClose={() => setShowQrModal(false)}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background
  },
  screenWrapper: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500'
  },
  bottomBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 70 : 64,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 4
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '800'
  },
  tabCenterSpacer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6
  },
  centerQrLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5
  },
  centerQrWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 34,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99
  },
  floatingQrBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10
  }
});
