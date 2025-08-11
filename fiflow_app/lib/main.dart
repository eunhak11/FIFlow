// fiflow_app/lib/main.dart
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:kakao_flutter_sdk/kakao_flutter_sdk.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:http/http.dart' as http; // http 임포트 추가
import 'pages/main_page.dart';
import 'pages/manage_stocks_page.dart';
import 'pages/login_page.dart';
import 'services/auth_service.dart';
import 'widgets/splash_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // 환경변수 로드
  await dotenv.load(fileName: "assets/.env");
  print('Loaded API_ID: ${dotenv.env['API_ID']}'); // 디버그 로그 추가
  print('Loaded API_BASE_URL: ${dotenv.env['API_BASE_URL']}'); // API_BASE_URL 디버그 로그 추가

  // 인터넷 연결 테스트
  try {
    final testResponse = await http.get(Uri.parse('https://google.com'));
    print('Google.com test status: ${testResponse.statusCode}');
  } catch (e) {
    print('Google.com test failed: $e');
  }

  // Hive 초기화
  await Hive.initFlutter();
  
  KakaoSdk.init(
    nativeAppKey: dotenv.env['KAKAO_NATIVE_APP_KEY'],
    javaScriptAppKey: dotenv.env['KAKAO_JAVASCRIPT_APP_KEY'],
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
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    // 스플래시 화면을 2초간 표시
    await Future.delayed(const Duration(seconds: 2));
    
    final isLoggedIn = await AuthService.isLoggedIn();
    setState(() {
      _isLoggedIn = isLoggedIn;
      _isLoading = false;
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
        fontFamily: 'Montserrat-Regular',
        scaffoldBackgroundColor: const Color(0xFF34699A),
      ),
      home: _isLoading
          ? const SplashScreen()
          : _isLoggedIn
              ? (_showManageStocks
                  ? ManageStocksPage(onBack: _goToMainPage)
                  : MainPage(onManageStocks: _goToManageStocks))
              : LoginPage(onLoginSuccess: _onLoginSuccess),
    );
  }
} 