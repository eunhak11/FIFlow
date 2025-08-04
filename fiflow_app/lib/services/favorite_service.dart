import 'package:hive_flutter/hive_flutter.dart';

class FavoriteService {
  static const String _boxName = 'favorites';
  static Box<String>? _box;

  // Hive 박스 초기화
  static Future<void> init() async {
    if (_box == null) {
      _box = await Hive.openBox<String>(_boxName);
    }
  }

  // 즐겨찾기 추가
  static Future<void> addFavorite(String stockSymbol) async {
    await init();
    await _box!.put(stockSymbol, stockSymbol);
  }

  // 즐겨찾기 제거
  static Future<void> removeFavorite(String stockSymbol) async {
    await init();
    await _box!.delete(stockSymbol);
  }

  // 즐겨찾기 상태 확인
  static Future<bool> isFavorite(String stockSymbol) async {
    await init();
    return _box!.containsKey(stockSymbol);
  }

  // 모든 즐겨찾기 목록 가져오기
  static Future<List<String>> getAllFavorites() async {
    await init();
    return _box!.values.toList();
  }

  // 즐겨찾기 토글
  static Future<void> toggleFavorite(String stockSymbol) async {
    await init();
    if (await isFavorite(stockSymbol)) {
      await removeFavorite(stockSymbol);
    } else {
      await addFavorite(stockSymbol);
    }
  }

  // 즐겨찾기 개수 가져오기
  static Future<int> getFavoriteCount() async {
    await init();
    return _box!.length;
  }

  // 모든 즐겨찾기 삭제
  static Future<void> clearAllFavorites() async {
    await init();
    await _box!.clear();
  }
} 