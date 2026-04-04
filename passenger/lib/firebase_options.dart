import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyBdBb_fkoJXLOgbgPWlmTtnpOCy7_C1QUc',
    appId: '1:93702977270:web:e4a948a20e5f6702baded7',
    messagingSenderId: '93702977270',
    projectId: 'linket-f1dc3',
    authDomain: 'linket-f1dc3.firebaseapp.com',
    storageBucket: 'linket-f1dc3.firebasestorage.app',
    measurementId: 'G-C512NFJQQF',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBdBb_fkoJXLOgbgPWlmTtnpOCy7_C1QUc',
    appId: '1:93702977270:web:e4a948a20e5f6702baded7',
    messagingSenderId: '93702977270',
    projectId: 'linket-f1dc3',
    storageBucket: 'linket-f1dc3.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyBdBb_fkoJXLOgbgPWlmTtnpOCy7_C1QUc',
    appId: '1:93702977270:web:e4a948a20e5f6702baded7',
    messagingSenderId: '93702977270',
    projectId: 'linket-f1dc3',
    storageBucket: 'linket-f1dc3.firebasestorage.app',
    iosBundleId: 'com.example.passenger',
  );
}
