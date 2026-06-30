/**
 * AnkiGen Pro - Android App
 * A WebView wrapper around the AnkiGen web frontend
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  BackHandler,
  Alert,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.100.225:5173';

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [canGoBack]);

  const handleError = () => {
    setError('Could not connect to server. Make sure the backend is running.');
    setLoading(false);
  };

  const reload = () => {
    setError(null);
    setLoading(true);
    webViewRef.current?.reload();
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />
        <Text style={styles.errorIcon}>📱</Text>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorUrl}>{API_BASE_URL}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={reload}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#06b6d4" />
          <Text style={styles.loadingText}>Loading AnkiGen...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ uri: API_BASE_URL }}
        style={styles.webview}
        onError={handleError}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => {
          setLoading(false);
          // Inject viewport fix after load completes
          webViewRef.current?.injectJavaScript(`
            (function() {
              const existing = document.querySelectorAll('meta[name="viewport"]');
              existing.forEach(el => el.remove());
              const meta = document.createElement('meta');
              meta.name = 'viewport';
              meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
              document.head.appendChild(meta);
            })();
            true;
          `);
        }}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        bounces={false}
        scrollEnabled
        cacheEnabled
        cacheMode="LOAD_DEFAULT"
        thirdPartyCookiesEnabled
        scalesPageToFit={false}
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        userAgent="AnkiGenPro-Android-Mobile"
      />
    </View>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0f',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 16,
    color: '#ffffff',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#0a0a0f',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#888899',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorUrl: {
    fontSize: 12,
    color: '#06b6d4',
    marginTop: 12,
    fontFamily: 'monospace',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#06b6d4',
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
