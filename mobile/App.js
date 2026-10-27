import React, { useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useKeepAwake } from 'expo-keep-awake';
import * as NavigationBar from 'expo-navigation-bar';
import { SettingsProvider, useSettings } from './src/config';
import HomeScreen from './src/screens/HomeScreen';
import TicketScreen from './src/screens/TicketScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

function Totem() {
  const { serverUrl } = useSettings();

  // Totem: tela sempre ligada e sem as barras do sistema (deslizar da borda mostra de novo)
  useKeepAwake();
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setVisibilityAsync('hidden').catch(() => {});
    NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
  }, []);

  return (
    <NavigationContainer>
      <StatusBar hidden />
      {/* Sem servidor configurado (primeira abertura), começa pelos ajustes */}
      <Stack.Navigator
        initialRouteName={serverUrl ? 'Home' : 'Settings'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Ticket" component={TicketScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <Totem />
    </SettingsProvider>
  );
}
