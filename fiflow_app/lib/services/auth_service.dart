import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class AuthService {
  static const _storage = FlutterSecureStorage();
  static const String _tokenKey = 'jwt_token';
  static const String _baseUrl = 'http://172.30.1.14:3000';

  // JWT 토큰 저장
  static Future<void> saveToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  // JWT 토큰 가져오기
  static Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
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
        headers: {'Authorization': 'Bearer $token'}
      );
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
        headers: {'Authorization': 'Bearer $token'}
      );
      
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      print('사용자 정보 조회 오류: $e');
    }
    return null;
  }

  // 인증 헤더 가져오기
  static Future<Map<String, String>> getAuthHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }
} 