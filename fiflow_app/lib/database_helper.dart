import 'package:sqflite/sqflite.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:path/path.dart';
import 'dart:async';
import 'dart:io';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'dart:html' as html;

class DatabaseHelper {
  static Database? _database;
  
  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }
  
  Future<Database> _initDatabase() async {
    // 웹 환경에서는 SharedPreferences 사용
    if (kIsWeb) {
      throw UnsupportedError('웹 환경에서는 SQLite 대신 SharedPreferences를 사용합니다.');
    }
    
    // 데스크톱/모바일 환경
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
    
    String path = join(await getDatabasesPath(), 'favorites.db');
    return await openDatabase(
      path,
      version: 1,
      onCreate: (Database db, int version) async {
        await db.execute('''
          CREATE TABLE favorites(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT UNIQUE,
            createdAt TEXT
          )
        ''');
        print('즐겨찾기 데이터베이스 생성 완료');
      },
    );
  }
  
  // 즐겨찾기 추가
  Future<void> addFavorite(String symbol) async {
    if (kIsWeb) {
      await _addFavoriteWeb(symbol);
    } else {
      await _addFavoriteNative(symbol);
    }
  }
  
  // 웹용 즐겨찾기 추가
  Future<void> _addFavoriteWeb(String symbol) async {
    try {
      // 웹에서는 localStorage 직접 사용
      final favorites = _getFavoritesFromLocalStorage();
      if (!favorites.contains(symbol)) {
        favorites.add(symbol);
        _saveFavoritesToLocalStorage(favorites);
        print('즐겨찾기 추가 (웹): $symbol');
      }
    } catch (e) {
      print('즐겨찾기 추가 오류 (웹): $e');
      rethrow;
    }
  }
  
  // 네이티브용 즐겨찾기 추가
  Future<void> _addFavoriteNative(String symbol) async {
    try {
      final db = await database;
      await db.insert('favorites', {
        'symbol': symbol,
        'createdAt': DateTime.now().toIso8601String(),
      });
      print('즐겨찾기 추가 (네이티브): $symbol');
    } catch (e) {
      print('즐겨찾기 추가 오류 (네이티브): $e');
      rethrow;
    }
  }
  
  // 즐겨찾기 제거
  Future<void> removeFavorite(String symbol) async {
    if (kIsWeb) {
      await _removeFavoriteWeb(symbol);
    } else {
      await _removeFavoriteNative(symbol);
    }
  }
  
  // 웹용 즐겨찾기 제거
  Future<void> _removeFavoriteWeb(String symbol) async {
    try {
      // 웹에서는 localStorage 직접 사용
      final favorites = _getFavoritesFromLocalStorage();
      favorites.remove(symbol);
      _saveFavoritesToLocalStorage(favorites);
      print('즐겨찾기 제거 (웹): $symbol');
    } catch (e) {
      print('즐겨찾기 제거 오류 (웹): $e');
      rethrow;
    }
  }
  
  // 네이티브용 즐겨찾기 제거
  Future<void> _removeFavoriteNative(String symbol) async {
    try {
      final db = await database;
      await db.delete('favorites', where: 'symbol = ?', whereArgs: [symbol]);
      print('즐겨찾기 제거 (네이티브): $symbol');
    } catch (e) {
      print('즐겨찾기 제거 오류 (네이티브): $e');
      rethrow;
    }
  }
  
  // 즐겨찾기 목록 조회
  Future<List<String>> getFavorites() async {
    if (kIsWeb) {
      return await _getFavoritesWeb();
    } else {
      return await _getFavoritesNative();
    }
  }
  
  // 웹용 즐겨찾기 조회
  Future<List<String>> _getFavoritesWeb() async {
    try {
      // 웹에서는 localStorage 직접 사용
      final favorites = _getFavoritesFromLocalStorage();
      print('즐겨찾기 조회 (웹): ${favorites.length}개');
      return favorites;
    } catch (e) {
      print('즐겨찾기 조회 오류 (웹): $e');
      return [];
    }
  }
  
  // 네이티브용 즐겨찾기 조회
  Future<List<String>> _getFavoritesNative() async {
    try {
      final db = await database;
      final List<Map<String, dynamic>> maps = await db.query('favorites');
      final favorites = List.generate(maps.length, (i) => maps[i]['symbol'] as String);
      print('즐겨찾기 조회 (네이티브): ${favorites.length}개');
      return favorites;
    } catch (e) {
      print('즐겨찾기 조회 오류 (네이티브): $e');
      return [];
    }
  }
  
  // 즐겨찾기 여부 확인
  Future<bool> isFavorite(String symbol) async {
    if (kIsWeb) {
      return await _isFavoriteWeb(symbol);
    } else {
      return await _isFavoriteNative(symbol);
    }
  }
  
  // 웹용 즐겨찾기 확인
  Future<bool> _isFavoriteWeb(String symbol) async {
    try {
      // 웹에서는 localStorage 직접 사용
      final favorites = _getFavoritesFromLocalStorage();
      return favorites.contains(symbol);
    } catch (e) {
      print('즐겨찾기 확인 오류 (웹): $e');
      return false;
    }
  }
  
  // 네이티브용 즐겨찾기 확인
  Future<bool> _isFavoriteNative(String symbol) async {
    try {
      final db = await database;
      final List<Map<String, dynamic>> maps = await db.query(
        'favorites',
        where: 'symbol = ?',
        whereArgs: [symbol],
      );
      return maps.isNotEmpty;
    } catch (e) {
      print('즐겨찾기 확인 오류 (네이티브): $e');
      return false;
    }
  }
  
  // 웹용 localStorage 헬퍼 함수들
  List<String> _getFavoritesFromLocalStorage() {
    if (kIsWeb) {
      try {
        final storage = html.window.localStorage;
        final favoritesJson = storage['favorites'] ?? '[]';
        final List<dynamic> favoritesList = jsonDecode(favoritesJson);
        return favoritesList.cast<String>();
      } catch (e) {
        print('localStorage 읽기 오류: $e');
        return [];
      }
    }
    return [];
  }
  
  void _saveFavoritesToLocalStorage(List<String> favorites) {
    if (kIsWeb) {
      try {
        final storage = html.window.localStorage;
        final favoritesJson = jsonEncode(favorites);
        storage['favorites'] = favoritesJson;
        print('localStorage에 저장: ${favorites.length}개');
      } catch (e) {
        print('localStorage 저장 오류: $e');
      }
    }
  }
  
  // 데이터베이스 닫기
  Future<void> closeDatabase() async {
    if (_database != null) {
      await _database!.close();
      _database = null;
    }
  }
} 