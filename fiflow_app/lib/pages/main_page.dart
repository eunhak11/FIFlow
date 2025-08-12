// fiflow_app/lib/pages/main_page.dart
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:intl/intl.dart';
import '../services/auth_service.dart';
import '../services/favorite_service.dart';

class MainPage extends StatefulWidget {
  const MainPage({Key? key, required this.onManageStocks}) : super(key: key);

  final VoidCallback onManageStocks;

  @override
  State<MainPage> createState() => _MainPageState();
}

class _MainPageState extends State<MainPage> {
  List<Map<String, dynamic>> _stocksWithMarketData = [];
  List<Map<String, dynamic>> _indices = [];
  bool _isLoading = true;
  List<String> _favoriteStocks = [];
  bool _hasInitialDataLoaded = false;

  String get _apiBaseUrl {
    return dotenv.env['API_BASE_URL'] ?? '';
  }

  @override
  void initState() {
    super.initState();
    _loadFavorites();
    if (!_hasInitialDataLoaded) {
      _refreshData(forceCrawlerTrigger: true);
      _hasInitialDataLoaded = true;
    } else {
      _refreshData(forceCrawlerTrigger: false);
    }
  }

  Future<void> _loadFavorites() async {
    try {
      final favorites = await FavoriteService.getAllFavorites();
      setState(() {
        _favoriteStocks = favorites;
      });
    } catch (e) {
      print('즐겨찾기 로드 오류: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('즐겨찾기 로드 오류: $e')),
      );
    }
  }

  Future<void> _refreshData({bool forceCrawlerTrigger = false}) async {
  setState(() {
    _isLoading = true;
  });

  try {
    final headers = await AuthService.getAuthHeaders(context);

    if (forceCrawlerTrigger) {
      // 지수 크롤러 트리거
      for (int attempt = 1; attempt <= 3; attempt++) {
        try {
          final indexTriggerResponse = await http.post(
            Uri.parse('$_apiBaseUrl/trigger-index-crawler'),
            headers: headers,
          );
          if (indexTriggerResponse.statusCode == 200) {
            print('지수 크롤러 트리거 성공');
            break;
          } else {
            print('지수 크롤러 트리거 실패 (시도 $attempt/3): ${indexTriggerResponse.statusCode}, ${indexTriggerResponse.body}');
            if (attempt == 3) {
              print('지수 크롤러를 시작하지 못했습니다: 인증 실패');
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('지수 크롤러를 시작하지 못했습니다: 인증 실패')),
              );
            }
            await Future.delayed(const Duration(seconds: 1));
          }
        } catch (e) {
          if (attempt == 3) {
            print('지수 크롤러 트리거 오류: $e');
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('지수 크롤러 트리거 오류: $e')),
            );
          }
          await Future.delayed(const Duration(seconds: 1));
        }
      }

      
    }

    // 크롤러 완료 대기
    await Future.delayed(const Duration(seconds: 2));

    // 데이터 가져오기
    await Future.wait([
      _fetchStocksWithMarketData(),
      _fetchIndices(),
    ]);
  } catch (e) {
    print('데이터 새로고침 오류: $e');
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('데이터를 새로고침하지 못했습니다: 인증 오류 또는 서버 문제')),
    );
  } finally {
    setState(() {
      _isLoading = false;
    });
  }
}

  Future<void> _fetchStocksWithMarketData() async {
    try {
      final headers = await AuthService.getAuthHeaders(context);
      final response = await http.get(
        Uri.parse('$_apiBaseUrl/stocks/marketdata'),
        headers: headers,
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        setState(() {
          _stocksWithMarketData = data.cast<Map<String, dynamic>>();
        });
      } else {
        throw Exception('주식 데이터 가져오기 실패: ${response.statusCode}');
      }
    } catch (e) {
      print('주식 데이터 조회 오류: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('주식 데이터 조회 오류: $e')),
      );
    }
  }

  Future<void> _fetchIndices() async {
  try {
    print('Fetching indices from: $_apiBaseUrl/indices');
    final headers = await AuthService.getAuthHeaders(context);
    final response = await http.get(
      Uri.parse('$_apiBaseUrl/indices'),
      headers: headers,
    );
    print('지수 데이터 응답: 상태 코드=${response.statusCode}, 본문=${response.body}');
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      if (data.isEmpty) {
        print('경고: 지수 데이터가 비어 있습니다. DynamoDB 데이터 또는 API 응답을 확인하세요.');
      } else {
        print('지수 데이터: $data');
      }
      setState(() {
        _indices = data.cast<Map<String, dynamic>>().map((idx) {
          final double change = double.tryParse(idx['change']?.toString() ?? '0.0') ?? 0.0;
          final double value = double.tryParse(idx['value']?.toString() ?? '0.0') ?? 0.0;
          final double changeRate = double.tryParse(idx['changeRate']?.toString() ?? '0.0') ?? 0.0;
          return {
            ...idx,
            'value': value,
            'change': change,
            'changeRate': changeRate,
            'isUp': change > 0,
          };
        }).toList();
      });
    } else {
      throw Exception('지수 데이터를 가져오지 못했습니다: 상태 코드 ${response.statusCode}, 응답: ${response.body}');
    }
  } catch (e) {
    print('지수 데이터 조회 오류: $e');
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('지수 데이터를 불러오지 못했습니다: 서버 연결 문제 또는 데이터 없음')),
    );
  }
}

  String _getCurrentDate() {
    final now = DateTime.now();
    return '${now.year}.${now.month.toString().padLeft(2, '0')}.${now.day.toString().padLeft(2, '0')}';
  }

  String _formatNumber(String value) {
    try {
      final number = double.parse(value);
      final formatter = NumberFormat('#,###.##');
      return formatter.format(number);
    } catch (e) {
      return value;
    }
  }

  String _formatDate(String? dateString) {
    if (dateString == null || dateString.isEmpty) return '-';
    try {
      final date = DateTime.parse(dateString);
      final year = date.year.toString().substring(2);
      final month = date.month.toString().padLeft(2, '0');
      final day = date.day.toString().padLeft(2, '0');
      return '$year.$month.$day';
    } catch (e) {
      return dateString;
    }
  }

  Future<void> _toggleFavorite(String symbol) async {
    try {
      await FavoriteService.toggleFavorite(symbol);
      await _loadFavorites();
      print('즐겨찾기 토글: $symbol (현재 즐겨찾기: ${_favoriteStocks.length}개)');
    } catch (e) {
      print('즐겨찾기 토글 오류: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('즐겨찾기 토글 오류: $e')),
      );
    }
  }

  List<Map<String, dynamic>> _getFavoriteStocks() {
    return _stocksWithMarketData.where((stock) => 
      _favoriteStocks.contains(stock['symbol'])
    ).toList();
  }

  List<Map<String, dynamic>> _getNonFavoriteStocks() {
    return _stocksWithMarketData.where((stock) => 
      !_favoriteStocks.contains(stock['symbol'])
    ).toList();
  }

  Widget _buildIndicesSection(List<Map<String, dynamic>> indices) {
    if (_isLoading) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.green[50],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.green[200]!),
        ),
        child: Row(
          children: const [
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.green),
              ),
            ),
            SizedBox(width: 12),
            Text(
              '지수 데이터 업데이트 중...',
              style: TextStyle(
                fontFamily: 'Montserrat-SemiBold',
                fontSize: 14,
                color: Colors.green,
              ),
            ),
          ],
        ),
      );
    }

    if (indices.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey[100],
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Row(
          children: [
            Icon(Icons.info_outline, color: Colors.grey, size: 20),
            SizedBox(width: 8),
            Text(
              '지수 데이터를 불러오는 중...',
              style: TextStyle(
                fontFamily: 'Montserrat-Regular',
                fontSize: 14,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      );
    }

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: indices.map((idx) {
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  idx['name'] as String,
                  style: const TextStyle(
                    fontFamily: 'Montserrat-Regular',
                    fontSize: 20,
                    color: Colors.black,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _formatNumber(idx['value'].toString()),
                  style: const TextStyle(
                    fontFamily: 'Montserrat-SemiBold',
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${_formatNumber(idx['change'].toString())} (${_formatNumber(idx['changeRate'].toString())}%)',
                  style: TextStyle(
                    fontFamily: 'Montserrat-Regular',
                    fontSize: 16,
                    color: (idx['change'] as num) > 0 ? Colors.red : Colors.blue,
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildStockListSection() {
    if (_isLoading) {
      return const Center(
        child: Column(
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 12),
            Text(
              '데이터를 불러오는 중...',
              style: TextStyle(
                fontFamily: 'Montserrat-Regular',
                fontSize: 16,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      );
    }

    if (_stocksWithMarketData.isEmpty) {
      return const Center(
        child: Text(
          '등록된 주식이 없습니다.',
          style: TextStyle(
            fontFamily: 'Montserrat-Regular',
            fontSize: 16,
            color: Colors.grey,
          ),
        ),
      );
    }

    final favoriteStocks = _getFavoriteStocks();
    final nonFavoriteStocks = _getNonFavoriteStocks();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (favoriteStocks.isNotEmpty) ...[
          const SizedBox(height: 8),
          ...favoriteStocks.map((stock) => _StockListItem(
            stock: stock,
            favoriteStocks: _favoriteStocks,
            onToggleFavorite: _toggleFavorite,
          )).toList(),
          const SizedBox(height: 24),
        ],
        if (nonFavoriteStocks.isNotEmpty) ...[
          const SizedBox(height: 8),
          ...nonFavoriteStocks.map((stock) => _StockListItem(
            stock: stock,
            favoriteStocks: _favoriteStocks,
            onToggleFavorite: _toggleFavorite,
          )).toList(),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final List<Map<String, dynamic>> indices = _indices.isNotEmpty ? _indices : [];

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.only(left: 32.0, right: 32.0, top: 64.0, bottom: 16.0),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Stocks',
                            style: TextStyle(
                              fontFamily: 'Montserrat-SemiBold',
                              fontSize: 48,
                              fontWeight: FontWeight.w600,
                              letterSpacing: -2,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            _getCurrentDate(),
                            style: TextStyle(
                              fontFamily: 'Montserrat-Regular',
                              fontSize: 30,
                              color: Colors.grey[700],
                            ),
                          ),
                        ],
                      ),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        ElevatedButton(
                          onPressed: widget.onManageStocks,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFE8F5E8),
                            foregroundColor: Colors.black,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(4),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          ),
                          child: const Text(
                            'Manage',
                            style: TextStyle(
                              fontFamily: 'Montserrat-SemiBold',
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.black,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        ElevatedButton(
                          onPressed: () => _refreshData(forceCrawlerTrigger: true),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFE8F5E8),
                            foregroundColor: Colors.black,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(4),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          ),
                          child: const Text(
                            'Refresh',
                            style: TextStyle(
                              fontFamily: 'Montserrat-SemiBold',
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.black,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                _buildIndicesSection(indices),
                const SizedBox(height: 16),
                Container(
                  height: 1,
                  color: Colors.grey[300],
                ),
                const SizedBox(height: 16),
                const Text(
                  'domestic',
                  style: TextStyle(
                    fontFamily: 'Montserrat-Regular',
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                _buildStockListSection(),
                const SizedBox(height: 24),
                const Text(
                  'foreign',
                  style: TextStyle(
                    fontFamily: 'Montserrat-Regular',
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'not registered',
                  style: TextStyle(
                    fontFamily: 'Montserrat-Regular',
                    fontSize: 14,
                    color: Colors.grey,
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

class _StockListItem extends StatelessWidget {
  final Map<String, dynamic> stock;
  final List<String> favoriteStocks;
  final Function(String) onToggleFavorite;
  
  const _StockListItem({
    required this.stock,
    required this.favoriteStocks,
    required this.onToggleFavorite,
  });

  String _formatDate(String? dateString) {
    if (dateString == null || dateString.isEmpty) return '-';
    try {
      final date = DateTime.parse(dateString);
      final year = date.year.toString().substring(2);
      final month = date.month.toString().padLeft(2, '0');
      final day = date.day.toString().padLeft(2, '0');
      return '$year.$month.$day';
    } catch (e) {
      return dateString;
    }
  }

  @override
  Widget build(BuildContext context) {
    final marketData = stock['marketData'];
    final hasMarketData = marketData != null;
    
    String priceText = '데이터 없음';
    String changeText = '';
    Color? changeColor;
    
    if (hasMarketData) {
      final price = marketData['price'];
      final change = marketData['change'];
      final changeRate = marketData['changeRate'];
      
      if (price != null) {
        final formatter = NumberFormat('#,###');
        priceText = '${formatter.format(price)}원';
      }
      
      if (change != null && changeRate != null) {
        final formatter = NumberFormat('#,###');
        final changeValue = change > 0 ? '+${formatter.format(change)}' : formatter.format(change);
        final rateValue = changeRate > 0 ? '+$changeRate' : changeRate.toString();
        changeText = '$changeValue ($rateValue%)';
        changeColor = change > 0 ? Colors.red : change < 0 ? Colors.blue : Colors.grey;
      }
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12.0),
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey[300]!, width: 1.2),
          borderRadius: BorderRadius.circular(12),
        ),
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 2.0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          stock['name'] ?? '알 수 없음',
                          style: const TextStyle(
                            fontFamily: 'Montserrat-SemiBold',
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (stock['symbol'] != null)
                          Text(
                            stock['symbol'],
                            style: const TextStyle(
                              fontFamily: 'Montserrat-Regular',
                              fontSize: 14,
                              color: Colors.grey,
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Row(
                    children: [
                      Container(
                        constraints: const BoxConstraints(minHeight: 64),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              priceText,
                              style: const TextStyle(
                                fontFamily: 'Montserrat-SemiBold',
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              changeText,
                              style: TextStyle(
                                fontFamily: 'Montserrat-Regular',
                                fontSize: 18,
                                color: changeColor ?? Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: () {
                          onToggleFavorite(stock['symbol']);
                        },
                        child: Icon(
                          Icons.star,
                          size: 24,
                          color: favoriteStocks.contains(stock['symbol']) 
                            ? Colors.yellow 
                            : Colors.grey[400],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (hasMarketData && marketData['foreignerNetBuy'] != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 2.0),
                child: Column(
                  children: [
                    Row(
                      children: List.generate(4, (i) {
                        final netBuy = marketData['foreignerNetBuy'][i];
                        final date = marketData['foreignerNetBuyDate'][i];
                        return Expanded(
                          child: SizedBox(
                            height: 56,
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                Text(
                                  _formatDate(date),
                                  textAlign: TextAlign.center,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontFamily: 'Montserrat-Regular',
                                    fontSize: 14,
                                    color: Colors.grey,
                                  ),
                                ),
                                Text(
                                  netBuy != null 
                                    ? (netBuy > 0 ? '+${NumberFormat('#,###').format(netBuy)}' : NumberFormat('#,###').format(netBuy))
                                    : '-',
                                  textAlign: TextAlign.center,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontFamily: 'Montserrat-SemiBold',
                                    fontSize: 17,
                                    color: netBuy != null 
                                      ? (netBuy > 0 ? Colors.red : Colors.blue)
                                      : Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: List.generate(4, (i) {
                        final netBuy = marketData['foreignerNetBuy'][i + 4];
                        final date = marketData['foreignerNetBuyDate'][i + 4];
                        return Expanded(
                          child: SizedBox(
                            height: 56,
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                Text(
                                  _formatDate(date),
                                  textAlign: TextAlign.center,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontFamily: 'Montserrat-Regular',
                                    fontSize: 14,
                                    color: Colors.grey,
                                  ),
                                ),
                                Text(
                                  netBuy != null 
                                    ? (netBuy > 0 ? '+${NumberFormat('#,###').format(netBuy)}' : NumberFormat('#,###').format(netBuy))
                                    : '-',
                                  textAlign: TextAlign.center,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontFamily: 'Montserrat-SemiBold',
                                    fontSize: 17,
                                    color: netBuy != null 
                                      ? (netBuy > 0 ? Colors.red : Colors.blue)
                                      : Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}