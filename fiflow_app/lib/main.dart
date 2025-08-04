import 'package:flutter/material.dart';
import 'package:kakao_flutter_sdk/kakao_flutter_sdk.dart';
import 'pages/main_page.dart';
import 'pages/manage_stocks_page.dart';
import 'pages/login_page.dart';
import 'services/auth_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  KakaoSdk.init(
    nativeAppKey: '17c60462c6fff4b87a4223e3038abf4e',
    javaScriptAppKey: '2e82af882e2d60718781f0c13628a836',
  );
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  bool _showManageStocks = false;
  bool _isLoggedIn = false;

  @override
  void initState() {
    super.initState();
    _checkLoginStatus();
  }

  Future<void> _checkLoginStatus() async {
    final isLoggedIn = await AuthService.isLoggedIn();
    setState(() {
      _isLoggedIn = isLoggedIn;
    });
  }

  void _goToManageStocks() {
    setState(() {
      _showManageStocks = true;
    });
  }

  void _goToMainPage() {
    setState(() {
      _showManageStocks = false;
    });
  }

  void _onLoginSuccess() {
    setState(() {
      _isLoggedIn = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FIFlow',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: _isLoggedIn
          ? (_showManageStocks
              ? ManageStocksPage(onBack: _goToMainPage)
              : MainPage(onManageStocks: _goToManageStocks))
          : LoginPage(onLoginSuccess: _onLoginSuccess),
    );
  }
} 