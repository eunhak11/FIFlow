import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:kakao_flutter_sdk/kakao_flutter_sdk.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart'; // PlatformException을 위해 추가

class AuthService {
  static const _storage = FlutterSecureStorage();
  static const String _tokenKey = 'jwt_token';

  static String get _baseUrl {
    final apiBaseUrl = dotenv.env['API_BASE_URL'];
    if (apiBaseUrl == null || apiBaseUrl.isEmpty) {
      throw Exception('API_BASE_URL is not set in .env file');
    }
    return apiBaseUrl;
  }

  // JWT 토큰 저장
  static Future<void> saveToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  // JWT 토큰 가져오기
  static Future<String?> getToken() async {
    try {
      return await _storage.read(key: _tokenKey);
    } catch (e) {
      // Catch specific PlatformException for decryption errors
      if (e is PlatformException && e.message != null && e.message!.contains('BadPaddingException')) {
        print('Decryption error when reading token: $e. Deleting corrupted token.');
        await deleteToken(); // Delete the corrupted token
        return null; // Act as if no token was found
      }
      print('Error reading token from secure storage: $e');
      return null; // For other errors, treat as no token
    }
  }

  // JWT 토큰 삭제
  static Future<void> deleteToken() async {
    await _storage.delete(key: _tokenKey);
  }

  // 로그인 상태 확인
  static Future<bool> isLoggedIn() async {
    final token = await getToken();
    if (token == null) return false;

    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/auth/me'),
        headers: {'Authorization': 'Bearer $token'},
      );
      print('로그인 상태 확인 응답: ${response.statusCode}, ${response.body}'); // 디버깅 로그
      return response.statusCode == 200;
    } catch (e) {
      print('로그인 상태 확인 오류: $e');
      return false;
    }
  }

  // 사용자 정보 가져오기
  static Future<Map<String, dynamic>?> getUserInfo() async {
    final token = await getToken();
    if (token == null) return null;

    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/auth/me'),
        headers: {'Authorization': 'Bearer $token'},
      );
      print('사용자 정보 조회 응답: ${response.statusCode}, ${response.body}'); // 디버깅 로그
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      print('사용자 정보 조회 오류: $e');
    }
    return null;
  }

  // 인증 헤더 가져오기
  static Future<Map<String, String>> getAuthHeaders(BuildContext context) async {
    try {
      final user = await UserApi.instance.me();
      print('✅ 카카오 사용자 정보: ${user.id}');
      print('사용자 상세 정보: ${user.properties?['nickname']}');

      final response = await http.post(
        Uri.parse('$_baseUrl/auth/kakao/callback'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'kakaoId': user.id.toString(),
          'nickname': user.properties?['nickname'] ?? '사용자',
          'email': user.kakaoAccount?.email,
        }),
      );

      print('카카오 로그인 요청 응답: ${response.statusCode}, ${response.body}'); // 디버깅 로그
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final token = data['token'];
        await saveToken(token); // 토큰 저장
        return {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'};
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('카카오 로그인 실패: ${response.statusCode}, ${response.body}')),
        );
        throw Exception('카카오 로그인 실패: ${response.statusCode}, ${response.body}');
      }
    } catch (e) {
      print('로그인 오류: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('로그인 오류: $e')),
      );
      throw Exception('로그인 오류: $e');
    }
  }
}