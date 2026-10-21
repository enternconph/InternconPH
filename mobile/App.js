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
      <StatusBar barStyle="light-content" backgroundColor="#193631" />

      {/* Ambient Glow Background Blobs */}
      <View style={styles.ambientGlowContainer} pointerEvents="none">
        <View style={styles.glowBlobTeal} />
        <View style={styles.glowBlobAmber} />
      </View>

      {/* Active Screen View */}
      <View style={styles.screenWrapper}>
        {activeTab === 'Home' && <HomeScreen navigation={navigationProxy} />}
        {activeTab === 'DTR' && <DtrScreen navigation={navigationProxy} />}
        {activeTab === 'Journal' && <JournalScreen navigation={navigationProxy} />}
        {activeTab === 'Clearance' && <ClearanceScreen navigation={navigationProxy} />}
        {activeTab === 'Evaluations' && <EvaluationScreen navigation={navigationProxy} />}
      </View>

      {/* Floating Pill Bottom Navigation Bar */}
      <View style={styles.bottomNavContainer} pointerEvents="box-none">
        <View style={styles.floatingNavPill}>
          {/* Tab 1: Home */}
          <TouchableOpacity
            onPress={() => setActiveTab('Home')}
            style={[styles.tabItem, activeTab === 'Home' && styles.tabItemActive]}
            activeOpacity={0.7}
          >
            <Home
              size={19}
              color={activeTab === 'Home' ? colors.primaryTextOn : colors.textMuted}
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
            style={[styles.tabItem, activeTab === 'DTR' && styles.tabItemActive]}
            activeOpacity={0.7}
          >
            <Clock
              size={19}
              color={activeTab === 'DTR' ? colors.primaryTextOn : colors.textMuted}
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

          {/* Floating Center QR Scan Button */}
          <TouchableOpacity
            onPress={() => setShowQrModal(true)}
            style={styles.floatingQrBtn}
            activeOpacity={0.85}
          >
            <View style={styles.qrInnerIcon}>
              <QrCode size={22} color="#193631" />
            </View>
            <Text style={styles.centerQrLabel}>PUNCH</Text>
          </TouchableOpacity>

          {/* Tab 3: Journal */}
          <TouchableOpacity
            onPress={() => setActiveTab('Journal')}
            style={[styles.tabItem, activeTab === 'Journal' && styles.tabItemActive]}
            activeOpacity={0.7}
          >
            <BookOpen
              size={19}
              color={activeTab === 'Journal' ? colors.primaryTextOn : colors.textMuted}
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
            style={[styles.tabItem, activeTab === 'Clearance' && styles.tabItemActive]}
            activeOpacity={0.7}
          >
            <FileCheck
              size={19}
              color={activeTab === 'Clearance' ? colors.primaryTextOn : colors.textMuted}
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
    backgroundColor: '#193631'
  },
  ambientGlowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden'
  },
  glowBlobTeal: {
    position: 'absolute',
    top: -60,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(38, 166, 154, 0.22)'
  },
  glowBlobAmber: {
    position: 'absolute',
    bottom: 120,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 180, 51, 0.12)'
  },
  screenWrapper: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#193631',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14
  },
  loadingText: {
    fontSize: 13,
    color: '#80CBC4',
    fontWeight: '600'
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 16 : 10,
    left: 12,
    right: 12,
    alignItems: 'center',
    zIndex: 90
  },
  floatingNavPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 420,
    height: 64,
    backgroundColor: 'rgba(18, 40, 36, 0.94)',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 24,
    marginHorizontal: 2
  },
  tabItemActive: {
    backgroundColor: '#FFB433'
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2
  },
  tabLabelActive: {
    color: '#193631',
    fontWeight: '800'
  },
  floatingQrBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    marginTop: -16
  },
  qrInnerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFB433',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#193631',
    shadowColor: '#FFB433',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8
  },
  centerQrLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFB433',
    letterSpacing: 0.5,
    marginTop: 2
  }
});
