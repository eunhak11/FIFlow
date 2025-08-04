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
      backgroundColor: const Color(0xFF34699A),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                                 // ic_launcher 이미지
                 Container(
                   width: 120,
                   height: 120,
                   child: Image.asset(
                     'assets/ic_launcher.png',
                     width: 120,
                     height: 120,
                     fit: BoxFit.cover,
                   ),
                 ),
                 const SizedBox(height: 80),
                 
                 // 로그인 버튼
                if (_isLoading)
                  const CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF4CAF50)),
                  )
                else
                  GestureDetector(
                    onTap: _handleKakaoLogin,
                    child: Container(
                      width: 70,
                      height: 70,
                                decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            color: Colors.transparent,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.3),
                blurRadius: 10,
                spreadRadius: 1,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.asset(
              'assets/images/kakao_login.png',
              width: 54,
              height: 54,
              fit: BoxFit.cover,
            ),
          ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // 로그인 안내 텍스트
                  const Text(
                    '카카오로 로그인하세요.',
                    style: TextStyle(
                      fontFamily: 'Montserrat-Regular',
                      fontSize: 14,
                      color: Colors.white,
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
} 