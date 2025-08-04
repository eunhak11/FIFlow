import 'package:flutter/material.dart';
import 'package:kakao_flutter_sdk/kakao_flutter_sdk.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../services/auth_service.dart';

class LoginPage extends StatefulWidget {
  final VoidCallback onLoginSuccess;

  const LoginPage({super.key, required this.onLoginSuccess});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  bool _isLoading = false;

  Future<void> _handleKakaoLogin() async {
    setState(() {
      _isLoading = true;
    });

    try {
      print('=== 카카오 로그인 시작 ===');
      print('카카오 SDK 초기화 상태 확인...');
      
      // 카카오 로그인 시도
      print('UserApi.instance.loginWithKakaoAccount() 호출...');
      await UserApi.instance.loginWithKakaoAccount();
      print('✅ 카카오 로그인 성공 - 앱으로 돌아옴');
      
      print('UserApi.instance.me() 호출...');
      User user = await UserApi.instance.me();
      print('✅ 카카오 사용자 정보: ${user.id}');
      print('사용자 상세 정보: ${user.kakaoAccount?.profile?.nickname}');
      
      // 백엔드 API 호출
      final response = await http.post(
        Uri.parse('http://172.30.1.14:3000/auth/kakao/callback'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'kakaoId': user.id.toString(),
          'nickname': user.kakaoAccount?.profile?.nickname,
          'email': user.kakaoAccount?.email,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['token'] != null) {
          // JWT 토큰 저장
          await AuthService.saveToken(data['token']);
          print('JWT 토큰 저장 완료: ${data['token']}');
        }
        widget.onLoginSuccess();
      } else {
        throw Exception('서버 응답 오류: ${response.statusCode}');
      }
    } catch (error) {
      print('로그인 오류: $error');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('로그인에 실패했습니다: $error'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'FIFlow',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: Colors.blue,
              ),
            ),
            const SizedBox(height: 50),
            if (_isLoading)
              const CircularProgressIndicator()
            else
              ElevatedButton(
                onPressed: _handleKakaoLogin,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFEE500),
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 15),
                ),
                child: const Text(
                  '카카오로 로그인',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
          ],
        ),
      ),
    );
  }
} 